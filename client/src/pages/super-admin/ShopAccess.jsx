import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { Alert, Badge, Button, Card, Field, PageHeader, Select, Spinner } from '../../components/ui.jsx';

// Controls which wholesalers each shop may access (the wholesaler_shop_access table).
export default function ShopAccess() {
  const [shops, setShops] = useState(null);
  const [shopId, setShopId] = useState('');
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/admin/shops?pageSize=100').then((d) => setShops(d.items)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!shopId) {
      setRows(null);
      return;
    }
    setRows(null);
    setNotice('');
    api
      .get(`/admin/shops/${shopId}/wholesalers`)
      .then((d) => {
        setRows(d.items);
        setSelected(new Set(d.items.filter((w) => w.authorized).map((w) => w.id)));
      })
      .catch((e) => setError(e.message));
  }, [shopId]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await api.put(`/admin/shops/${shopId}/wholesalers`, { wholesalerIds: [...selected] });
      setNotice(`Saved. Added ${r.added}, removed ${r.removed}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Shop–Wholesaler Access" subtitle="Choose which wholesalers each shop is authorized to work with." />
      <div className="max-w-2xl space-y-4">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}
        <Card>
          <Field label="Shop">
            {!shops ? (
              <Spinner />
            ) : (
              <Select value={shopId} onChange={(e) => setShopId(e.target.value)}>
                <option value="">Select a shop…</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Card>
        {shopId && !rows && <Spinner />}
        {rows && (
          <Card className="space-y-3">
            {rows.length === 0 && <p className="text-sm text-slate-500">No wholesalers exist yet. Add some under Wholesalers.</p>}
            {rows.map((w) => (
              <label key={w.id} className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggle(w.id)} />
                <span>{w.name}</span>
                {w.status !== 'active' && <Badge>inactive</Badge>}
              </label>
            ))}
            {rows.length > 0 && (
              <Button onClick={save} loading={busy}>
                Save access
              </Button>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
