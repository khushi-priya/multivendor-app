import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { Alert, Card, PageHeader, Pagination, Spinner } from '../../components/ui.jsx';

export default function AuditLogs() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/admin/audit-logs?page=${page}&pageSize=25`).then(setData).catch((e) => setError(e.message));
  }, [page]);

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Sensitive administrative actions, newest first." />
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && (
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
                {data.items.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{l.actor ? l.actor.name : 'System'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                    <td className="px-4 py-3">
                      {l.entityType} {l.entityId ? `#${l.entityId}` : ''}
                    </td>
                    <td className="max-w-md break-words px-4 py-3 font-mono text-xs text-slate-500">{l.meta ? JSON.stringify(l.meta) : ''}</td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nothing logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
