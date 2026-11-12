import { useEffect, useState } from "react";
import { api } from "../../../services/api.js";
import { Alert, Card, Spinner } from "../../../components/ui.jsx";

export default function ShopDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/shop/delivery")
      .then((res) => setDeliveries(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s) => {
    const colors = {
      delivered: "bg-emerald-100 text-emerald-800",
      out_for_delivery: "bg-amber-100 text-amber-800",
      picked_up: "bg-indigo-100 text-indigo-800",
      assigned: "bg-sky-100 text-sky-800",
      failed: "bg-rose-100 text-rose-800",
    };
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[s] || "bg-slate-100 text-slate-700"}`}
      >
        {s.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Delivery Management
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor all assigned deliveries and progress updates.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : deliveries.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            No deliveries assigned yet.
          </div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Delivery Associate</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned At</th>
                <th className="px-4 py-3">Delivered At</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {deliveries.map((del) => (
                <tr key={del.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-indigo-600">
                    {del.order?.orderNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {del.deliveryUser?.name || "—"}
                    {del.deliveryUser?.phone
                      ? ` (${del.deliveryUser.phone})`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {del.order?.customer?.name || "—"}
                    {del.order?.customer?.phone
                      ? ` (${del.order.customer.phone})`
                      : ""}
                  </td>
                  <td className="px-4 py-3">{statusBadge(del.status)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(del.assignedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {del.deliveredAt
                      ? new Date(del.deliveredAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {del.notes || "—"}
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
