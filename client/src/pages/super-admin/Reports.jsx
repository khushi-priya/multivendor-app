import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { Alert, Card, Spinner } from '../../components/ui.jsx';

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/admin/reports')
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Reports & Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          Aggregated statistics computed directly from verified database records.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {data && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Retail Sales</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                ₹{Number(data.summary?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="mt-1 text-xs text-slate-500">Gross revenue of paid orders</p>
            </Card>

            <Card>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform Commission Revenue</div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-600">
                ₹{Number(data.summary?.totalCommission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="mt-1 text-xs text-slate-500">Earned platform service fees</p>
            </Card>

            <Card>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Platform Orders</div>
              <div className="mt-2 text-2xl font-extrabold text-indigo-600">
                {data.summary?.totalOrders || 0}
              </div>
              <p className="mt-1 text-xs text-slate-500">Orders placed across all shops</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Orders by Status */}
            <Card title="Orders by Status">
              <div className="space-y-3">
                {Object.entries(data.ordersByStatus || {}).length === 0 ? (
                  <p className="text-sm text-slate-500">No order status data available.</p>
                ) : (
                  Object.entries(data.ordersByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
                      <span className="capitalize text-slate-700">{status.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-slate-900">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Top Shops by Revenue */}
            <Card title="Top Performing Shops">
              <div className="space-y-3">
                {(!data.topShops || data.topShops.length === 0) ? (
                  <p className="text-sm text-slate-500">No shop sales recorded yet.</p>
                ) : (
                  data.topShops.map((shop, idx) => (
                    <div key={shop.shopId} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
                      <div>
                        <span className="mr-2 text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <span className="font-medium text-slate-900">{shop.shopName}</span>
                        <span className="ml-2 text-xs text-slate-500">({shop.orderCount} orders)</span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        ₹{Number(shop.totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
