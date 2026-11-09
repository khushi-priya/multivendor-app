import { useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Card, Spinner } from '../../../components/ui.jsx';

export default function ShopRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/shop/refunds')
      .then((res) => setRefunds(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Refunded Transactions</h1>
        <p className="mt-1 text-sm text-slate-600">History of customer refunds processed for your shop.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : refunds.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">No refunds recorded yet.</div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Refund Amount</th>
                <th className="px-4 py-3">Original Reason</th>
                <th className="px-4 py-3">Date Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {refunds.map((ref) => (
                <tr key={ref.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-indigo-600">{ref.order?.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-900">{ref.customer?.name} ({ref.customer?.phone})</td>
                  <td className="px-4 py-3 font-bold text-rose-600">₹{Number(ref.refundAmount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{ref.reason}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(ref.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
