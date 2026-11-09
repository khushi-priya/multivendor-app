import { useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Card, Spinner } from '../../../components/ui.jsx';

export default function ShopCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/shop/customers')
      .then((res) => setCustomers(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Base</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review buyers who have placed orders with your shop, their total order counts, and lifetime purchase value.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : customers.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">No customers have ordered from your shop yet.</div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Orders Placed</th>
                <th className="px-4 py-3">Lifetime Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.map((c, i) => (
                <tr key={c.id || i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.orderCount} orders</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">₹{Number(c.totalSpent).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
