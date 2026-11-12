

// import { useEffect, useState } from 'react';
// import { api } from '../../services/api.js';
// import {
//   Alert,
//   Card,
//   PageHeader,
//   Pagination,
//   Spinner,
//   Button,
// } from '../../components/ui.jsx';

// function getLocalDate() {
//   const date = new Date();
//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const day = String(date.getDate()).padStart(2, '0');

//   return `${year}-${month}-${day}`;
// }

// export default function AuditLogs() {
//   const today = getLocalDate();

//   const [data, setData] = useState(null);
//   const [page, setPage] = useState(1);
//   const [fromDate, setFromDate] = useState(today);
//   const [toDate, setToDate] = useState(today);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (!fromDate || !toDate) return;

//     if (fromDate > toDate) {
//       setError('From Date cannot be later than To Date.');
//       setData(null);
//       return;
//     }

//     let cancelled = false;

//     const loadLogs = async () => {
//       setLoading(true);
//       setError('');

//       try {
//         // Convert selected local calendar dates into exact date boundaries.
//         const [fy, fm, fd] = fromDate.split('-').map(Number);
//         const [ty, tm, td] = toDate.split('-').map(Number);

//         const start = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
//         const end = new Date(ty, tm - 1, td + 1, 0, 0, 0, 0);

//         const query = new URLSearchParams({
//           page: String(page),
//           pageSize: '25',
//           from: start.toISOString(),
//           to: end.toISOString(),
//         });

//         const result = await api.get(`/admin/audit-logs?${query}`);

//         if (!cancelled) {
//           setData(result);
//         }
//       } catch (e) {
//         if (!cancelled) {
//           setError(e.message || 'Unable to load audit logs.');
//           setData(null);
//         }
//       } finally {
//         if (!cancelled) {
//           setLoading(false);
//         }
//       }
//     };

//     loadLogs();

//     return () => {
//       cancelled = true;
//     };
//   }, [page, fromDate, toDate]);

//   const handleFromDate = (value) => {
//     setFromDate(value);
//     setPage(1);
//   };

//   const handleToDate = (value) => {
//     setToDate(value);
//     setPage(1);
//   };

//   const showToday = () => {
//     const currentDate = getLocalDate();
//     setFromDate(currentDate);
//     setToDate(currentDate);
//     setPage(1);
//   };

//   return (
//     <div className="space-y-5">
//       <PageHeader
//         title="Audit Logs"
//         subtitle="View administrative activities and previous history."
//       />

//       {/* Date range filters */}
//       <Card className="space-y-4">
//         <div className="flex flex-wrap items-end justify-between gap-4">
//           <div>
//             <h3 className="font-semibold text-slate-900">
//               Filter Audit History
//             </h3>
//             <p className="mt-1 text-sm text-slate-500">
//               Select a date range to view recorded activities.
//             </p>
//           </div>

//           <Button variant="secondary" onClick={showToday}>
//             Today
//           </Button>
//         </div>

//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//           <div>
//             <label
//               htmlFor="audit-from-date"
//               className="mb-1.5 block text-sm font-medium text-slate-700"
//             >
//               From Date
//             </label>

//             <input
//               id="audit-from-date"
//               type="date"
//               value={fromDate}
//               max={toDate || undefined}
//               onChange={(e) => handleFromDate(e.target.value)}
//               className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//             />
//           </div>

//           <div>
//             <label
//               htmlFor="audit-to-date"
//               className="mb-1.5 block text-sm font-medium text-slate-700"
//             >
//               To Date
//             </label>

//             <input
//               id="audit-to-date"
//               type="date"
//               value={toDate}
//               min={fromDate || undefined}
//               max={today}
//               onChange={(e) => handleToDate(e.target.value)}
//               className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//             />
//           </div>
//         </div>

//         <p className="text-xs text-slate-500">
//           Showing activities from {fromDate} to {toDate}.
//         </p>
//       </Card>

//       {error && <Alert>{error}</Alert>}

//       {loading && !data && <Spinner />}

//       {loading && data && (
//         <p className="text-sm text-slate-500">Updating audit history...</p>
//       )}

//       {!loading && data && (
//         <>
//           <Card className="overflow-x-auto p-0">
//             <table className="min-w-full text-sm">
//               <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
//                 <tr>
//                   <th className="px-4 py-3">When</th>
//                   <th className="px-4 py-3">Actor</th>
//                   <th className="px-4 py-3">Action</th>
//                   <th className="px-4 py-3">Entity</th>
//                   <th className="px-4 py-3">Details</th>
//                 </tr>
//               </thead>

//               <tbody className="divide-y divide-slate-100">
//                 {data.items.map((log) => (
//                   <tr key={log.id} className="align-top">
//                     <td className="whitespace-nowrap px-4 py-3">
//                       {new Date(log.createdAt).toLocaleString()}
//                     </td>

//                     <td className="px-4 py-3">
//                       {log.actor ? log.actor.name : 'System'}
//                     </td>

//                     <td className="px-4 py-3 font-mono text-xs">
//                       {log.action}
//                     </td>

//                     <td className="px-4 py-3">
//                       {log.entityType}{' '}
//                       {log.entityId ? `#${log.entityId}` : ''}
//                     </td>

//                     <td className="max-w-md break-words px-4 py-3 font-mono text-xs text-slate-500">
//                       {log.meta ? JSON.stringify(log.meta) : ''}
//                     </td>
//                   </tr>
//                 ))}

//                 {data.items.length === 0 && (
//                   <tr>
//                     <td
//                       colSpan={5}
//                       className="px-4 py-10 text-center text-slate-500"
//                     >
//                       No audit logs found for this date range.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </Card>

//           <Pagination
//             page={data.page}
//             pageSize={data.pageSize}
//             total={data.total}
//             onPage={setPage}
//           />
//         </>
//       )}
//     </div>
//   );
// }


import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import {
  Alert,
  Card,
  PageHeader,
  Pagination,
  Spinner,
} from '../../components/ui.jsx';

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function AuditLogs() {
  const today = getLocalDate();

  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fromDate || !toDate) return;

    if (fromDate > toDate) {
      setError('From Date cannot be later than To Date.');
      setData(null);
      return;
    }

    let cancelled = false;

    const loadLogs = async () => {
      setLoading(true);
      setError('');

      try {
        const [fy, fm, fd] = fromDate.split('-').map(Number);
        const [ty, tm, td] = toDate.split('-').map(Number);

        const start = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
        const end = new Date(ty, tm - 1, td + 1, 0, 0, 0, 0);

        const query = new URLSearchParams({
          page: String(page),
          pageSize: '25',
          from: start.toISOString(),
          to: end.toISOString(),
        });

        const result = await api.get(`/admin/audit-logs?${query}`);

        if (!cancelled) {
          setData(result);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Unable to load audit logs.');
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [page, fromDate, toDate]);

  const handleFromDate = (value) => {
    setFromDate(value);
    setPage(1);
  };

  const handleToDate = (value) => {
    setToDate(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Audit Logs"
          subtitle="View administrative activities and previous history."
        />

        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label
              htmlFor="audit-from-date"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              From Date
            </label>
            <input
              id="audit-from-date"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => handleFromDate(e.target.value)}
              className="w-36 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="audit-to-date"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              To Date
            </label>
            <input
              id="audit-to-date"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              max={today}
              onChange={(e) => handleToDate(e.target.value)}
              className="w-36 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading && !data && <Spinner />}

      {loading && data && (
        <p className="text-sm text-slate-500">
          Updating audit history...
        </p>
      )}

      {!loading && data && (
        <>
          <Card className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.items.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      {log.actor ? log.actor.name : 'System'}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs">
                      {log.action}
                    </td>

                    <td className="px-4 py-3">
                      {log.entityType}{' '}
                      {log.entityId ? `#${log.entityId}` : ''}
                    </td>

                    <td className="max-w-md break-words px-4 py-3 font-mono text-xs text-slate-500">
                      {log.meta ? JSON.stringify(log.meta) : ''}
                    </td>
                  </tr>
                ))}

                {data.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No audit logs found for this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
}
