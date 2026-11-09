import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';
import { hasPermission } from '../../../services/permissions.js';

export default function PurchaseOrders() {
  const { user } = useAuth();
  const canReceiveGoods =
    user?.shop?.role === 'shop_owner' ||
    hasPermission(user?.permissions, 'wholesalers.create');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedWholesalerId = searchParams.get('wholesalerId') || '';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Selected PO for Details
  const [selectedPO, setSelectedPO] = useState(null);

  // Goods Receipt Modal State
  const [receiptPO, setReceiptPO] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [savingReceipt, setSavingReceipt] = useState(false);

  const loadPOs = () => {
    setLoading(true);
    const query = selectedWholesalerId
      ? `?wholesalerId=${encodeURIComponent(selectedWholesalerId)}`
      : '';
    api
      .get(`/shop/wholesale-orders${query}`)
      .then((res) => setOrders(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPOs();
  }, [selectedWholesalerId]);

  const openReceiptModal = (po) => {
    if (!canReceiveGoods) return;
    setReceiptPO(po);
    setReceiptNotes('');
    setReceiptItems(
      (po.items || []).map((it) => ({
        purchaseOrderItemId: it.id,
        productName: it.productName,
        variantName: it.variantName,
        ordered: it.quantity,
        receivedSoFar: it.receivedQuantity,
        remaining: Math.max(0, it.quantity - it.receivedQuantity),
        quantityReceived: Math.max(0, it.quantity - it.receivedQuantity),
        quantityRejected: 0,
        discrepancyReason: '',
      })),
    );
  };

  useEffect(() => {
    if (
      !canReceiveGoods ||
      searchParams.get('action') !== 'receipt' ||
      !orders.length ||
      receiptPO
    ) return;
    const po = orders.find(
      (item) =>
        (!selectedWholesalerId || String(item.wholesalerId) === selectedWholesalerId) &&
        !['completed', 'cancelled', 'rejected'].includes(item.status),
    );
    if (po) {
      openReceiptModal(po);
      setSearchParams({ wholesalerId: selectedWholesalerId }, { replace: true });
    } else if (selectedWholesalerId) {
      setSearchParams({ wholesalerId: selectedWholesalerId }, { replace: true });
      setError('This wholesaler has no purchase order ready for goods receipt.');
    }
  }, [canReceiveGoods, orders, receiptPO, searchParams, selectedWholesalerId, setSearchParams]);

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!receiptPO) return;
    setSavingReceipt(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        notes: receiptNotes,
        items: receiptItems.map((it) => ({
          purchaseOrderItemId: it.purchaseOrderItemId,
          quantityReceived: Number(it.quantityReceived || 0),
          quantityRejected: Number(it.quantityRejected || 0),
          discrepancyReason: it.discrepancyReason || undefined,
        })),
      };

      await api.post(`/shop/wholesale-orders/${receiptPO.id}/receipt`, payload);
      setSuccess(`Goods receipt confirmed for ${receiptPO.orderNumber}. Inventory stock updated.`);
      setReceiptPO(null);
      loadPOs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingReceipt(false);
    }
  };

  const statusBadge = (s) => {
    const colors = {
      completed: 'bg-emerald-100 text-emerald-800',
      received: 'bg-teal-100 text-teal-800',
      dispatched: 'bg-indigo-100 text-indigo-800',
      accepted: 'bg-blue-100 text-blue-800',
      submitted: 'bg-amber-100 text-amber-800',
      rejected: 'bg-rose-100 text-rose-800',
      cancelled: 'bg-slate-100 text-slate-700',
    };
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[s] || 'bg-slate-100 text-slate-700'}`}>
        {s.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wholesale Purchase Orders</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track purchase orders placed with authorized wholesalers and record goods receipts.
          </p>
        </div>
        <Link
          to={`/shop/wholesalers/book-order${selectedWholesalerId ? `?wholesalerId=${encodeURIComponent(selectedWholesalerId)}` : ''}`}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          + Book Purchase Order
        </Link>
      </div>

      {selectedWholesalerId && (
        <Link to="/shop/wholesalers" className="inline-block text-sm font-medium text-indigo-600 hover:underline">
          ← Back to Wholesalers
        </Link>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            No wholesale purchase orders recorded yet. Click &quot;Book Purchase Order&quot; to begin.
          </div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Wholesaler</th>
                <th className="px-4 py-3">Products / Items</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-indigo-600">{po.orderNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{po.wholesaler?.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {po.items?.map((item) => item.productName).filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {po.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {po.items?.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0) || 0}
                  </td>
                  <td className="px-4 py-3">{statusBadge(po.status)}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">₹{Number(po.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPO(po)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                    >
                      View Items
                    </button>
                    {canReceiveGoods && !['completed', 'cancelled', 'rejected'].includes(po.status) && (
                      <button
                        type="button"
                        onClick={() => openReceiptModal(po)}
                        className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Receive Goods
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PO Detail Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Purchase Order: {selectedPO.orderNumber}</h2>
              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="text-2xl font-bold text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium uppercase text-slate-500">Wholesaler</div>
                  <div className="font-semibold text-slate-900">{selectedPO.wholesaler?.name}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-slate-500">Status</div>
                  <div>{statusBadge(selectedPO.status)}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase text-slate-500 mb-2">Ordered Items</div>
                <div className="rounded border border-slate-200 divide-y divide-slate-100">
                  {selectedPO.items?.map((it) => (
                    <div key={it.id} className="flex justify-between p-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-900">{it.productName}</span> ({it.variantName})
                        <div className="text-slate-500">
                          Ordered: {it.quantity} &bull; Received: <strong>{it.receivedQuantity}</strong> &bull; Unit: ₹{Number(it.unitPrice).toFixed(2)}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900">₹{Number(it.totalPrice).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between border-t pt-3 text-base font-bold text-slate-900">
                <span>Total Amount:</span>
                <span>₹{Number(selectedPO.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedPO(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Goods Receipt Modal */}
      {canReceiveGoods && receiptPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Record Goods Receipt</h2>
                <p className="text-xs text-slate-500">
                  Confirm received items for PO: <strong>{receiptPO.orderNumber}</strong> ({receiptPO.wholesaler?.name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptPO(null)}
                className="text-2xl font-bold text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReceiptSubmit} className="mt-4 space-y-4">
              <div className="space-y-3">
                {receiptItems.map((it, idx) => (
                  <div key={it.purchaseOrderItemId} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 mb-2">
                      <span>{it.productName} — {it.variantName}</span>
                      <span className="text-slate-500">
                        Remaining: <strong className="text-indigo-600">{it.remaining}</strong> (Ordered: {it.ordered}, Received: {it.receivedSoFar})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Quantity Received</label>
                        <Input
                          type="number"
                          min="0"
                          max={it.remaining}
                          required
                          value={it.quantityReceived}
                          onChange={(e) => {
                            const updated = [...receiptItems];
                            updated[idx].quantityReceived = e.target.value;
                            setReceiptItems(updated);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Quantity Rejected / Damaged</label>
                        <Input
                          type="number"
                          min="0"
                          value={it.quantityRejected}
                          onChange={(e) => {
                            const updated = [...receiptItems];
                            updated[idx].quantityRejected = e.target.value;
                            setReceiptItems(updated);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Discrepancy Reason</label>
                        <Input
                          placeholder="e.g. Broken packaging"
                          value={it.discrepancyReason}
                          onChange={(e) => {
                            const updated = [...receiptItems];
                            updated[idx].discrepancyReason = e.target.value;
                            setReceiptItems(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Receipt Notes / Delivery Slip Reference</label>
                <textarea
                  rows={2}
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="e.g. Checked by store manager at loading dock"
                  className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => setReceiptPO(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingReceipt}>
                  {savingReceipt ? 'Confirming Receipt...' : 'Confirm Goods Receipt & Update Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
