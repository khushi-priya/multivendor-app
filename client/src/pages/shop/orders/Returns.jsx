// import { useEffect, useState } from 'react';
// import { api } from '../../../services/api.js';
// import { Alert, Button, Card, Spinner } from '../../../components/ui.jsx';

// export default function ShopReturns() {
//   const [returns, setReturns] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);
//   const [processingId, setProcessingId] = useState(null);

//   const loadReturns = () => {
//     setLoading(true);
//     api
//       .get('/shop/returns')
//       .then((res) => setReturns(res.items || []))
//       .catch((err) => setError(err.message))
//       .finally(() => setLoading(false));
//   };

//   useEffect(() => {
//     loadReturns();
//   }, []);

//   const handleUpdateReturn = async (id, status, refundAmount) => {
//     setProcessingId(id);
//     setError(null);
//     setSuccess(null);
//     try {
//       await api.patch(`/shop/returns/${id}`, { status, refundAmount });
//       setSuccess(`Return updated to "${status.replace(/_/g, ' ')}".`);
//       loadReturns();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const statusBadge = (s) => {
//     const colors = {
//       requested: 'bg-amber-100 text-amber-800',
//       approved: 'bg-blue-100 text-blue-800',
//       rejected: 'bg-rose-100 text-rose-800',
//       item_received: 'bg-purple-100 text-purple-800',
//       refunded: 'bg-emerald-100 text-emerald-800',
//     };
//     return (
//       <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[s] || 'bg-slate-100 text-slate-700'}`}>
//         {s.replace(/_/g, ' ').toUpperCase()}
//       </span>
//     );
//   };

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-slate-900">Returns Management</h1>
//         <p className="mt-1 text-sm text-slate-600">
//           Review customer return requests, approve/reject them, receive items back to stock, and process refunds.
//         </p>
//       </div>

//       {error && <Alert variant="error">{error}</Alert>}
//       {success && <Alert variant="success">{success}</Alert>}

//       {loading ? (
//         <Spinner />
//       ) : returns.length === 0 ? (
//         <Card>
//           <div className="py-8 text-center text-sm text-slate-500">No return requests submitted for your shop.</div>
//         </Card>
//       ) : (
//         <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
//           <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
//             <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
//               <tr>
//                 <th className="px-4 py-3">Order #</th>
//                 <th className="px-4 py-3">Customer</th>
//                 <th className="px-4 py-3">Reason</th>
//                 <th className="px-4 py-3">Refund Amount</th>
//                 <th className="px-4 py-3">Status</th>
//                 <th className="px-4 py-3 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-200">
//               {returns.map((ret) => (
//                 <tr key={ret.id} className="hover:bg-slate-50">
//                   <td className="px-4 py-3 font-semibold text-indigo-600">{ret.order?.orderNumber}</td>
//                   <td className="px-4 py-3 font-medium text-slate-900">{ret.customer?.name} ({ret.customer?.phone})</td>
//                   <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{ret.reason}</td>
//                   <td className="px-4 py-3 font-bold text-slate-900">₹{Number(ret.refundAmount || 0).toFixed(2)}</td>
//                   <td className="px-4 py-3">{statusBadge(ret.status)}</td>
//                   <td className="px-4 py-3 text-right space-x-2">
//                     {ret.status === 'requested' && (
//                       <>
//                         <button
//                           type="button"
//                           disabled={processingId === ret.id}
//                           onClick={() => handleUpdateReturn(ret.id, 'approved', ret.refundAmount)}
//                           className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
//                         >
//                           Approve
//                         </button>
//                         <button
//                           type="button"
//                           disabled={processingId === ret.id}
//                           onClick={() => handleUpdateReturn(ret.id, 'rejected')}
//                           className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
//                         >
//                           Reject
//                         </button>
//                       </>
//                     )}
//                     {ret.status === 'approved' && (
//                       <button
//                         type="button"
//                         disabled={processingId === ret.id}
//                         onClick={() => handleUpdateReturn(ret.id, 'item_received')}
//                         className="rounded bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100"
//                       >
//                         Receive Item (Restores Stock)
//                       </button>
//                     )}
//                     {ret.status === 'item_received' && (
//                       <button
//                         type="button"
//                         disabled={processingId === ret.id}
//                         onClick={() => handleUpdateReturn(ret.id, 'refunded', ret.refundAmount)}
//                         className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
//                       >
//                         Complete Refund
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import { api } from "../../../services/api.js";
import { Alert, Card, Spinner } from "../../../components/ui.jsx";

const STATUS_STYLES = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-rose-100 text-rose-800",
  received: "bg-purple-100 text-purple-800",
  refund_processing: "bg-orange-100 text-orange-800",
  refunded: "bg-emerald-100 text-emerald-800",
};

const formatStatus = (status) =>
  String(status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toFixed(2)}`;

export default function ShopReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const [activeReturn, setActiveReturn] = useState(null);
  const [modalAction, setModalAction] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [notes, setNotes] = useState("");

  const loadReturns = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/shop/returns");
      setReturns(res.items || []);
    } catch (err) {
      setError(err.message || "Unable to load return requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const closeModal = () => {
    setActiveReturn(null);
    setModalAction("");
    setRejectionReason("");
    setRefundReference("");
    setNotes("");
  };

  const openModal = (returnRequest, action) => {
    setActiveReturn(returnRequest);
    setModalAction(action);
    setRejectionReason("");
    setRefundReference("");
    setNotes("");
    setError("");
    setSuccess("");
  };

  const updateReturn = async (returnRequest, status, extra = {}) => {
    setProcessingId(returnRequest.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/shop/returns/${returnRequest.id}`, {
        status,
        ...extra,
      });

      setSuccess(
        `Return ${returnRequest.order?.orderNumber || `#${returnRequest.id}`} updated to ${formatStatus(status)}.`,
      );

      closeModal();
      await loadReturns();
    } catch (err) {
      setError(err.message || "Unable to update return.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleModalSubmit = async (event) => {
    event.preventDefault();

    if (!activeReturn) return;

    if (modalAction === "reject") {
      if (rejectionReason.trim().length < 5) {
        setError("Please enter a rejection reason of at least 5 characters.");
        return;
      }

      await updateReturn(activeReturn, "rejected", {
        rejectionReason: rejectionReason.trim(),
        notes: notes.trim() || undefined,
      });
    }

    if (modalAction === "refund") {
      if (refundReference.trim().length < 4) {
        setError("Enter a valid refund transaction reference.");
        return;
      }

      await updateReturn(activeReturn, "refunded", {
        refundReference: refundReference.trim(),
        notes: notes.trim() || undefined,
      });
    }
  };

  const renderStatus = (status) => (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {formatStatus(status)}
    </span>
  );

  const renderActionButton = (
    label,
    onClick,
    color,
    disabled = false,
  ) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
    >
      {disabled ? "Processing..." : label}
    </button>
  );

  const renderActions = (ret) => {
    const isProcessing = processingId === ret.id;

    switch (ret.status) {
      case "requested":
        return (
          <div className="flex flex-wrap justify-end gap-2">
            {renderActionButton(
              "Approve",
              () => updateReturn(ret, "approved"),
              "bg-blue-50 text-blue-700 hover:bg-blue-100",
              isProcessing,
            )}

            {renderActionButton(
              "Reject",
              () => openModal(ret, "reject"),
              "bg-rose-50 text-rose-700 hover:bg-rose-100",
              isProcessing,
            )}
          </div>
        );

      case "approved":
        return renderActionButton(
          "Mark Item Received",
          () => updateReturn(ret, "received"),
          "bg-purple-50 text-purple-700 hover:bg-purple-100",
          isProcessing,
        );

      case "received":
        return renderActionButton(
          "Start Refund Processing",
          () => updateReturn(ret, "refund_processing"),
          "bg-orange-50 text-orange-700 hover:bg-orange-100",
          isProcessing,
        );

      case "refund_processing":
        return renderActionButton(
          "Complete Refund",
          () => openModal(ret, "refund"),
          "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
          isProcessing,
        );

      case "rejected":
        return <span className="text-xs text-slate-500">Request rejected</span>;

      case "refunded":
        return <span className="text-xs font-semibold text-emerald-700">Refund completed</span>;

      default:
        return <span className="text-xs text-slate-500">No actions available</span>;
    }
  };

  const pendingReturns = returns.filter(
    (ret) => ["requested", "approved"].includes(ret.status),
  ).length;

  const pendingRefunds = returns.filter(
    (ret) => ["received", "refund_processing"].includes(ret.status),
  ).length;

  const completedReturns = returns.filter(
    (ret) => ret.status === "refunded",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Returns Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review customer returns, receive returned products and manage refunds.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReturns}
          disabled={loading}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Pending Returns</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {pendingReturns}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Pending Refunds</p>
          <p className="mt-2 text-2xl font-bold text-orange-600">
            {pendingRefunds}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Completed Refunds</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {completedReturns}
          </p>
        </Card>
      </div>

      {loading ? (
        <Spinner />
      ) : returns.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <p className="font-semibold text-slate-700">
              No return requests found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Customer return requests will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Return Details</th>
                  <th className="px-4 py-3">Refund</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {returns.map((ret) => (
                  <tr key={ret.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-semibold text-indigo-600">
                        {ret.order?.orderNumber || `#${ret.orderId}`}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">
                        {ret.customer?.name || "Customer"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {ret.customer?.phone || "—"}
                      </p>
                    </td>

                    <td className="max-w-xs px-4 py-4">
                      <p className="text-slate-700">{ret.reason || "—"}</p>

                      {ret.items?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {ret.items.map((item) => (
                            <p key={item.id} className="text-xs text-slate-500">
                              {item.orderItem?.productName || "Product"}
                              {" × "}
                              {item.quantity}
                            </p>
                          ))}
                        </div>
                      )}

                      {ret.rejectionReason && (
                        <p className="mt-2 text-xs text-rose-600">
                          Rejection reason: {ret.rejectionReason}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-bold text-slate-900">
                        {formatMoney(ret.refundAmount)}
                      </p>
                      {ret.refundReference && (
                        <p className="mt-1 max-w-32 truncate text-xs text-slate-500">
                          Ref: {ret.refundReference}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      {renderStatus(ret.status)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                      {formatDate(ret.createdAt)}
                    </td>

                    <td className="min-w-48 px-4 py-4 text-right">
                      {renderActions(ret)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {modalAction === "reject"
                    ? "Reject Return Request"
                    : "Complete Refund"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Order {activeReturn.order?.orderNumber || `#${activeReturn.orderId}`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded p-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-5 space-y-4">
              {modalAction === "reject" && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Rejection Reason *
                  </label>
                  <textarea
                    required
                    minLength={5}
                    maxLength={500}
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this return request is being rejected..."
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              )}

              {modalAction === "refund" && (
                <>
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-800">
                      Refund amount
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">
                      {formatMoney(activeReturn.refundAmount)}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Refund Transaction / Receipt Reference *
                    </label>
                    <input
                      required
                      minLength={4}
                      maxLength={255}
                      value={refundReference}
                      onChange={(e) => setRefundReference(e.target.value)}
                      placeholder="Enter bank transaction or refund reference"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Enter the actual refund reference after processing the payment manually.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Internal Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any internal notes..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={processingId === activeReturn.id}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={processingId === activeReturn.id}
                  className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                    modalAction === "reject"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {processingId === activeReturn.id
                    ? "Processing..."
                    : modalAction === "reject"
                      ? "Confirm Rejection"
                      : "Confirm Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
