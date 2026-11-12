


import { useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';
import { hasPermission } from '../../../services/permissions.js';

const WORKFLOW_STATUSES = [
  'confirmed',
  'processing',
  'packed',
  'ready_for_dispatch',
  'assigned_to_delivery',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'ready_for_dispatch',
  'assigned_to_delivery',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'delivery_failed',
  'returned',
];

const statusLabel = (status = 'unknown') =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const getItems = (response) => {
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.orders)) return response.orders;
  return [];
};

export default function ShopOrders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [workflowNotes, setWorkflowNotes] = useState('');

  const [selectedDeliveryUser, setSelectedDeliveryUser] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [loadingOrder, setLoadingOrder] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  const [processingReturnId, setProcessingReturnId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [refundReference, setRefundReference] = useState('');

  const can = (permission) =>
    user?.shop?.role === 'shop_owner' ||
    hasPermission(user?.permissions, permission);

  const isDeliveryAssociate =
    user?.shop?.role === 'delivery_associate';

  // Load orders and delivery associates independently.
  // An associate API failure must not break the orders page.
  const loadData = async () => {
    setLoading(true);
    setError(null);

    const query = statusFilter
      ? `?status=${encodeURIComponent(statusFilter)}`
      : '';

    try {
      const orderResponse = await api.get(`/shop/orders${query}`);
      setOrders(getItems(orderResponse));

      if (can('orders.assign') && !isDeliveryAssociate) {
        try {
          const associateResponse = await api.get(
            '/shop/orders/delivery-associates',
          );

          const associates = Array.isArray(associateResponse?.items)
            ? associateResponse.items
            : Array.isArray(associateResponse?.employees)
              ? associateResponse.employees
              : [];

          setEmployees(associates);

          if (associates.length > 0) {
            setSelectedDeliveryUser((current) => {
              const currentExists = associates.some(
                (employee) =>
                  String(employee.userId) === String(current),
              );

              return currentExists
                ? current
                : String(associates[0].userId);
            });
          } else {
            setSelectedDeliveryUser('');
          }
        } catch (associateError) {
          console.error(
            'Failed to load delivery associates:',
            associateError,
          );
          setEmployees([]);
        }
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Failed to load shop orders:', err);
      setOrders([]);
      setError(err.message || 'Unable to load shop orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const refreshOrders = async () => {
    const query = statusFilter
      ? `?status=${encodeURIComponent(statusFilter)}`
      : '';

    const response = await api.get(`/shop/orders${query}`);
    setOrders(getItems(response));
    setError(null);
  };

  const refreshSelectedOrder = async (orderId) => {
    const response = await api.get(`/shop/orders/${orderId}`);
    const order = response?.order || response;

    if (!order?.id) {
      throw new Error('Order details were not returned by the server.');
    }

    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setDeliveryNotes(order.delivery?.notes || '');

    return order;
  };

  const openOrder = async (order) => {
    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setWorkflowNotes('');
    setDeliveryNotes(order.delivery?.notes || '');
    setModalError(null);
    setModalSuccess(null);
    setRejectionReason('');
    setRefundReference('');
    setLoadingOrder(true);

    try {
      await refreshSelectedOrder(order.id);
    } catch (err) {
      setModalError(err.message || 'Unable to load order details.');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedOrder || !selectedStatus || updatingStatus) return;

    setUpdatingStatus(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const response = await api.patch(
        `/shop/orders/${selectedOrder.id}/status`,
        {
          status: selectedStatus,
          notes: workflowNotes.trim() || undefined,
        },
      );

      const updated = response?.order || response;

      if (!updated?.id) {
        throw new Error('Updated order was not returned by the server.');
      }

      setSelectedOrder((current) => ({
        ...current,
        ...updated,
      }));

      setSelectedStatus(updated.status);
      setWorkflowNotes('');

      setOrders((current) => {
        if (statusFilter && statusFilter !== updated.status) {
          return current.filter(
            (order) => String(order.id) !== String(updated.id),
          );
        }

        return current.map((order) =>
          String(order.id) === String(updated.id)
            ? { ...order, ...updated }
            : order,
        );
      });

      setModalSuccess(
        `Order status updated to ${statusLabel(updated.status)}.`,
      );

      try {
        await refreshSelectedOrder(updated.id);
      } catch (refreshError) {
        console.error(refreshError);
        setModalError(
          `Status was saved, but order details could not be refreshed: ${refreshError.message}`,
        );
      }

      try {
        await refreshOrders();
      } catch (refreshError) {
        console.error(refreshError);
        setModalError(
          `Status was saved, but the order list could not be refreshed: ${refreshError.message}`,
        );
      }
    } catch (err) {
      setModalError(err.message || 'Unable to update order status.');
      setSelectedStatus(selectedOrder.status);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignDelivery = async (event) => {
    event.preventDefault();

    if (!selectedOrder || !selectedDeliveryUser || assigning) return;

    setAssigning(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      await api.post(
        `/shop/orders/${selectedOrder.id}/assign-delivery`,
        {
          deliveryUserId: Number(selectedDeliveryUser),
          notes: deliveryNotes.trim() || undefined,
        },
      );

      setModalSuccess('Order assigned to delivery associate.');

      try {
        await refreshSelectedOrder(selectedOrder.id);
      } catch (refreshError) {
        console.error(refreshError);
        setModalError(
          `Assignment was saved, but order details could not be refreshed: ${refreshError.message}`,
        );
      }

      try {
        await refreshOrders();
      } catch (refreshError) {
        console.error(refreshError);
        setModalError(
          `Assignment was saved, but the order list could not be refreshed: ${refreshError.message}`,
        );
      }
    } catch (err) {
      setModalError(err.message || 'Unable to assign delivery associate.');
    } finally {
      setAssigning(false);
    }
  };

  const handleReturnTransition = async (
    returnRequest,
    status,
    extra = {},
  ) => {
    if (!selectedOrder || processingReturnId) return;

    const confirmations = {
      approved: 'Approve this return request?',
      rejected:
        'Reject this return request? The customer will see your reason.',
      received:
        'Confirm that the returned product has been physically received?',
      refund_processing:
        'Start the manual refund process? No payment will be sent automatically.',
      refunded:
        'Confirm that the refund was actually sent outside this system?',
    };

    if (!window.confirm(confirmations[status])) return;

    setProcessingReturnId(returnRequest.id);
    setModalError(null);
    setModalSuccess(null);

    try {
      const response = await api.patch(
        `/shop/returns/${returnRequest.id}`,
        { status, ...extra },
      );

      const updatedReturn =
        response?.return || response?.returnRequest;

      if (!updatedReturn?.id) {
        throw new Error('Updated return request was not returned.');
      }

      setSelectedOrder((current) => ({
        ...current,
        returns: (current.returns || []).map((item) =>
          String(item.id) === String(updatedReturn.id)
            ? updatedReturn
            : item,
        ),
      }));

      setModalSuccess(
        `Return status updated to ${statusLabel(status)}.`,
      );

      setRejectionReason('');
      setRefundReference('');

      try {
        await refreshSelectedOrder(selectedOrder.id);
      } catch (refreshError) {
        console.error(refreshError);
        setModalError(
          `Return was saved, but order details could not be refreshed: ${refreshError.message}`,
        );
      }
    } catch (err) {
      setModalError(err.message || 'Unable to update return request.');
    } finally {
      setProcessingReturnId(null);
    }
  };

  const statusBadge = (status) => {
    const colors = {
      delivered: 'bg-emerald-100 text-emerald-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      packed: 'bg-purple-100 text-purple-800',
      ready_for_dispatch: 'bg-cyan-100 text-cyan-800',
      assigned_to_delivery: 'bg-sky-100 text-sky-800',
      picked_up: 'bg-amber-100 text-amber-800',
      out_for_delivery: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-rose-100 text-rose-800',
      delivery_failed: 'bg-rose-100 text-rose-800',
      returned: 'bg-violet-100 text-violet-800',
      pending_payment: 'bg-slate-100 text-slate-800',
    };

    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          colors[status] || 'bg-slate-100 text-slate-700'
        }`}
      >
        {statusLabel(status).toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Retail Orders &amp; Fulfillment
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Process customer orders and manage fulfillment from each order.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            aria-label="Filter orders by status"
          >
            <option value="">All Orders</option>
            {WORKFLOW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="secondary"
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {loading ? (
        <Spinner />
      ) : error ? null : orders.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            No orders found for this shop.
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Delivery Associate</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-indigo-600">
                    {order.orderNumber || `#${order.id}`}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {order.customer?.name || 'Customer'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {order.customer?.phone || ''}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-bold text-slate-900">
                    ₹{Number(order.totalAmount || 0).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs font-medium uppercase text-slate-600">
                      {order.paymentMethod || '—'} &bull;{' '}
                      <strong
                        className={
                          order.paymentStatus === 'paid'
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        {order.paymentStatus || 'unknown'}
                      </strong>
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {statusBadge(order.status)}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-700">
                    {order.delivery?.deliveryUser ? (
                      <div>
                        <span className="font-medium">
                          {order.delivery.deliveryUser.name}
                        </span>
                        <div className="text-slate-400">
                          {statusLabel(order.delivery.status)}
                        </div>
                      </div>
                    ) : (
                      <span className="italic text-slate-400">
                        Not Assigned
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openOrder(order)}
                      className="text-xs font-semibold text-indigo-600 underline hover:text-indigo-800"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Manage Order: {selectedOrder.orderNumber || selectedOrder.id}
                </h2>
                <div className="text-xs text-slate-500">
                  {selectedOrder.createdAt
                    ? new Date(selectedOrder.createdAt).toLocaleString()
                    : ''}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                disabled={updatingStatus || assigning}
                className="text-2xl font-bold text-slate-400 hover:text-slate-600"
                aria-label="Close order popup"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="mt-4">
                <Alert variant="error">{modalError}</Alert>
              </div>
            )}

            {modalSuccess && (
              <div className="mt-4">
                <Alert variant="success">{modalSuccess}</Alert>
              </div>
            )}

            {loadingOrder ? (
              <div className="py-8">
                <Spinner />
              </div>
            ) : (
              <div className="mt-4 space-y-5 text-sm text-slate-700">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-medium uppercase text-slate-500">
                      Customer Details
                    </div>
                    <div className="font-semibold text-slate-900">
                      {selectedOrder.customer?.name || 'Customer'}
                    </div>

                    {selectedOrder.customer?.email && (
                      <div className="text-xs text-slate-600">
                        {selectedOrder.customer.email}
                      </div>
                    )}

                    {selectedOrder.customer?.phone && (
                      <div className="text-xs text-slate-600">
                        {selectedOrder.customer.phone}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase text-slate-500">
                      Current Status
                    </div>
                    <div className="mt-1">
                      {statusBadge(selectedOrder.status)}
                    </div>

                    {can('orders.update') && !isDeliveryAssociate && (
                      <div>
                        <label
                          htmlFor="order-status"
                          className="mt-3 block text-xs font-medium text-slate-600"
                        >
                          Update status
                        </label>

                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                          <select
                            id="order-status"
                            value={selectedStatus}
                            disabled={updatingStatus || assigning}
                            onChange={(event) =>
                              setSelectedStatus(event.target.value)
                            }
                            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="" disabled>
                              Select status
                            </option>
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ))}
                          </select>

                          <Button
                            type="button"
                            onClick={handleStatusChange}
                            disabled={
                              updatingStatus ||
                              assigning ||
                              !selectedStatus ||
                              selectedStatus === selectedOrder.status
                            }
                          >
                            {updatingStatus ? 'Saving…' : 'Save Status'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedOrder.shippingAddress && (
                  <div className="rounded bg-slate-50 p-3 text-xs">
                    <div className="font-semibold text-slate-700">
                      Delivery Address:
                    </div>
                    <div className="mt-1">
                      {[
                        selectedOrder.shippingAddress.recipientName,
                        selectedOrder.shippingAddress.streetAddress,
                        selectedOrder.shippingAddress.addressLine2,
                        selectedOrder.shippingAddress.city,
                        selectedOrder.shippingAddress.state,
                        selectedOrder.shippingAddress.postalCode,
                      ].filter(Boolean).join(', ')}
                    </div>
                    {selectedOrder.shippingAddress.phone && (
                      <div className="mt-1">
                        Phone: {selectedOrder.shippingAddress.phone}
                      </div>
                    )}
                  </div>
                )}

                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase text-slate-500">
                    Ordered Items
                  </h3>

                  <div className="divide-y divide-slate-100 rounded border border-slate-200 text-xs">
                    {selectedOrder.items?.length ? (
                      selectedOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between gap-3 p-2"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">
                              {item.productName}
                            </span>
                            {item.variantName && ` (${item.variantName})`}
                            <div className="text-slate-500">
                              Qty: {item.quantity} &bull; Price: ₹
                              {Number(item.unitPrice || 0).toFixed(2)}
                            </div>
                            {item.taxSnapshot?.gstApplicable && (
                              <div className="text-slate-500">
                                GST {Number(item.taxSnapshot.gstRate || 0).toFixed(2)}%
                                · taxable ₹{Number(item.taxableValue || 0).toFixed(2)}
                                · tax ₹{Number(item.taxAmount || 0).toFixed(2)}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 font-bold text-slate-900">
                            ₹{Number(item.totalPrice || 0).toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-slate-500">
                        No order items returned.
                      </div>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 text-right text-xs text-slate-600">
                    {selectedOrder.subtotal != null && (
                      <div>
                        Taxable value: ₹{Number(selectedOrder.subtotal).toFixed(2)}
                      </div>
                    )}
                    {selectedOrder.taxAmount != null && (
                      <div>
                        GST: ₹{Number(selectedOrder.taxAmount).toFixed(2)}
                      </div>
                    )}
                    {selectedOrder.deliveryFee != null && (
                      <div>
                        Shipping
                        {selectedOrder.shippingSnapshot?.zoneName
                          ? ` · ${selectedOrder.shippingSnapshot.zoneName}, ${Number(selectedOrder.shippingSnapshot.weightKg || 0).toFixed(3)} kg`
                          : ''}
                        : ₹{Number(selectedOrder.deliveryFee).toFixed(2)}
                      </div>
                    )}
                    <div className="font-bold text-slate-900">
                      Total: ₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 p-3">
                  <h3 className="text-xs font-bold uppercase text-slate-600">
                    Delivery Management
                  </h3>

                  {selectedOrder.delivery?.deliveryUser ? (
                    <div className="mt-2 rounded bg-slate-50 p-3 text-xs">
                      <div className="font-semibold text-slate-900">
                        Assigned to {selectedOrder.delivery.deliveryUser.name}
                      </div>
                      {selectedOrder.delivery.deliveryUser.phone && (
                        <div>{selectedOrder.delivery.deliveryUser.phone}</div>
                      )}
                      <div className="mt-1">
                        Delivery status: {statusLabel(selectedOrder.delivery.status)}
                      </div>
                      {selectedOrder.delivery.assignedAt && (
                        <div>
                          Assigned: {new Date(selectedOrder.delivery.assignedAt).toLocaleString()}
                        </div>
                      )}
                      {selectedOrder.delivery.notes && (
                        <div className="mt-1">
                          Notes: {selectedOrder.delivery.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      No delivery associate is assigned. You can still manage delivery statuses here.
                    </p>
                  )}

                  {can('orders.assign') &&
                    !isDeliveryAssociate &&
                    ['ready_for_dispatch', 'assigned_to_delivery'].includes(selectedOrder.status) && (
                      employees.length > 0 ? (
                        <form
                          onSubmit={handleAssignDelivery}
                          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                        >
                          <div>
                            <label
                              htmlFor="delivery-associate"
                              className="block text-xs font-medium text-slate-600"
                            >
                              Delivery associate
                            </label>
                            <select
                              id="delivery-associate"
                              required
                              value={selectedDeliveryUser}
                              onChange={(event) =>
                                setSelectedDeliveryUser(event.target.value)
                              }
                              disabled={assigning || updatingStatus}
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              {employees.map((employee) => (
                                <option
                                  key={employee.userId}
                                  value={employee.userId}
                                >
                                  {employee.name} ({employee.phone || employee.email})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor="delivery-notes"
                              className="block text-xs font-medium text-slate-600"
                            >
                              Delivery notes
                            </label>
                            <Input
                              id="delivery-notes"
                              value={deliveryNotes}
                              onChange={(event) =>
                                setDeliveryNotes(event.target.value)
                              }
                              placeholder="Optional delivery instructions"
                              maxLength={500}
                            />
                          </div>

                          <Button
                            type="submit"
                            disabled={assigning || updatingStatus}
                          >
                            {assigning
                              ? 'Saving…'
                              : selectedOrder.delivery
                                ? 'Update Assignment'
                                : 'Assign'}
                          </Button>
                        </form>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">
                          No active delivery associates are available for this shop.
                          Continue delivery status updates using the status control.
                        </p>
                      )
                    )}
                </section>

                {(selectedOrder.returns || []).map((returnRequest) => (
                  <section
                    key={returnRequest.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase text-slate-600">
                        Return Request · Order #{selectedOrder.id}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          returnRequest.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : returnRequest.status === 'refunded'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {statusLabel(returnRequest.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <p>
                        <span className="font-semibold">Customer:</span>{' '}
                        {selectedOrder.customer?.name || '—'}
                      </p>
                      <p>
                        <span className="font-semibold">Requested:</span>{' '}
                        {returnRequest.createdAt
                          ? new Date(returnRequest.createdAt).toLocaleString()
                          : '—'}
                      </p>
                      <p className="sm:col-span-2">
                        <span className="font-semibold">Reason:</span>{' '}
                        {returnRequest.reason}
                      </p>
                      <p>
                        <span className="font-semibold">Refund amount:</span>{' '}
                        ₹{Number(returnRequest.refundAmount || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="mt-3 divide-y divide-slate-100 rounded border border-slate-200">
                      {(returnRequest.items || []).map((returnItem) => (
                        <div
                          key={returnItem.id}
                          className="flex justify-between gap-3 p-2 text-xs"
                        >
                          <span>
                            {returnItem.orderItem?.productName || 'Product'}
                            {returnItem.orderItem?.variantName
                              ? ` (${returnItem.orderItem.variantName})`
                              : ''}
                          </span>
                          <span className="font-semibold">
                            Qty {returnItem.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <ol className="mt-3 space-y-1 text-xs text-slate-600">
                      <li>
                        Return requested · {returnRequest.createdAt
                          ? new Date(returnRequest.createdAt).toLocaleString()
                          : '—'}
                      </li>

                      {returnRequest.approvedAt && (
                        <li>
                          Approved · {new Date(returnRequest.approvedAt).toLocaleString()}
                          {returnRequest.approver?.name
                            ? ` by ${returnRequest.approver.name}`
                            : ''}
                        </li>
                      )}

                      {returnRequest.rejectedAt && (
                        <li>
                          Rejected · {new Date(returnRequest.rejectedAt).toLocaleString()}
                          {returnRequest.rejector?.name
                            ? ` by ${returnRequest.rejector.name}`
                            : ''}
                        </li>
                      )}

                      {returnRequest.rejectionReason && (
                        <li className="rounded bg-rose-50 p-2 text-rose-800">
                          Rejection reason: {returnRequest.rejectionReason}
                        </li>
                      )}

                      {returnRequest.receivedAt && (
                        <li>
                          Product received · {new Date(returnRequest.receivedAt).toLocaleString()}
                          {returnRequest.receiver?.name
                            ? ` by ${returnRequest.receiver.name}`
                            : ''}
                        </li>
                      )}

                      {returnRequest.refundProcessingAt && (
                        <li>
                          Manual refund processing · {new Date(returnRequest.refundProcessingAt).toLocaleString()}
                        </li>
                      )}

                      {returnRequest.refundedAt && (
                        <li>
                          Refund confirmed · {new Date(returnRequest.refundedAt).toLocaleString()}
                          {returnRequest.refundProcessor?.name
                            ? ` by ${returnRequest.refundProcessor.name}`
                            : ''}
                        </li>
                      )}

                      {returnRequest.refundReference && (
                        <li>
                          Manual refund reference: {returnRequest.refundReference}
                        </li>
                      )}
                    </ol>

                    {can('orders.approve') && returnRequest.status === 'requested' && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={processingReturnId === returnRequest.id}
                          onClick={() =>
                            handleReturnTransition(returnRequest, 'approved')
                          }
                        >
                          {processingReturnId === returnRequest.id
                            ? 'Saving…'
                            : 'Approve Return'}
                        </Button>

                        <form
                          className="flex min-w-full flex-col gap-2 sm:flex-row"
                          onSubmit={(event) => {
                            event.preventDefault();

                            if (rejectionReason.trim().length < 5) {
                              setModalError(
                                'Enter a rejection reason of at least 5 characters.',
                              );
                              return;
                            }

                            handleReturnTransition(returnRequest, 'rejected', {
                              rejectionReason: rejectionReason.trim(),
                            });
                          }}
                        >
                          <Input
                            value={rejectionReason}
                            onChange={(event) =>
                              setRejectionReason(event.target.value)
                            }
                            placeholder="Required rejection reason"
                            maxLength={500}
                            required
                            minLength={5}
                            aria-label="Return rejection reason"
                          />

                          <Button
                            type="submit"
                            variant="danger"
                            disabled={processingReturnId === returnRequest.id}
                          >
                            Reject Return
                          </Button>
                        </form>
                      </div>
                    )}

                    {can('orders.approve') && returnRequest.status === 'approved' && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500">
                          Confirm receipt after the returned product physically arrives.
                          Returned stock is not automatically restocked; inspect it first.
                        </p>
                        <Button
                          type="button"
                          className="mt-2"
                          disabled={processingReturnId === returnRequest.id}
                          onClick={() =>
                            handleReturnTransition(returnRequest, 'received')
                          }
                        >
                          {processingReturnId === returnRequest.id
                            ? 'Saving…'
                            : 'Mark Return Received'}
                        </Button>
                      </div>
                    )}

                    {can('payments.refund') && returnRequest.status === 'received' && (
                      <div className="mt-4">
                        <p className="text-xs text-amber-800">
                          Manual refund only. This application does not send refunds to the payment gateway.
                        </p>
                        <Button
                          type="button"
                          className="mt-2"
                          disabled={processingReturnId === returnRequest.id}
                          onClick={() =>
                            handleReturnTransition(returnRequest, 'refund_processing')
                          }
                        >
                          {processingReturnId === returnRequest.id
                            ? 'Saving…'
                            : 'Start Manual Refund'}
                        </Button>
                      </div>
                    )}

                    {can('payments.refund') && returnRequest.status === 'refund_processing' && (
                      <form
                        className="mt-4 space-y-2"
                        onSubmit={(event) => {
                          event.preventDefault();

                          if (refundReference.trim().length < 4) {
                            setModalError(
                              'Enter the actual payment transaction or receipt reference.',
                            );
                            return;
                          }

                          handleReturnTransition(returnRequest, 'refunded', {
                            refundReference: refundReference.trim(),
                          });
                        }}
                      >
                        <p className="text-xs text-amber-800">
                          Complete the refund outside the application first, then enter its transaction/receipt reference to confirm.
                        </p>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={refundReference}
                            onChange={(event) =>
                              setRefundReference(event.target.value)
                            }
                            placeholder="Manual refund transaction/reference"
                            maxLength={255}
                            minLength={4}
                            required
                            aria-label="Manual refund reference"
                          />

                          <Button
                            type="submit"
                            disabled={processingReturnId === returnRequest.id}
                          >
                            {processingReturnId === returnRequest.id
                              ? 'Saving…'
                              : 'Confirm Refund Sent'}
                          </Button>
                        </div>
                      </form>
                    )}
                  </section>
                ))}

                <section className="border-t pt-4">
                  <h3 className="text-xs font-bold uppercase text-slate-600">
                    Order Workflow Timeline
                  </h3>

                  <ol className="mt-3 space-y-0">
                    {WORKFLOW_STATUSES.slice(0, 8).map((status) => {
                      const history = selectedOrder.statusHistory || [];
                      const event = history.find(
                        (entry) => entry.newStatus === status,
                      );

                      const current = selectedOrder.status === status;

                      const reached =
                        current ||
                        Boolean(event) ||
                        history.some(
                          (entry) => entry.previousStatus === status,
                        );

                      const initialConfirmed =
                        status === 'confirmed' &&
                        !event &&
                        selectedOrder.status !== 'pending_payment' &&
                        !history.some(
                          (entry) => entry.previousStatus === 'confirmed',
                        );

                      const completed = reached || initialConfirmed;
                      const date =
                        event?.createdAt ||
                        (initialConfirmed ? selectedOrder.createdAt : null);

                      return (
                        <li
                          key={status}
                          className="relative flex gap-3 pb-4 last:pb-0"
                        >
                          <span
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              current
                                ? 'bg-indigo-600 text-white'
                                : completed
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {completed ? '✓' : ''}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div
                              className={`font-semibold ${
                                current
                                  ? 'text-indigo-700'
                                  : completed
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                              }`}
                            >
                              {statusLabel(status)}
                              {current ? ' · Current' : ''}
                            </div>

                            {date && (
                              <div className="text-xs text-slate-500">
                                {new Date(date).toLocaleString()}
                              </div>
                            )}

                            {event?.changer?.name && (
                              <div className="text-xs text-slate-500">
                                Updated by {event.changer.name}
                              </div>
                            )}

                            {event?.notes && (
                              <div className="text-xs text-slate-600">
                                {event.notes}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}

                    {selectedOrder.status === 'cancelled' && (
                      <li className="flex gap-3 pb-4">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                          ✓
                        </span>

                        <div>
                          <div className="font-semibold text-rose-700">
                            Cancelled · Current
                          </div>

                          {(selectedOrder.statusHistory || [])
                            .filter(
                              (entry) => entry.newStatus === 'cancelled',
                            )
                            .map((entry) => (
                              <div
                                key={entry.id}
                                className="text-xs text-slate-500"
                              >
                                {new Date(entry.createdAt).toLocaleString()}
                                {entry.changer?.name &&
                                  ` · ${entry.changer.name}`}
                                {entry.notes && ` · ${entry.notes}`}
                              </div>
                            ))}
                        </div>
                      </li>
                    )}

                    {(selectedOrder.statusHistory || [])
                      .filter(
                        (entry) =>
                          !WORKFLOW_STATUSES.includes(entry.newStatus),
                      )
                      .map((entry) => (
                        <li
                          key={entry.id}
                          className="flex gap-3 pb-4"
                        >
                          <span className="mt-1 h-5 w-5 shrink-0 rounded-full bg-amber-100" />

                          <div>
                            <div
                              className={`font-semibold ${
                                selectedOrder.status === entry.newStatus
                                  ? 'text-indigo-700'
                                  : 'text-slate-800'
                              }`}
                            >
                              {statusLabel(entry.newStatus)}
                              {selectedOrder.status === entry.newStatus
                                ? ' · Current'
                                : ''}
                            </div>

                            <div className="text-xs text-slate-500">
                              {new Date(entry.createdAt).toLocaleString()}
                            </div>

                            {entry.changer?.name && (
                              <div className="text-xs text-slate-500">
                                Updated by {entry.changer.name}
                              </div>
                            )}

                            {entry.notes && (
                              <div className="text-xs text-slate-600">
                                {entry.notes}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                  </ol>
                </section>

                <div>
                  <label
                    htmlFor="workflow-notes"
                    className="block text-xs font-medium text-slate-600"
                  >
                    Status change notes (optional)
                  </label>

                  <textarea
                    id="workflow-notes"
                    value={workflowNotes}
                    onChange={(event) =>
                      setWorkflowNotes(event.target.value)
                    }
                    maxLength={500}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
                    placeholder="Add a note to the order history"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setSelectedOrder(null)}
                disabled={updatingStatus || assigning}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
