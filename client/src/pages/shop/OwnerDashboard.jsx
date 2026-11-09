import { useEffect, useState } from 'react';
import { Alert, Card, PageHeader, Spinner } from '../../components/ui.jsx';
import { api } from '../../services/api.js';

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/shop/owner-dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <>
      <PageHeader title="Shop Owner Dashboard" subtitle={`Welcome, ${data.owner.name}`} />
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">{data.shop.name}</h2>
        <p className="mt-1 text-sm text-slate-500">Your assigned shop</p>
      </Card>
    </>
  );
}
