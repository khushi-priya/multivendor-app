import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Pagination,
  Select,
  Spinner,
} from '../../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const emptyForm = () => ({
  code: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscountAmount: '',
  minimumOrderAmount: '0.00',
  unlimited: false,
  totalUsageLimit: '100',
  perCustomerUsageLimit: '1',
  startDate: today(),
  expiryDate: addDays(today(), 30),
  status: 'active',
});

function statusTone(status) {
  if (status === 'active') return 'green';
  if (status === 'expired') return 'red';
  return 'amber';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function CouponModal({ children, onClose, title, subtitle }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close popup"
            onClick={onClose}
            className="rounded-md px-2 text-2xl leading-none text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </header>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

export default function Coupons() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalRedemptions: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get(
        `/shop/coupons?q=${encodeURIComponent(query)}&status=${status}&page=${page}&pageSize=20`,
      );
      setItems(response.items || []);
      setSummary(response.summary || {});
      setPagination(response.pagination || { page, pageSize: 20, total: 0 });
    } catch (error) {
      setLoadError(error.message || 'Unable to load coupons.');
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const filteredItems = useMemo(() => items, [items]);

  const updateForm = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [field]: field === 'code' ? value.toUpperCase().replace(/\s+/g, '') : value,
      ...(field === 'discountType' && value === 'flat' ? { maxDiscountAmount: '' } : {}),
    }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const openCreate = () => {
    setForm(emptyForm());
    setFieldErrors({});
    setFormError('');
    setDetailLoaded(true);
    setModal({ mode: 'create' });
  };

  const openEdit = async (item) => {
    setModal({ mode: 'edit', id: item.id });
    setModalLoading(true);
    setDetailLoaded(false);
    setFormError('');
    setFieldErrors({});
    try {
      const response = await api.get(`/shop/coupons/${encodeURIComponent(item.id)}`);
      const coupon = response.item;
      setForm({
        code: coupon.code || '',
        discountType: coupon.discountType,
        discountValue: String(coupon.discountValue),
        maxDiscountAmount: coupon.maxDiscountAmount == null ? '' : String(coupon.maxDiscountAmount),
        minimumOrderAmount: String(coupon.minimumOrderAmount ?? '0.00'),
        unlimited: coupon.totalUsageLimit == null,
        totalUsageLimit: coupon.totalUsageLimit == null ? '' : String(coupon.totalUsageLimit),
        perCustomerUsageLimit: String(coupon.perCustomerUsageLimit),
        startDate: coupon.startDate,
        expiryDate: coupon.expiryDate,
        status: coupon.status,
      });
      setDetailLoaded(true);
    } catch (error) {
      setFormError(error.message || 'Unable to load coupon details.');
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setDetailLoaded(false);
    setFormError('');
    setFieldErrors({});
  };

  const saveCoupon = async (event) => {
    event.preventDefault();
    if (!detailLoaded) return;
    if (form.expiryDate < form.startDate) {
      setFieldErrors({ expiryDate: 'Expiry date cannot be earlier than start date.' });
      return;
    }
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
      setFieldErrors({ discountValue: 'Percentage discount cannot exceed 100.' });
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: form.discountValue,
      maxDiscountAmount:
        form.discountType === 'percentage' && form.maxDiscountAmount
          ? form.maxDiscountAmount
          : null,
      minimumOrderAmount: form.minimumOrderAmount || '0.00',
      totalUsageLimit: form.unlimited ? null : Number(form.totalUsageLimit),
      perCustomerUsageLimit: Number(form.perCustomerUsageLimit),
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      status: form.status,
    };

    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      if (modal.mode === 'edit') {
        await api.patch(`/shop/coupons/${encodeURIComponent(modal.id)}`, payload);
      } else {
        await api.post('/shop/coupons', payload);
      }
      setModal(null);
      setNotice({
        kind: 'success',
        text: modal.mode === 'edit' ? 'Coupon updated.' : 'Coupon created.',
      });
      await loadCoupons();
    } catch (error) {
      setFormError(error.message || 'Unable to save coupon.');
      setFieldErrors(error.details || {});
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item) => {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';
    setBusyId(item.id);
    setNotice(null);
    try {
      await api.patch(`/shop/coupons/${encodeURIComponent(item.id)}/status`, {
        status: nextStatus,
      });
      setNotice({ kind: 'success', text: `${item.code} is now ${nextStatus}.` });
      await loadCoupons();
    } catch (error) {
      setNotice({ kind: 'error', text: error.message || 'Unable to update coupon status.' });
    } finally {
      setBusyId(null);
    }
  };

  const deleteCoupon = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await api.delete(`/shop/coupons/${encodeURIComponent(deleteTarget.id)}`);
      setDeleteTarget(null);
      setNotice({ kind: 'success', text: `${deleteTarget.code} deleted.` });
      await loadCoupons();
    } catch (error) {
      setDeleteTarget(null);
      setNotice({ kind: 'error', text: error.message || 'Unable to delete coupon.' });
    } finally {
      setBusyId(null);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const summaryCards = [
    ['Total Coupons', summary.totalCoupons || 0],
    ['Active Coupons', summary.activeCoupons || 0],
    ['Expired Coupons', summary.expiredCoupons || 0],
    ['Total Redemptions', summary.totalRedemptions || 0],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coupon Management"
        subtitle="Create and manage discount coupons for your shop."
        actions={<Button onClick={openCreate}>Create Coupon</Button>}
      />

      {notice && <Alert kind={notice.kind}>{notice.text}</Alert>}
      {loadError && <Alert>{loadError}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <form onSubmit={submitSearch} className="flex flex-1 gap-2">
            <Field label="Search by coupon code">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search code"
              />
            </Field>
            <Button type="submit" className="self-end">Search</Button>
          </form>
          <Field label="Status">
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </Select>
          </Field>
        </div>

        {loading ? (
          <Spinner label="Loading coupons…" />
        ) : filteredItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
            <p className="font-medium text-slate-700">No coupons found</p>
            <p className="mt-1 text-sm text-slate-500">Create a coupon to offer a discount in your shop.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Coupon Code</th>
                  <th className="px-3 py-3">Discount</th>
                  <th className="px-3 py-3">Usage</th>
                  <th className="px-3 py-3">Validity Period</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-semibold text-slate-900">{item.code}</td>
                    <td className="px-3 py-3">
                      {item.discountType === 'percentage'
                        ? `${Number(item.discountValue)}%`
                        : `₹${Number(item.discountValue).toFixed(2)}`}
                      {item.discountType === 'percentage' && item.maxDiscountAmount != null && (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Up to ₹{Number(item.maxDiscountAmount).toFixed(2)}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {item.discountType === 'percentage' ? 'Percentage' : 'Flat'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {item.usedCount} / {item.totalUsageLimit == null ? 'Unlimited' : item.totalUsageLimit}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {item.remainingRedemptions == null
                          ? 'Unlimited remaining'
                          : `${item.remainingRedemptions} remaining`}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Limit {item.perCustomerUsageLimit} per customer
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatDate(item.startDate)} – {formatDate(item.expiryDate)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(item.displayStatus)}>
                        {item.displayStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="px-2.5 py-1.5 text-xs"
                          onClick={() => openEdit(item)}
                          disabled={busyId === item.id}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-2.5 py-1.5 text-xs"
                          onClick={() => toggleStatus(item)}
                          loading={busyId === item.id}
                        >
                          {item.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="danger"
                          className="px-2.5 py-1.5 text-xs"
                          onClick={() => setDeleteTarget(item)}
                          disabled={busyId === item.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPage={setPage}
          />
        )}
      </Card>

      {modal && (
        <CouponModal
          title={modal.mode === 'edit' ? 'Edit Coupon' : 'Create Coupon'}
          subtitle={modal.mode === 'edit' ? 'Update your coupon details.' : 'Add a discount coupon for your shop.'}
          onClose={closeModal}
        >
          {modalLoading ? (
            <Spinner label="Loading coupon details…" />
          ) : (
            <form onSubmit={saveCoupon} className="space-y-4">
              {formError && <Alert>{formError}</Alert>}
              <Field label="Coupon Code" required error={fieldErrors.code?.[0]}>
                <Input
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Z0-9]+(-[A-Z0-9]+)*"
                  value={form.code}
                  onChange={updateForm('code')}
                  placeholder="WELCOME10"
                  disabled={saving}
                />
              </Field>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">Discount Type</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['percentage', 'Percentage Discount (%)'],
                    ['flat', 'Flat Discount (₹)'],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-md border p-3 text-sm ${
                        form.discountType === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        className="mr-2"
                        type="radio"
                        name="discountType"
                        value={value}
                        checked={form.discountType === value}
                        onChange={updateForm('discountType')}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={form.discountType === 'percentage' ? 'Discount Percentage (%)' : 'Flat Discount Amount (₹)'}
                  required
                  error={fieldErrors.discountValue?.[0]}
                >
                  <Input
                    type="number"
                    required
                    min="0.01"
                    max={form.discountType === 'percentage' ? '100' : undefined}
                    step="0.01"
                    value={form.discountValue}
                    onChange={updateForm('discountValue')}
                  />
                </Field>
                {form.discountType === 'percentage' && (
                  <Field label="Maximum Discount Amount (₹)" error={fieldErrors.maxDiscountAmount?.[0]}>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.maxDiscountAmount}
                      onChange={updateForm('maxDiscountAmount')}
                    />
                  </Field>
                )}
                <Field label="Minimum Order Amount (₹)" error={fieldErrors.minimumOrderAmount?.[0]}>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minimumOrderAmount}
                    onChange={updateForm('minimumOrderAmount')}
                  />
                </Field>
                <Field label="Per-Customer Usage Limit" required error={fieldErrors.perCustomerUsageLimit?.[0]}>
                  <Input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={form.perCustomerUsageLimit}
                    onChange={updateForm('perCustomerUsageLimit')}
                  />
                </Field>
              </div>

              <Field label="Total Redemption Limit" error={fieldErrors.totalUsageLimit?.[0]}>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.totalUsageLimit}
                  disabled={form.unlimited}
                  required={!form.unlimited}
                  onChange={updateForm('totalUsageLimit')}
                />
                <span className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.unlimited}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        unlimited: event.target.checked,
                        totalUsageLimit: event.target.checked ? '' : current.totalUsageLimit || '100',
                      }))
                    }
                  />
                  Unlimited total redemptions
                </span>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start Date" required error={fieldErrors.startDate?.[0]}>
                  <Input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={updateForm('startDate')}
                  />
                </Field>
                <Field label="Expiry Date" required error={fieldErrors.expiryDate?.[0]}>
                  <Input
                    type="date"
                    required
                    min={form.startDate}
                    value={form.expiryDate}
                    onChange={updateForm('expiryDate')}
                  />
                </Field>
                <Field label="Coupon Status" required>
                  <Select value={form.status} onChange={updateForm('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </Field>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  disabled={!detailLoaded || modalLoading}
                >
                  {modal.mode === 'edit' ? 'Save Changes' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          )}
        </CouponModal>
      )}

      {deleteTarget && (
        <CouponModal title="Delete Coupon" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-700">
            Delete <strong>{deleteTarget.code}</strong>? Coupons with order or redemption history cannot be deleted.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={busyId !== null}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteCoupon} loading={busyId === deleteTarget.id}>
              Delete Coupon
            </Button>
          </div>
        </CouponModal>
      )}
    </div>
  );
}
