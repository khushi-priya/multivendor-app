


import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Card, Spinner } from '../../components/ui.jsx';

const label = (value = '') =>
  String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const money = (value) => Number(value || 0).toFixed(2);

const statusColors = {
  pending_payment: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-indigo-50 text-indigo-700',
  dispatched: 'bg-purple-50 text-purple-700',
  out_for_delivery: 'bg-orange-50 text-orange-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
  returned: 'bg-pink-50 text-pink-700',
};

const returnStatusLabels = {
  requested: 'Return Requested',
  approved: 'Return Approved',
  rejected: 'Return Rejected',
  received: 'Return Received',
  item_received: 'Return Received',
  refund_processing: 'Refund Processing',
  refunded: 'Refunded',
};

const returnEvents = [
  { key: 'createdAt', title: 'Return requested' },
  { key: 'approvedAt', title: 'Return approved' },
  { key: 'receivedAt', title: 'Product received' },
  { key: 'refundProcessingAt', title: 'Refund processing started' },
  { key: 'refundedAt', title: 'Refund completed' },
];

const orderSteps = [
  'confirmed',
  'processing',
  'dispatched',
  'out_for_delivery',
  'delivered',
];

// Get product image from the order response.
function getOrderItemImage(item) {
  const product = item.product || {};

  const firstImage = Array.isArray(product.images)
    ? product.images[0]
    : null;

  const image =
    item.productImageUrl ||
    item.imageUrl ||
    item.productImage ||
    (typeof firstImage === 'string'
      ? firstImage
      : firstImage?.imageUrl ||
        firstImage?.url ||
        firstImage?.src) ||
    product.imageUrl ||
    product.image ||
    product.thumbnail ||
    null;

  return typeof image === 'string' && image.trim()
    ? image.trim()
    : null;
}

// Product image with a fallback for missing or broken images.
function ProductImage({ src, alt }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (!src || imageFailed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
        <span className="text-3xl">📦</span>
        <span className="mt-1 text-[10px]">No image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImageFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

function OrderTimeline({ order }) {
  const history = [...(order.statusHistory || [])].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  const cancelled = order.status === 'cancelled';
  const returned = order.status === 'returned';
  const currentStatus = order.status;

  if (cancelled || returned) {
    return (
      <div className="space-y-3">
        <div
          className={`rounded-xl p-4 ${
            cancelled ? 'bg-rose-50' : 'bg-pink-50'
          }`}
        >
          <p
            className={`font-bold ${
              cancelled ? 'text-rose-700' : 'text-pink-700'
            }`}
          >
            {label(currentStatus)}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {cancelled
              ? 'This order has been cancelled.'
              : 'This order has been marked as returned.'}
          </p>
        </div>

        {history.map((entry) => (
          <div key={entry.id} className="border-l-2 border-slate-200 pl-4">
            <p className="text-sm font-semibold text-slate-800">
              {label(entry.newStatus)}
            </p>

            <p className="text-xs text-slate-500">
              {formatDate(entry.createdAt)}
            </p>

            {entry.notes && (
              <p className="mt-1 text-xs text-slate-600">
                {entry.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  const currentIndex = orderSteps.indexOf(currentStatus);

  return (
    <div className="space-y-5">
      {orderSteps.map((step, index) => {
        const matchingEntry = history
          .filter((entry) => entry.newStatus === step)
          .at(-1);

        const completed =
          matchingEntry != null ||
          (currentIndex >= 0 && index <= currentIndex);

        const isCurrent = step === currentStatus;

        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  completed
                    ? 'bg-pink-600 text-white'
                    : 'border-2 border-slate-200 bg-white text-slate-400'
                }`}
              >
                {completed ? '✓' : index + 1}
              </div>

              {index !== orderSteps.length - 1 && (
                <div
                  className={`my-1 min-h-7 w-0.5 flex-1 ${
                    completed && index < currentIndex
                      ? 'bg-pink-400'
                      : 'bg-slate-200'
                  }`}
                />
              )}
            </div>

            <div className="pb-4">
              <p
                className={`text-sm font-semibold ${
                  isCurrent
                    ? 'text-pink-700'
                    : completed
                      ? 'text-slate-800'
                      : 'text-slate-400'
                }`}
              >
                {label(step)}

                {isCurrent && (
                  <span className="ml-2 rounded-full bg-pink-50 px-2 py-0.5 text-[10px] text-pink-700">
                    Current
                  </span>
                )}
              </p>

              {matchingEntry && (
                <>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(matchingEntry.createdAt)}
                  </p>

                  {matchingEntry.notes && (
                    <p className="mt-1 text-xs text-slate-600">
                      {matchingEntry.notes}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {history
        .filter((entry) => !orderSteps.includes(entry.newStatus))
        .map((entry) => (
          <div key={entry.id} className="border-l-2 border-slate-200 pl-4">
            <p className="text-sm font-semibold text-slate-800">
              {label(entry.newStatus)}
            </p>

            <p className="text-xs text-slate-500">
              {formatDate(entry.createdAt)}
            </p>

            {entry.notes && (
              <p className="mt-1 text-xs text-slate-600">
                {entry.notes}
              </p>
            )}
          </div>
        ))}
    </div>
  );
}

function ReturnProgress({ item }) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">
          {returnStatusLabels[item.status] || label(item.status)}
        </h3>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            item.status === 'rejected'
              ? 'bg-rose-50 text-rose-700'
              : item.status === 'refunded'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-pink-50 text-pink-700'
          }`}
        >
          {label(item.status)}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Reason: {item.reason || '—'}
      </p>

      <div className="mt-4 space-y-3">
        {returnEvents.map((event) => {
          const date = item[event.key];

          if (!date) return null;

          return (
            <div key={event.key} className="flex gap-3">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-pink-500" />

              <div>
                <p className="text-sm font-medium text-slate-800">
                  {event.title}
                </p>

                <p className="text-xs text-slate-500">
                  {formatDate(date)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {item.rejectedAt && item.rejectionReason && (
        <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          <b>Rejection reason:</b> {item.rejectionReason}
        </div>
      )}

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="text-xs text-slate-500">Refund Amount</p>

        <p className="mt-1 text-lg font-bold text-slate-900">
          ₹{money(item.refundAmount)}
        </p>

        {item.refundReference && (
          <p className="mt-1 break-all text-xs text-slate-500">
            Reference: {item.refundReference}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CustomerOrderDetail() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.get(`/customer/orders/${id}`);
      setOrder(data.order);
    } catch (err) {
      setError(err.message || 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const reorder = async () => {
    setBusy(true);
    setError('');
    setPaymentError('');
    setMessage('');

    try {
      const data = await api.post(`/customer/orders/${id}/reorder`);

      window.dispatchEvent(new Event('customer:cart-updated'));

      const count = data.added?.length || 0;

      setMessage(
        `${count} item${count === 1 ? '' : 's'} added to your cart.${
          data.unavailable?.length
            ? ` Unavailable: ${data.unavailable.join(', ')}.`
            : ''
        }`
      );
    } catch (err) {
      setError(err.message || 'Unable to reorder.');
    } finally {
      setBusy(false);
    }
  };

  const retryPayment = async () => {
    if (busy || !order) return;

    setBusy(true);
    setPaymentError('');

    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');

          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error('Razorpay checkout could not be loaded.'));

          document.body.appendChild(script);
        });
      }

      const data = await api.post('/customer/payments/razorpay/retry', {
        orderId: order.id,
      });

      const checkout = new window.Razorpay({
        key: data.razorpay.key,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: 'Market',
        description: `Order ${order.orderNumber}`,
        order_id: data.razorpay.orderId,

        handler: async (response) => {
          try {
            await api.post('/customer/payments/razorpay/verify', {
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            setMessage('Payment verified successfully.');
            await load();
          } catch (err) {
            setPaymentError(
              err.message || 'Payment verification failed.'
            );
          } finally {
            setBusy(false);
          }
        },

        modal: {
          ondismiss: () => setBusy(false),
        },
      });

      checkout.on('payment.failed', async (response) => {
        const reason =
          response.error?.description || 'Gateway reported payment failure';

        try {
          await api.post('/customer/payments/razorpay/failure', {
            orderId: order.id,
            reason,
          });
        } catch (err) {
          setPaymentError(err.message || 'Unable to record payment failure.');
        }

        setBusy(false);
      });

      checkout.open();
    } catch (err) {
      setPaymentError(err.message || 'Unable to start payment.');
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  if (!order) {
    return (
      <div className="space-y-4">
        <Link
          to="/customer/orders"
          className="text-sm font-semibold text-pink-700"
        >
          ← My Orders
        </Link>

        <Alert type="danger" message={error || 'Order not found.'} />
      </div>
    );
  }

  const address = order.shippingAddress || {};
  const payments = order.payments || [];
  const returns = order.returns || [];
  const items = order.items || [];
  const status = order.status || 'unknown';

  const canRetryPayment =
    order.paymentMethod === 'razorpay' &&
    status === 'pending_payment' &&
    order.paymentStatus !== 'paid';

  return (
    <div className="min-h-screen space-y-5 bg-slate-50/70 px-1 py-3 sm:px-3">
      {/* Navigation */}
      <Link
        to="/customer/orders"
        className="inline-flex items-center text-sm font-semibold text-pink-700 hover:text-pink-800"
      >
        ← Back to My Orders
      </Link>

      {/* Success message only below navigation */}
      {message && (
        <Alert type="success" message={message} />
      )}

      {/* Order Summary */}
      <Card className="overflow-hidden border border-slate-200 bg-white p-0 shadow-sm">
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Order Details
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Order #{order.orderNumber || order.id}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Placed on {formatDate(order.createdAt)}
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              Store: {order.shop?.name || 'Local Store'}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <span
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                statusColors[status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {label(status)}
            </span>

            <button
              type="button"
              disabled={busy}
              onClick={reorder}
              className="rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
            >
              {busy ? 'Please wait...' : '↻ Reorder Items'}
            </button>
          </div>
        </div>

        {/* Reorder error is displayed here, not under navigation */}
        {error && (
          <div className="px-5 pb-4">
            <Alert type="danger" message={error} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Order Total</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              ₹{money(order.totalAmount)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Payment Method</p>
            <p className="mt-1 font-semibold text-slate-800">
              {label(order.paymentMethod || '—')}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Payment Status</p>
            <p
              className={`mt-1 font-semibold ${
                order.paymentStatus === 'paid'
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {order.paymentMethod === 'cod' &&
              order.paymentStatus === 'pending'
                ? 'Due on delivery'
                : label(order.paymentStatus || '—')}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* Products */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Ordered Items
              </h2>

              <span className="text-xs text-slate-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const image = getOrderItemImage(item);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-4 first:pt-2 sm:gap-4"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-28 sm:w-28">
                      <ProductImage
                        src={image}
                        alt={item.productName || 'Ordered product'}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold text-slate-900">
                        {item.productName || 'Product'}
                      </h3>

                      {item.variantName && (
                        <p className="mt-1 text-xs text-slate-500">
                          Variant: {item.variantName}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-500">
                        Quantity: {item.quantity}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        ₹{money(item.unitPrice)} each
                        {item.weightKg != null ? ` · ${money(item.weightKg)} kg` : ''}
                      </p>
                      {item.taxSnapshot?.gstApplicable && (
                        <p className="mt-1 text-xs text-slate-500">
                          GST {Number(item.taxSnapshot.gstRate).toFixed(2)}% · taxable ₹{money(item.taxableValue)} · tax ₹{money(item.taxAmount)}
                        </p>
                      )}
                    </div>

                    <p className="shrink-0 text-sm font-bold text-slate-900">
                      ₹{money(item.totalPrice)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 space-y-2 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{order.taxBreakdown ? 'Taxable value' : 'Items Total'}</span>
                <span>
                  ₹{money(order.subtotal ?? order.totalAmount)}
                </span>
              </div>

              {order.deliveryFee != null && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>
                    Shipping
                    {order.shippingSnapshot?.zoneName
                      ? ` · ${order.shippingSnapshot.zoneName}, ${money(order.shippingSnapshot.weightKg)} kg`
                      : ''}
                  </span>
                  <span>₹{money(order.deliveryFee)}</span>
                </div>
              )}

              {order.taxAmount != null && (
                <>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Tax</span>
                    <span>₹{money(order.taxAmount)}</span>
                  </div>
                  {order.taxBreakdown?.items?.some((item) => Number(item.components?.cgst || 0) > 0) && (
                    <>
                      <div className="flex justify-between pl-3 text-xs text-slate-500">
                        <span>CGST</span>
                        <span>₹{money(order.taxBreakdown.items.reduce((sum, item) => sum + Number(item.components?.cgst || 0), 0))}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-xs text-slate-500">
                        <span>SGST</span>
                        <span>₹{money(order.taxBreakdown.items.reduce((sum, item) => sum + Number(item.components?.sgst || 0), 0))}</span>
                      </div>
                    </>
                  )}
                  {order.taxBreakdown?.items?.some((item) => Number(item.components?.igst || 0) > 0) && (
                    <div className="flex justify-between pl-3 text-xs text-slate-500">
                      <span>IGST</span>
                      <span>₹{money(order.taxBreakdown.items.reduce((sum, item) => sum + Number(item.components?.igst || 0), 0))}</span>
                    </div>
                  )}
                </>
              )}

              {Number(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-sm font-medium text-emerald-700">
                  <span>
                    Coupon discount{order.couponCode ? ` · ${order.couponCode}` : ''}
                  </span>
                  <span>−₹{money(order.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
                <span>Order Total</span>
                <span>₹{money(order.totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Order Tracking */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="mb-5">
              <h2 className="text-base font-bold text-slate-900">
                Order Tracking
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Updates recorded for your order.
              </p>
            </div>

            <OrderTimeline order={order} />

            {order.delivery && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Delivery Status
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {label(order.delivery.status)}
                </p>
              </div>
            )}
          </Card>

          {/* Return Progress */}
          {returns.length > 0 && (
            <Card className="border border-pink-100 bg-white shadow-sm">
              <h2 className="text-base font-bold text-slate-900">
                Return &amp; Refund Progress
              </h2>

              {returns.map((item) => (
                <ReturnProgress key={item.id} item={item} />
              ))}
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Delivery */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">📍</span>

              <h2 className="font-bold text-slate-900">
                Delivery Address
              </h2>
            </div>

            <p className="font-semibold text-slate-800">
              {address.recipientName || '—'}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {[
                address.streetAddress,
                address.city,
                address.state,
                address.postalCode,
              ]
                .filter(Boolean)
                .join(', ') || 'Address not available'}
            </p>

            {address.phone && (
              <p className="mt-3 text-sm text-slate-600">
                Phone: {address.phone}
              </p>
            )}
          </Card>

          {/* Payment */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">💳</span>

              <h2 className="font-bold text-slate-900">
                Payment Information
              </h2>
            </div>

            {paymentError && (
              <div className="mb-4">
                <Alert type="danger" message={paymentError} />
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Method</span>

                <span className="font-semibold text-slate-800">
                  {label(order.paymentMethod || '—')}
                </span>
              </div>

              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Status</span>

                <span
                  className={`font-semibold ${
                    order.paymentStatus === 'paid'
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {order.paymentMethod === 'cod' &&
                  order.paymentStatus === 'pending'
                    ? 'Due on delivery'
                    : label(order.paymentStatus || '—')}
                </span>
              </div>

              <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="text-slate-500">Amount</span>

                <span className="font-bold text-slate-900">
                  ₹{money(order.totalAmount)}
                </span>
              </div>
            </div>

            {canRetryPayment && (
              <button
                type="button"
                disabled={busy}
                onClick={retryPayment}
                className="mt-5 w-full rounded-lg bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
              >
                {busy ? 'Please wait...' : 'Retry Online Payment'}
              </button>
            )}
          </Card>

          {/* Payment History */}
          {payments.map((payment) => (
            <Card
              key={payment.id}
              className="border border-slate-200 bg-white shadow-sm"
            >
              <h2 className="font-bold text-slate-900">
                Payment Record
              </h2>

              <p className="mt-3 text-sm font-semibold text-slate-800">
                {label(payment.status)}
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                ₹{money(payment.amount)}
              </p>

              {payment.razorpayPaymentId && (
                <p className="mt-2 break-all text-xs text-slate-500">
                  Reference: {payment.razorpayPaymentId}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div className="pb-5 text-center">
        <Link
          to="/customer/orders"
          className="text-sm font-semibold text-pink-700 hover:underline"
        >
          ← Back to My Orders
        </Link>
      </div>
    </div>
  );
}
