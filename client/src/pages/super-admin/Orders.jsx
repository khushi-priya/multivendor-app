import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { Alert, Card, Input, Spinner } from '../../components/ui.jsx';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (search) query.set('q', search);

    api
      .get(`/admin/orders?${query.toString()}`)
      .then((res) => {
        setOrders(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [status]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const statusBadge = (s) => {
    const colors = {
      delivered: 'bg-emerald-100 text-emerald-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      out_for_delivery: 'bg-amber-100 text-amber-800',
      cancelled: 'bg-rose-100 text-rose-800',
      returned: 'bg-purple-100 text-purple-800',
      pending_payment: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colors[s] || 'bg-slate-100 text-slate-700'}`}>
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Orders & Activity</h1>
          <p className="mt-1 text-sm text-slate-600">Overview of all customer orders across all registered shops.</p>
        </div>
        <div className="text-sm font-medium text-slate-600">Total orders: {total}</div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number..."
            className="w-full"
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Search
          </button>
        </form>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">No platform orders found.</div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-indigo-600">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-800">{o.shop?.name || `Shop #${o.shopId}`}</td>
                  <td className="px-4 py-3 text-slate-600">{o.customer?.name || 'Customer'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">₹{Number(o.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">₹{Number(o.commissionAmount).toFixed(2)}</td>
                  <td className="px-4 py-3">{statusBadge(o.status)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs uppercase font-medium text-slate-600">
                      {o.paymentMethod} ({o.paymentStatus})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Order Detail */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Order: {selectedOrder.orderNumber}</h2>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase">Shop</div>
                  <div className="font-semibold text-slate-900">{selectedOrder.shop?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase">Customer</div>
                  <div>{selectedOrder.customer?.name} ({selectedOrder.customer?.phone || selectedOrder.customer?.email})</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase">Order Status</div>
                  <div>{statusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase">Payment</div>
                  <div className="font-medium">{selectedOrder.paymentMethod.toUpperCase()} — {selectedOrder.paymentStatus}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium uppercase mb-2">Order Items</div>
                <div className="rounded border border-slate-200 divide-y divide-slate-100">
                  {selectedOrder.items?.map((it) => (
                    <div key={it.id} className="flex justify-between p-2 text-xs">
                      <div>
                        <span className="font-medium text-slate-900">{it.productName}</span> ({it.variantName})
                        <div className="text-slate-500">Qty: {it.quantity} &times; ₹{Number(it.unitPrice).toFixed(2)}</div>
                      </div>
                      <div className="font-semibold text-slate-800">₹{Number(it.totalPrice).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between font-bold text-slate-900">
                <span>Total Amount:</span>
                <span>₹{Number(selectedOrder.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-emerald-600">
                <span>Platform Commission ({Number(selectedOrder.commissionRate)}%):</span>
                <span>₹{Number(selectedOrder.commissionAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
