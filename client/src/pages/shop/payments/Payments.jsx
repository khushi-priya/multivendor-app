


// import { useEffect, useMemo, useState } from 'react';
// import { api } from '../../../services/api.js';
// import { Alert, Card, Spinner } from '../../../components/ui.jsx';

// export default function ShopPayments() {
//   const [payments, setPayments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);
//   const [reconcilingId, setReconcilingId] = useState(null);

//   const [showDateFilter, setShowDateFilter] = useState(false);
//   const [fromDate, setFromDate] = useState('');
//   const [toDate, setToDate] = useState('');
//   const [appliedFromDate, setAppliedFromDate] = useState('');
//   const [appliedToDate, setAppliedToDate] = useState('');

//   const loadPayments = () => {
//     setLoading(true);
//     api
//       .get('/shop/payments')
//       .then((res) => setPayments(res.items || []))
//       .catch((err) => setError(err.message))
//       .finally(() => setLoading(false));
//   };

//   useEffect(() => {
//     loadPayments();
//   }, []);

//   const handleReconcile = async (paymentId) => {
//     setReconcilingId(paymentId);
//     setError(null);
//     setSuccess(null);

//     try {
//       await api.post(`/shop/payments/${paymentId}/reconcile-cod`, {
//         notes: 'Reconciled cash at register',
//       });

//       setSuccess('Cash on delivery collection successfully reconciled.');
//       loadPayments();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setReconcilingId(null);
//     }
//   };

//   // Filter payments using the selected date range.
//   const filteredPayments = useMemo(() => {
//     return payments.filter((payment) => {
//       const paymentDate = payment.createdAt || payment.updatedAt;

//       if (!paymentDate) return false;

//       const date = new Date(paymentDate);

//       if (Number.isNaN(date.getTime())) return false;

//       // Compare local calendar dates to avoid timezone issues.
//       const paymentDay = [
//         date.getFullYear(),
//         String(date.getMonth() + 1).padStart(2, '0'),
//         String(date.getDate()).padStart(2, '0'),
//       ].join('-');

//       if (appliedFromDate && paymentDay < appliedFromDate) return false;
//       if (appliedToDate && paymentDay > appliedToDate) return false;

//       return true;
//     });
//   }, [payments, appliedFromDate, appliedToDate]);

//   const applyDateFilter = () => {
//     if (fromDate && toDate && fromDate > toDate) {
//       setError('From Date cannot be later than To Date.');
//       return;
//     }

//     setError(null);
//     setAppliedFromDate(fromDate);
//     setAppliedToDate(toDate);
//     setShowDateFilter(false);
//   };

//   const clearDateFilter = () => {
//     setFromDate('');
//     setToDate('');
//     setAppliedFromDate('');
//     setAppliedToDate('');
//     setError(null);
//     setShowDateFilter(false);
//   };

//   const isDateFilterActive = appliedFromDate || appliedToDate;

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">
//             Payments & COD Reconciliation
//           </h1>
//           <p className="mt-1 text-sm text-slate-600">
//             Track customer payments across Razorpay and Cash on Delivery.
//             Reconcile collected physical cash with your register.
//           </p>
//         </div>

//         <div className="relative flex justify-end">
//           <button
//             type="button"
//             onClick={() => setShowDateFilter((prev) => !prev)}
//             title="Filter payments by date"
//             aria-label="Filter payments by date"
//             className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition ${
//               isDateFilterActive
//                 ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
//                 : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
//             }`}
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-4 w-4"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="2"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <rect x="3" y="4" width="18" height="18" rx="2" />
//               <path d="M16 2v4M8 2v4M3 10h18" />
//             </svg>
//             <span>{isDateFilterActive ? 'Date Filter Active' : 'Date Filter'}</span>
//           </button>

//           {showDateFilter && (
//             <div className="absolute right-0 top-12 z-20 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
//               <div className="mb-3 flex items-center justify-between">
//                 <h3 className="text-sm font-semibold text-slate-900">
//                   Filter by Date
//                 </h3>
//                 <button
//                   type="button"
//                   onClick={() => setShowDateFilter(false)}
//                   className="text-lg leading-none text-slate-400 hover:text-slate-700"
//                   aria-label="Close date filter"
//                 >
//                   ×
//                 </button>
//               </div>

             
// <div className="space-y-3">
//   <div>
//     <h1 className="text-2xl font-bold text-slate-900">
//       Payments & COD Reconciliation
//     </h1>
//     <p className="mt-1 text-sm text-slate-600">
//       Track customer payments across Razorpay and Cash on Delivery.
//       Reconcile collected physical cash with your register.
//     </p>
//   </div>

//   <div className="relative flex justify-end">
//     <button
//       type="button"
//       onClick={() => setShowDateFilter((prev) => !prev)}
//       className="flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
//     >
//       <span className="text-lg">📅</span>
//       Select Date Range
//     </button>

//     {showDateFilter && (
//       <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
//         <h3 className="mb-3 font-semibold text-slate-900">
//           Filter Payments
//         </h3>

//         <label className="mb-1 block text-xs font-medium text-slate-600">
//           From Date
//         </label>
//         <input
//           type="date"
//           value={fromDate}
//           onChange={(e) => setFromDate(e.target.value)}
//           className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
//         />

//         <label className="mb-1 block text-xs font-medium text-slate-600">
//           To Date
//         </label>
//         <input
//           type="date"
//           min={fromDate || undefined}
//           value={toDate}
//           onChange={(e) => setToDate(e.target.value)}
//           className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
//         />

//         <div className="flex gap-2">
//           <button
//             type="button"
//             onClick={clearDateFilter}
//             className="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold"
//           >
//             Clear
//           </button>
//           <button
//             type="button"
//             onClick={applyDateFilter}
//             className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
//           >
//             Apply
//           </button>
//         </div>
//       </div>
//     )}
//   </div>
// </div>

        
        
      

//       {isDateFilterActive && (
//         <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
//           <span>Showing payments:</span>
//           <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
//             {appliedFromDate || 'All dates'} to {appliedToDate || 'Present'}
//           </span>
//           <button
//             type="button"
//             onClick={clearDateFilter}
//             className="font-semibold text-indigo-600 hover:underline"
//           >
//             Clear filter
//           </button>
//         </div>
//       )}

//       {error && <Alert variant="error">{error}</Alert>}
//       {success && <Alert variant="success">{success}</Alert>}

//       {loading ? (
//         <Spinner />
//       ) : filteredPayments.length === 0 ? (
//         <Card>
//           <div className="py-8 text-center text-sm text-slate-500">
//             {payments.length === 0
//               ? 'No payment transactions recorded yet.'
//               : 'No payments found for the selected date range.'}
//           </div>
//         </Card>
//       ) : (
//         <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
//           <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
//             <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
//               <tr>
//                 <th className="px-4 py-3">Order #</th>
//                 <th className="px-4 py-3">Method</th>
//                 <th className="px-4 py-3">Amount</th>
//                 <th className="px-4 py-3">Payment Status</th>
//                 <th className="px-4 py-3">COD Collection Info</th>
//                 <th className="px-4 py-3">Reconciliation</th>
//                 <th className="px-4 py-3 text-right">Action</th>
//               </tr>
//             </thead>

//             <tbody className="divide-y divide-slate-200">
//               {filteredPayments.map((p) => (
//                 <tr key={p.id} className="hover:bg-slate-50">
//                   <td className="px-4 py-3 font-semibold text-indigo-600">
//                     {p.order?.orderNumber || '-'}
//                   </td>

//                   <td className="px-4 py-3">
//                     <span className="font-semibold uppercase text-slate-800">
//                       {p.paymentMethod}
//                     </span>
//                   </td>

//                   <td className="px-4 py-3 font-bold text-slate-900">
//                     ₹{Number(p.amount).toFixed(2)}
//                   </td>

//                   <td className="px-4 py-3">
//                     <span
//                       className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
//                         p.status === 'paid'
//                           ? 'bg-emerald-100 text-emerald-800'
//                           : p.status === 'refunded'
//                           ? 'bg-purple-100 text-purple-800'
//                           : 'bg-amber-100 text-amber-800'
//                       }`}
//                     >
//                       {p.status.toUpperCase()}
//                     </span>
//                   </td>

//                   <td className="px-4 py-3 text-xs text-slate-600">
//                     {p.paymentMethod === 'cod' ? (
//                       p.codCollectedAt ? (
//                         <div>
//                           <div>
//                             Collected:{' '}
//                             <strong>
//                               ₹{Number(p.codCollectedAmount).toFixed(2)}
//                             </strong>
//                           </div>
//                           <div className="text-slate-400">
//                             By: {p.collector?.name || 'Rider'}
//                           </div>
//                         </div>
//                       ) : (
//                         <span className="italic text-amber-700">
//                           Not collected yet
//                         </span>
//                       )
//                     ) : (
//                       <span className="font-mono text-[11px] text-slate-400">
//                         {p.razorpayPaymentId || 'Online Payment'}
//                       </span>
//                     )}
//                   </td>

//                   <td className="px-4 py-3 text-xs">
//                     {p.paymentMethod === 'cod' ? (
//                       p.codReconciled ? (
//                         <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
//                           ✓ Reconciled ({p.reconciler?.name || 'Admin'})
//                         </span>
//                       ) : (
//                         <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
//                           Pending Reconciliation
//                         </span>
//                       )
//                     ) : (
//                       <span className="text-slate-400">N/A (Gateway)</span>
//                     )}
//                   </td>

//                   <td className="px-4 py-3 text-right">
//                     {p.paymentMethod === 'cod' && !p.codReconciled && (
//                       <button
//                         type="button"
//                         disabled={reconcilingId === p.id}
//                         onClick={() => handleReconcile(p.id)}
//                         className="whitespace-nowrap rounded bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
//                       >
//                         {reconcilingId === p.id
//                           ? 'Reconciling...'
//                           : 'Reconcile Cash'}
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


import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Alert, Card, Spinner } from '../../../components/ui.jsx';

export default function ShopPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [reconcilingId, setReconcilingId] = useState(null);

  const [showDateFilter, setShowDateFilter] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const canReconcile = user?.shop?.role === 'shop_owner' ||
    (user?.permissions || []).includes('payments.reconcile');

  const loadPayments = () => {
    setLoading(true);

    api
      .get('/shop/payments')
      .then((res) => setPayments(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleReconcile = async (paymentId) => {
    setReconcilingId(paymentId);
    setError(null);
    setSuccess(null);

    try {
      await api.post(`/shop/payments/${paymentId}/reconcile-cod`, {
        notes: 'Reconciled cash at register',
      });

      setSuccess('Cash on delivery collection successfully reconciled.');
      loadPayments();
    } catch (err) {
      setError(err.message);
    } finally {
      setReconcilingId(null);
    }
  };

  // Filter payments according to the applied date range.
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const paymentDate = payment.createdAt || payment.updatedAt;

      if (!paymentDate) return false;

      const date = new Date(paymentDate);

      if (Number.isNaN(date.getTime())) return false;

      const paymentDay = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');

      if (appliedFromDate && paymentDay < appliedFromDate) {
        return false;
      }

      if (appliedToDate && paymentDay > appliedToDate) {
        return false;
      }

      return true;
    });
  }, [payments, appliedFromDate, appliedToDate]);

  const applyDateFilter = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setError('From Date cannot be later than To Date.');
      return;
    }

    setError(null);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setShowDateFilter(false);
  };

  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
    setError(null);
    setShowDateFilter(false);
  };

  const isDateFilterActive = Boolean(appliedFromDate || appliedToDate);

  return (
    <div className="space-y-6">

      {/* Page Heading and Calendar Button */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Payments & COD Reconciliation
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Track customer payments across Razorpay and Cash on Delivery.
            Reconcile collected physical cash with your register.
          </p>
        </div>

        {/* Calendar Button */}
        <div className="relative flex justify-end">
          <button
            type="button"
            onClick={() => setShowDateFilter((prev) => !prev)}
            title="Filter payments by date"
            aria-label="Filter payments by date"
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition ${
              isDateFilterActive
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>

            <span>
              {isDateFilterActive ? 'Date Filter Active' : 'Select Date Range'}
            </span>
          </button>

          {/* Date Range Popup */}
          {showDateFilter && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">

              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Filter Payments
                </h3>

                <button
                  type="button"
                  onClick={() => setShowDateFilter(false)}
                  className="text-xl leading-none text-slate-400 hover:text-slate-700"
                  aria-label="Close date filter"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    From Date
                  </label>

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    To Date
                  </label>

                  <input
                    type="date"
                    min={fromDate || undefined}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={clearDateFilter}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={applyDateFilter}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Applied Date Range */}
      {isDateFilterActive && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>Showing payments:</span>

          <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
            {appliedFromDate || 'All dates'} to {appliedToDate || 'Present'}
          </span>

          <button
            type="button"
            onClick={clearDateFilter}
            className="font-semibold text-indigo-600 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Payments Table */}
      {loading ? (
        <Spinner />
      ) : filteredPayments.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            {payments.length === 0
              ? 'No payment transactions recorded yet.'
              : 'No payments found for the selected date range.'}
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">

            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3">COD Collection Info</th>
                <th className="px-4 py-3">Reconciliation</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">

                  <td className="px-4 py-3 font-semibold text-indigo-600">
                    {p.order?.orderNumber || '-'}
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-semibold uppercase text-slate-800">
                      {p.paymentMethod}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-bold text-slate-900">
                    ₹{Number(p.amount).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'refunded'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-600">
                    {p.paymentMethod === 'cod' ? (
                      p.codCollectedAt ? (
                        <div>
                          <div>
                            Collected:{' '}
                            <strong>
                              ₹{Number(p.codCollectedAmount).toFixed(2)}
                            </strong>
                          </div>

                          <div className="text-slate-400">
                            By: {p.collector?.name || 'Rider'}
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-amber-700">
                          Not collected yet
                        </span>
                      )
                    ) : (
                      <span className="font-mono text-[11px] text-slate-400">
                        {p.razorpayPaymentId || 'Online Payment'}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {p.paymentMethod === 'cod' ? (
                      p.codReconciled ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          ✓ Reconciled ({p.reconciler?.name || 'Admin'})
                        </span>
                      ) : (
                        <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                          {p.codCollectedAt ? 'Pending Reconciliation' : 'Awaiting Delivery Collection'}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">N/A (Gateway)</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {canReconcile && p.paymentMethod === 'cod' && p.codCollectedAt && !p.codReconciled && (
                      <button
                        type="button"
                        disabled={reconcilingId === p.id}
                        onClick={() => handleReconcile(p.id)}
                        className="whitespace-nowrap rounded bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {reconcilingId === p.id
                          ? 'Reconciling...'
                          : 'Reconcile Cash'}
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
