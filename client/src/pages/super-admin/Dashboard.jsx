import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Button, Card, PageHeader, Spinner } from '../../components/ui.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  const tiles = stats && [
    ['Total shops', stats.shops],
    ['Active shops', stats.activeShops],
    ['Suspended shops', stats.suspendedShops],
    ['Active wholesalers', stats.wholesalers],
    ['Owners awaiting setup', stats.pendingOwners],
  ];

  return (
    <>
      <PageHeader
        title="Super Admin Dashboard"
        actions={
          <Link to="/admin/shops/new">
            <Button>Create Shop</Button>
          </Link>
        }
      />
      {error && <Alert>{error}</Alert>}
      {stats?.partialErrors?.length > 0 && (
        <Alert>Some dashboard figures could not be loaded. Please retry later.</Alert>
      )}
      {!stats && !error && <Spinner />}
      {tiles && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {tiles.map(([label, value]) => (
            <Card key={label}>
              <div className="text-3xl font-semibold text-slate-900">
                {value ?? '—'}
              </div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
