

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
  fieldError,
} from '../../components/ui.jsx';

const empty = {
  name: '',
  contactEmail: '',
  contactPhone: '',
  gstNumber: '',
  address: '',
};

export default function Wholesalers() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(empty);
  const [details, setDetails] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await api.get('/admin/wholesalers');
      setItems(data.items || []);
    } catch (e) {
      setError(e.message || 'Unable to load wholesalers.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (e) => {
    setForm((previous) => ({
      ...previous,
      [key]: e.target.value,
    }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setDetails({});
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      name: item.name || '',
      contactEmail: item.contactEmail || '',
      contactPhone: item.contactPhone || '',
      gstNumber: item.gstNumber || '',
      address: item.address || '',
    });
    setDetails({});
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busy) return;

    setModalOpen(false);
    setEditing(null);
    setForm(empty);
    setDetails({});
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();

    setBusy(true);
    setError('');
    setDetails({});

    try {
      if (editing) {
        await api.patch(`/admin/wholesalers/${editing}`, form);
      } else {
        await api.post('/admin/wholesalers', form);
      }

      setModalOpen(false);
      setEditing(null);
      setForm(empty);
      setDetails({});

      await load();
    } catch (err) {
      setError(err.message || 'Unable to save wholesaler.');
      setDetails(err.details || {});
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (wholesaler) => {
    const next =
      wholesaler.status === 'active' ? 'inactive' : 'active';

    if (
      !window.confirm(
        `${next === 'inactive' ? 'Deactivate' : 'Activate'} ${wholesaler.name}?`
      )
    ) {
      return;
    }

    setError('');

    try {
      await api.patch(`/admin/wholesalers/${wholesaler.id}`, {
        status: next,
      });

      await load();
    } catch (err) {
      setError(err.message || 'Unable to update wholesaler status.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Wholesalers"
          subtitle="Manage wholesalers and their shop access."
        />

        <Button onClick={openAdd}>
          + Add Wholesaler
        </Button>
      </div>

      {error && !modalOpen && <Alert>{error}</Alert>}

      {items === null ? (
        <Spinner />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">GST number</th>
                <th className="px-4 py-3">Shops</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No wholesalers found. Click Add Wholesaler to create one.
                  </td>
                </tr>
              )}

              {items.map((wholesaler) => (
                <tr key={wholesaler.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {wholesaler.name}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-600">
                    {wholesaler.contactEmail || '—'}
                    <div>{wholesaler.contactPhone || '—'}</div>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs">
                    {wholesaler.gstNumber || '—'}
                  </td>

                  <td className="px-4 py-3">
                    {wholesaler.shopCount ?? 0}
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        wholesaler.status === 'active'
                          ? 'green'
                          : 'slate'
                      }
                    >
                      {wholesaler.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => openEdit(wholesaler)}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => toggle(wholesaler)}
                      >
                        {wholesaler.status === 'active'
                          ? 'Deactivate'
                          : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add / Edit Wholesaler Popup */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wholesaler-modal-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  id="wholesaler-modal-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {editing ? 'Edit Wholesaler' : 'Add Wholesaler'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter wholesaler details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={busy}
                aria-label="Close popup"
                className="rounded-md px-2 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                &times;
              </button>
            </div>

            {error && <div className="mb-4"><Alert>{error}</Alert></div>}

            <form onSubmit={save} className="space-y-4">
              <Field
                label="Name"
                required
                error={fieldError(details, 'name')}
              >
                <Input
                  value={form.name}
                  onChange={set('name')}
                  required
                  placeholder="Enter wholesaler name"
                />
              </Field>

              <Field
                label="Contact email"
                error={fieldError(details, 'contactEmail')}
              >
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={set('contactEmail')}
                  placeholder="Enter email address"
                />
              </Field>

            <Field
  label="Contact phone"
  error={fieldError(details, 'contactPhone')}
>
  <Input
    type="tel"
    inputMode="numeric"
    value={form.contactPhone}
    onChange={(e) =>
      setForm((previous) => ({
        ...previous,
        contactPhone: e.target.value.replace(/\D/g, ''),
      }))
    }
    maxLength={10}
    placeholder="Enter 10-digit mobile number"
  />
</Field>

              <Field
                label="GST number"
                error={fieldError(details, 'gstNumber')}
                hint="Optional; enter the registered 15-character GSTIN."
              >
                <Input
                  value={form.gstNumber}
                  onChange={set('gstNumber')}
                  maxLength={15}
                  placeholder="Enter GSTIN"
                />
              </Field>

              <Field label="Address">
                <Textarea
                  value={form.address}
                  onChange={set('address')}
                  placeholder="Enter wholesaler address"
                />
              </Field>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={busy}
                >
                  Cancel
                </Button>

                <Button type="submit" loading={busy}>
                  {editing ? 'Save Changes' : 'Add Wholesaler'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
