import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [activeCart, setActiveCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Address creation form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: 'Home',
    recipientName: user?.name || '',
    phone: user?.phone || '',
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: true,
  });

  useEffect(() => {
    loadCheckoutData();
  }, []);

  useEffect(() => {
    if (!activeCart?.items?.length || !selectedAddressId) {
      setQuote(null);
      setQuoteError('');
      return undefined;
    }
    let active = true;
    setQuote(null);
    setQuoteLoading(true);
    setQuoteError('');
    api.post('/customer/checkout/quote', {
      shopId: activeCart.shopId,
      shippingAddressId: Number(selectedAddressId),
      paymentMethod,
      couponCode: appliedCouponCode || undefined,
      items: activeCart.items.map((item) => ({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
      })),
    })
      .then((response) => {
        if (active) {
          setQuote(response.quote);
          setQuoteError('');
          if (response.quote.coupon) setCouponError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          const message = requestError.message || 'Unable to calculate this order.';
          setQuoteError(message);
          if (appliedCouponCode) setCouponError(message);
        }
      })
      .finally(() => {
        if (active) {
          setQuoteLoading(false);
          setApplyingCoupon(false);
        }
      });
    return () => { active = false; };
  }, [activeCart, paymentMethod, selectedAddressId, appliedCouponCode]);

  const applyCoupon = (event) => {
    event.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Enter a coupon code.');
      return;
    }
    if (!selectedAddressId) {
      setCouponError('Select a shipping address before applying a coupon.');
      return;
    }
    setCouponError('');
    setQuoteError('');
    setQuote(null);
    setApplyingCoupon(true);
    setAppliedCouponCode(code);
  };

  const removeCoupon = () => {
    setCouponError('');
    setQuoteError('');
    setAppliedCouponCode('');
    setApplyingCoupon(false);
    setQuote(null);
  };

  const loadCheckoutData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cartRes, addrRes] = await Promise.all([
        api.get('/customer/cart'),
        api.get('/customer/addresses'),
      ]);

      const allCarts = cartRes.carts || [];
      const addrList = addrRes.items || [];

      // Determine which shop cart is being checked out
      const queryShopId = searchParams.get('shopId');
      let targetCart = null;
      if (queryShopId) {
        targetCart = allCarts.find((c) => String(c.shopId) === String(queryShopId));
      }
      if (!targetCart && allCarts.length > 0) {
        targetCart = allCarts[0];
      }

      setActiveCart(targetCart);
      setAddresses(addrList);

      if (addrList.length > 0) {
        const defaultAddr = addrList.find((a) => a.isDefault) || addrList[0];
        setSelectedAddressId(defaultAddr.id);
      } else {
        setShowAddressForm(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to load checkout details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/customer/addresses', addrForm);
      const newAddr = res.address || res;
      setAddresses([newAddr, ...addresses]);
      setSelectedAddressId(newAddr.id);
      setShowAddressForm(false);
      setAddrForm({
        label: 'Home',
        recipientName: user?.name || '',
        phone: user?.phone || '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        isDefault: false,
      });
    } catch (err) {
      alert(err.message || 'Failed to save delivery address');
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select or create a delivery address.');
      return;
    }
    if (!activeCart || !activeCart.items || activeCart.items.length === 0) {
      setError('No items in the active cart to checkout.');
      return;
    }
    if (!quote || quoteLoading || quoteError) {
      setError(quoteError || 'Wait for the order total to be calculated before placing the order.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Load the third-party checkout before reserving stock or clearing the cart.
    if (paymentMethod === 'razorpay') {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setError('Razorpay could not be loaded. Please try again or choose Cash on Delivery.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      shopId: activeCart.shopId,
      shippingAddressId: selectedAddressId,
      paymentMethod,
      couponCode: appliedCouponCode || undefined,
      notes: notes || undefined,
      items: activeCart.items.map((it) => ({
        productVariantId: it.productVariantId,
        quantity: it.quantity,
      })),
    };

    try {
      const res = await api.post('/customer/checkout', payload);
      window.dispatchEvent(new Event('customer:cart-updated'));
      const { order, razorpay } = res;

      if (paymentMethod === 'cod') {
        setSuccessOrder(order);
        setSubmitting(false);
      } else if (paymentMethod === 'razorpay') {
        if (!razorpay) {
          throw new Error('Razorpay initialization details missing from server response.');
        }

        let paymentCompleted = false;
        const rzpOptions = {
          key: razorpay.key,
          amount: razorpay.amount,
          currency: razorpay.currency || 'INR',
          name: 'Multivendor Platform',
          description: `Order #${order.orderNumber}`,
          order_id: razorpay.orderId,
          handler: async function (response) {
            paymentCompleted = true;
            try {
              const verification = await api.post('/customer/payments/razorpay/verify', {
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setSuccessOrder(verification.order || { ...order, status: 'confirmed', paymentStatus: 'paid' });
            } catch (vErr) {
              setError(vErr.message || 'Payment verification failed. Please contact customer support.');
            } finally {
              setSubmitting(false);
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
            contact: user?.phone,
          },
          theme: {
            color: '#2563eb',
          },
          modal: {
            ondismiss: function () {
              if (!paymentCompleted) {
                api.post('/customer/payments/razorpay/failure', {
                  orderId: order.id,
                  reason: 'Payment window closed before payment completion.',
                }).catch((failure) => setError(failure.message));
              }
              setSubmitting(false);
              if (!paymentCompleted) {
                setSuccessOrder({ ...order, paymentStatus: 'pending' });
              }
            },
          },
        };

        const rzp = new window.Razorpay(rzpOptions);
        rzp.on('payment.failed', function (resp) {
          const reason = resp.error?.description || 'The payment could not be completed.';
          api.post('/customer/payments/razorpay/failure', { orderId: order.id, reason }).catch((failure) => setError(failure.message));
          setError(`Payment failed: ${reason}`);
          setSuccessOrder({ ...order, paymentStatus: 'failed' });
          setSubmitting(false);
        });
        rzp.open();
      }
    } catch (err) {
      setError(err.message || 'Failed to place order.');
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  if (successOrder) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
          ✓
        </div>
        {error && <div className="mb-4 text-left"><Alert variant="error">{error}</Alert></div>}
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Order Placed</h1>
        <p className="text-slate-600 mb-6">
          {successOrder.paymentMethod === 'cod' ? 'Your order has been sent to the fulfilling store. Cash is due on delivery.' : successOrder.paymentStatus === 'paid' ? 'Your payment was verified and the order is confirmed.' : 'Your order is saved. Online payment is still due; you can retry from the order details.'}
        </p>

        <Card className="text-left mb-6 space-y-3 bg-slate-50">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Order Reference:</span>
            <span className="font-mono font-bold text-slate-900">{successOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total Charged:</span>
            <span className="font-bold text-slate-900">₹{Number(successOrder.totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Payment Mode:</span>
            <span className="font-semibold text-slate-900 uppercase">{successOrder.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Order Status:</span>
            <span className="font-semibold text-slate-800 capitalize">{successOrder.status}</span>
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Link
            to={`/customer/orders/${successOrder.id}`}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            View Order Details
          </Link>
          <Link
            to="/products"
            className="px-6 py-2.5 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!activeCart || !activeCart.items || activeCart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Active Cart Found</h2>
        <p className="text-slate-600 mb-6">Please add items to your cart before proceeding to checkout.</p>
        <Link
          to="/products"
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Explore Catalog
        </Link>
      </div>
    );
  }

  const subtotal = Number(quote?.subtotal || 0);
  const deliveryFee = Number(quote?.deliveryFee || 0);
  const taxAmount = Number(quote?.taxAmount || 0);
  const finalTotal = Number(quote?.totalAmount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Secure Checkout</h1>
          <p className="text-sm text-slate-600">
            Fulfilling Store: <span className="font-semibold text-blue-700">{activeCart.shop?.name}</span>
          </p>
        </div>
        <Link to="/cart" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          ← Back to Cart
        </Link>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {quoteError && <Alert kind="error">{quoteError}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Address and Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Address */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Shipping Address
              </h2>
              <button
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                {showAddressForm ? 'Cancel' : '+ Add Address'}
              </button>
            </div>

            {showAddressForm && (
              <form onSubmit={handleSaveAddress} className="mb-6 p-4 bg-slate-50 border rounded-lg space-y-3">
                <h3 className="text-xs font-semibold text-slate-700 uppercase">New Address Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={addrForm.recipientName}
                      onChange={(e) => setAddrForm({ ...addrForm, recipientName: e.target.value })}
                      className="w-full text-xs p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                   <input
    type="tel"
    required
    inputMode="numeric"
    pattern="[0-9]{10}"
    maxLength={10}
    value={addrForm.phone}
    onChange={(e) =>
      setAddrForm({
        ...addrForm,
        phone: e.target.value.replace(/\D/g, '').slice(0, 10),
      })
    }
    className="w-full text-xs p-2 border rounded"
    placeholder="Enter 10-digit mobile number"
    title="Please enter a valid 10-digit mobile number"
  />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      required
                      value={addrForm.streetAddress}
                      onChange={(e) => setAddrForm({ ...addrForm, streetAddress: e.target.value })}
                      className="w-full text-xs p-2 border rounded"
                      placeholder="Building, street, area"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={addrForm.city}
                      onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                      className="w-full text-xs p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={addrForm.state}
                      onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                      className="w-full text-xs p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      required
                      value={addrForm.postalCode}
                      onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                      className="w-full text-xs p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Address Label</label>
                    <select
                      value={addrForm.label}
                      onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                      className="w-full text-xs p-2 border rounded"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowAddressForm(false)} className="text-xs py-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs py-1">
                    Save Address
                  </Button>
                </div>
              </form>
            )}

            {addresses.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No addresses saved yet. Please add a shipping address above.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                      className={`p-3.5 border rounded-lg cursor-pointer transition flex flex-col justify-between ${
                        isSelected ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{addr.recipientName}</span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {addr.label || 'Address'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{addr.streetAddress}</p>
                        <p className="text-xs text-slate-600">
                          {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Phone: {addr.phone}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="radio"
                          name="checkout_addr"
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="h-3.5 w-3.5 text-blue-600"
                        />
                        <span className="text-xs font-medium text-slate-700">Deliver Here</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Step 2: Payment Method */}
          <Card>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              Payment Option
            </h2>

            <div className="space-y-3">
              <label
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition ${
                  paymentMethod === 'cod' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="pay_mode"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 h-4 w-4 text-blue-600"
                />
                <div className="ml-3">
                  <span className="block text-sm font-semibold text-slate-900">Cash on Delivery (COD)</span>
                  <span className="block text-xs text-slate-500">
                    Pay upon delivery via cash or UPI directly to our delivery executive.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition ${
                  paymentMethod === 'razorpay' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="pay_mode"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1 h-4 w-4 text-blue-600"
                />
                <div className="ml-3">
                  <span className="block text-sm font-semibold text-slate-900">Online Payment (Razorpay)</span>
                  <span className="block text-xs text-slate-500">
                    Instant checkout via UPI, Cards, NetBanking & Mobile Wallets.
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Order Notes / Special Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. Call before delivery, leave with neighbor..."
                className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary */}
        <div>
          <Card className="sticky top-20 space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b pb-3">Order Summary</h2>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
              {activeCart.items.map((it) => (
                <div key={it.id} className="py-2.5 flex justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{it.product?.name || 'Item'}</p>
                    <p className="text-slate-500">
                      {it.variant?.variantName || it.variant?.sku} × {it.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900">
                    ₹{Number(quote?.items?.find((line) => Number(line.productVariantId) === Number(it.productVariantId))?.totalPrice || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-2 text-xs">
              <form onSubmit={applyCoupon} className="space-y-2 border-b pb-3">
                <label htmlFor="checkout-coupon" className="block font-medium text-slate-700">
                  Coupon code
                </label>
                <div className="flex gap-2">
                  <input
                    id="checkout-coupon"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    disabled={Boolean(appliedCouponCode) || applyingCoupon}
                    maxLength={40}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs uppercase"
                    placeholder="Enter code"
                  />
                  {appliedCouponCode ? (
                    <Button type="button" variant="secondary" onClick={removeCoupon}>
                      Remove
                    </Button>
                  ) : (
                    <Button type="submit" disabled={applyingCoupon || quoteLoading}>
                      {applyingCoupon ? 'Applying…' : 'Apply'}
                    </Button>
                  )}
                </div>
                {couponError && <p role="alert" className="text-rose-600">{couponError}</p>}
                {quote?.coupon && (
                  <p className="text-emerald-700">
                    {quote.coupon.code} applied — ₹{Number(quote.coupon.discountAmount).toFixed(2)} off
                  </p>
                )}
              </form>
              <div className="flex justify-between text-slate-600">
                <span>Taxable value</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (configured product rates)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              {quote?.taxBreakdown?.items?.some((item) => Number(item.components?.cgst || 0) > 0) && (
                <>
                  <div className="flex justify-between pl-3 text-slate-500">
                    <span>CGST</span>
                    <span>₹{quote.taxBreakdown.items.reduce((sum, item) => sum + Number(item.components?.cgst || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pl-3 text-slate-500">
                    <span>SGST</span>
                    <span>₹{quote.taxBreakdown.items.reduce((sum, item) => sum + Number(item.components?.sgst || 0), 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              {quote?.taxBreakdown?.items?.some((item) => Number(item.components?.igst || 0) > 0) && (
                <div className="flex justify-between pl-3 text-slate-500">
                  <span>IGST</span>
                  <span>₹{quote.taxBreakdown.items.reduce((sum, item) => sum + Number(item.components?.igst || 0), 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery ({quote?.shippingSnapshot?.weightKg || 0} kg; {quote?.shippingSnapshot?.zoneName || 'calculating'})</span>
                <span>{quoteLoading ? 'Calculating…' : `₹${deliveryFee.toFixed(2)}`}</span>
              </div>
              {Number(quote?.discountAmount || 0) > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>Coupon discount</span>
                  <span>−₹{Number(quote.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {Number(quote?.shippingSnapshot?.locationSurcharge || 0) > 0 && (
                <div className="flex justify-between pl-3 text-slate-500">
                  <span>Includes location surcharge</span>
                  <span>₹{Number(quote.shippingSnapshot.locationSurcharge).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t pt-2">
                <span>Total Payable</span>
                <span className="text-blue-700">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={submitting || !selectedAddressId || quoteLoading || !quote || Boolean(quoteError)}
              className="w-full py-2.5 text-sm font-semibold"
            >
              {submitting ? 'Placing Order...' : quoteLoading ? 'Calculating total…' : `Confirm Order • ₹${finalTotal.toFixed(2)}`}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
