import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';
import { hasPermission } from '../../../services/permissions.js';

export default function WholesalePayments() {
  const { user } = useAuth();
  const canRecordPayment =
    user?.shop?.role === 'shop_owner' ||
    hasPermission(user?.permissions, 'wholesalers.create');
  const [searchParams] = useSearchParams();
  const requestedWholesalerId = searchParams.get('wholesalerId') || '';
  const [payments, setPayments] = useState([]);
  const [wholesalers, setWholesalers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form
  const [wholesalerId, setWholesalerId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payRes, wRes, poRes] = await Promise.all([
        api.get('/shop/wholesale-payments'),
        api.get('/shop/wholesalers'),
        api.get('/shop/wholesale-orders'),
      ]);
      setPayments(payRes.items || []);
      setWholesalers(wRes.items || []);
      setPurchaseOrders(poRes.items || []);
      if ((wRes.items || []).some((item) => String(item.id) === requestedWholesalerId)) {
        setWholesalerId(requestedWholesalerId);
      } else if (wRes.items?.length > 0 && !wholesalerId) {
        setWholesalerId(String(wRes.items[0].id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [requestedWholesalerId]);

  const selectedWholesaler = wholesalers.find(
    (item) => String(item.id) === String(wholesalerId),
  );
  const outstanding = Number(selectedWholesaler?.outstandingAmount || 0);
  const visiblePayments = payments.filter(
    (item) => !wholesalerId || String(item.wholesalerId) === String(wholesalerId),
  );
  const visiblePurchaseOrders = purchaseOrders.filter(
    (item) => !wholesalerId || String(item.wholesalerId) === String(wholesalerId),
  );
  const totalPaid = visiblePayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wholesalerId || !amount) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/shop/wholesale-payments', {
        wholesalerId: Number(wholesalerId),
        purchaseOrderId: purchaseOrderId ? Number(purchaseOrderId) : undefined,
        amount: Number(amount),
        paymentMethod,
        paymentDate,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      });
      setSuccess('Wholesale payment recorded successfully.');
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wholesale Payment History</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track payments made to authorized wholesalers and settle outstanding purchase orders.
        </p>
      </div>

      {requestedWholesalerId && (
        <Link to="/shop/wholesalers" className="inline-block text-sm font-medium text-indigo-600 hover:underline">
          ← Back to Wholesalers
        </Link>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><p className="text-sm text-slate-500">Outstanding balance</p><p className="mt-2 text-2xl font-semibold text-slate-900">₹{outstanding.toFixed(2)}</p></Card>
        <Card><p className="text-sm text-slate-500">Total recorded payments</p><p className="mt-2 text-2xl font-semibold text-slate-900">₹{totalPaid.toFixed(2)}</p></Card>
      </div>

      {canRecordPayment && (
      <Card title="Record Wholesaler Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Wholesaler *</label>
              <select
                required
                value={wholesalerId}
                onChange={(e) => setWholesalerId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm"
              >
                {wholesalers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Outstanding: ₹{outstanding.toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Related Purchase Order</label>
              <select
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm"
              >
                <option value="">Select PO (optional)...</option>
                {visiblePurchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNumber} (₹{Number(po.totalAmount).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Payment Amount (₹) *</label>
              <Input
                type="number"
                step="0.01"
                min="1"
                max={outstanding.toFixed(2)}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 15000.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Payment Date *</label>
              <Input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="upi">UPI / QR</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Reference / UTR Number</label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional remarks"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs text-slate-500">
              This records a payment made outside the application; it does not initiate a bank transfer.
            </p>
            <Button type="submit" disabled={saving || wholesalers.length === 0}>
              {saving ? 'Recording Payment...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Card>
      )}

      {/* Payment List */}
      {loading ? (
        <Spinner />
      ) : visiblePayments.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">No wholesale payments recorded yet.</div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Wholesaler</th>
                <th className="px-4 py-3">PO Reference</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference / UTR</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visiblePayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.wholesaler?.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-indigo-600">
                    {p.purchaseOrder ? p.purchaseOrder.orderNumber : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">₹{Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-700">{p.paymentMethod.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{p.referenceNumber || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
