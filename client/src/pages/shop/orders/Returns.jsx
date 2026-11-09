import { useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Button, Card, Spinner } from '../../../components/ui.jsx';

export default function ShopReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const loadReturns = () => {
    setLoading(true);
    api
      .get('/shop/returns')
      .then((res) => setReturns(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleUpdateReturn = async (id, status, refundAmount) => {
    setProcessingId(id);
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/shop/returns/${id}`, { status, refundAmount });
      setSuccess(`Return updated to "${status.replace(/_/g, ' ')}".`);
      loadReturns();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadge = (s) => {
    const colors = {
      requested: 'bg-amber-100 text-amber-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-rose-100 text-rose-800',
      item_received: 'bg-purple-100 text-purple-800',
      refunded: 'bg-emerald-100 text-emerald-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[s] || 'bg-slate-100 text-slate-700'}`}>
        {s.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Returns Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review customer return requests, approve/reject them, receive items back to stock, and process refunds.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading ? (
        <Spinner />
      ) : returns.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">No return requests submitted for your shop.</div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Refund Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-indigo-600">{ret.order?.orderNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{ret.customer?.name} ({ret.customer?.phone})</td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{ret.reason}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">₹{Number(ret.refundAmount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{statusBadge(ret.status)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {ret.status === 'requested' && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === ret.id}
                          onClick={() => handleUpdateReturn(ret.id, 'approved', ret.refundAmount)}
                          className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={processingId === ret.id}
                          onClick={() => handleUpdateReturn(ret.id, 'rejected')}
                          className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {ret.status === 'approved' && (
                      <button
                        type="button"
                        disabled={processingId === ret.id}
                        onClick={() => handleUpdateReturn(ret.id, 'item_received')}
                        className="rounded bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                      >
                        Receive Item (Restores Stock)
                      </button>
                    )}
                    {ret.status === 'item_received' && (
                      <button
                        type="button"
                        disabled={processingId === ret.id}
                        onClick={() => handleUpdateReturn(ret.id, 'refunded', ret.refundAmount)}
                        className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Complete Refund
                      </button>
                    )}
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
