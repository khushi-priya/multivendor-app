







import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Pagination,
  Select,
  Spinner,
} from '../../components/ui.jsx';

export default function Shops() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(null);

  const [selectedShop, setSelectedShop] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [categories, setCategories] = useState([]);
  const [editingShop, setEditingShop] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    api
      .get('/admin/shop-categories')
      .then((d) => setCategories(d.items || []))
      .catch((e) => setError(e.message));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '20',
    });

    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);

    api
      .get(`/admin/shops?${params}`)
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [page, q, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openShop = (shop) => {
    setSelectedShop(shop);
    setEmployees([]);
    setEmployeeError('');
  };

  const loadEmployees = async () => {
    if (!selectedShop) return;

    setEmployeesLoading(true);
    setEmployeeError('');

    try {
      const response = await api.get(
        `/admin/employees?shopId=${selectedShop.id}`
      );
      setEmployees(response.items || []);
    } catch (e) {
      setEmployeeError(e.message);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const toggleStatus = async (shop) => {
    const next = shop.status === 'active' ? 'suspended' : 'active';

    if (
      next === 'suspended' &&
      !window.confirm(
        `Suspend "${shop.name}"? Its users will be blocked immediately.`
      )
    ) {
      return;
    }

    setPending(shop.id);
    setError('');

    try {
      await api.patch(`/admin/shops/${shop.id}`, { status: next });
      setNotice(
        `${shop.name} is now ${
          next === 'active' ? 'active' : 'inactive'
        }.`
      );
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(null);
    }
  };

  const resend = async (shop) => {
    setPending(shop.id);
    setError('');

    try {
      const response = await api.post(
        `/admin/shops/${shop.id}/resend-invite`
      );

      setNotice(
        response.emailStatus === 'sent'
          ? `Invitation re-sent to ${shop.owner.email}.`
          : 'No SMTP configured: the new setup link was printed in the server console.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(null);
    }
  };

  const beginEdit = (shop) => {
    setEditingShop(shop);

    setEditForm({
      name: shop.name || '',
      categoryId: String(shop.category?.id || ''),
      address: shop.address || '',
      gstNumber: shop.gstNumber || '',
      city: shop.city || '',
      district: shop.district || '',
      state: shop.state || '',
      pinCode: shop.pinCode || '',
      contactPhone: shop.contactPhone || '',
      contactEmail: shop.contactEmail || '',
      status: shop.status || 'active',
      ownerFirstName:
        shop.owner?.firstName || shop.owner?.name?.split(' ')[0] || '',
      ownerLastName:
        shop.owner?.lastName ||
        shop.owner?.name?.split(' ').slice(1).join(' ') ||
        '',
      ownerPhone: shop.owner?.phone || '',
    });
  };

  const saveShop = async (event) => {
    event.preventDefault();

    if (!editingShop) return;

    setEditSaving(true);
    setError('');

    try {
      await api.patch(`/admin/shops/${editingShop.id}`, {
        ...editForm,
        categoryId: Number(editForm.categoryId),
      });

      setNotice('Shop details updated.');
      setEditingShop(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const deleteShop = async (shop) => {
    if (
      !window.confirm(
        `Delete "${shop.name}"? Shops with orders, products, or dependent records cannot be deleted.`
      )
    ) {
      return;
    }

    setPending(shop.id);
    setError('');

    try {
      await api.delete(`/admin/shops/${shop.id}`);
      setNotice(`${shop.name} was deleted.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <PageHeader
        title="All Shops"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/shop/login">
              <Button variant="secondary">Shop Owner Login</Button>
            </Link>

            <Link to="/admin/shops/new">
              <Button>Create Shop</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-64">
          <Input
            placeholder="Search by shop name…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-40">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Inactive</option>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}
      </div>

      {!data ? (
        <Spinner />
      ) : (
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No shops found.
                  </td>
                </tr>
              )}

              {data.items.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {s.name}
                    </div>
                    <div className="max-w-xs truncate text-xs text-slate-500">
                      {s.address}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {s.category ? s.category.name : '—'}
                  </td>

                  <td className="px-4 py-3">
                    {s.owner ? (
                      <>
                        <div>{s.owner.name}</div>
                        <div className="text-xs text-slate-500">
                          {s.owner.email}
                        </div>

                        {s.owner.status === 'invited' && (
                          <Badge tone="amber">
                            Invitation pending
                          </Badge>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Small status toggle */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={s.status === 'active'}
                        aria-label={`Set ${s.name} ${
                          s.status === 'active' ? 'inactive' : 'active'
                        }`}
                        disabled={pending === s.id}
                        onClick={() => toggleStatus(s)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                          s.status === 'active'
                            ? 'bg-blue-600'
                            : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            s.status === 'active'
                              ? 'translate-x-4'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </button>

                      <span
                        className={`text-xs font-medium ${
                          s.status === 'active'
                            ? 'text-blue-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>

                  {/* Actions: View Shop, Edit and Delete */}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => openShop(s)}
                      >
                        View Shop
                      </Button>

                      <Button
                        variant="secondary"
                        disabled={pending === s.id}
                        onClick={() => beginEdit(s)}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="danger"
                        disabled={pending === s.id}
                        onClick={() => deleteShop(s)}
                      >
                        Delete
                      </Button>

                      {s.owner && s.owner.status === 'invited' && (
                        <Button
                          variant="secondary"
                          disabled={pending === s.id}
                          onClick={() => resend(s)}
                        >
                          Resend Invite
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPage={setPage}
        />
      )}

      {/* Edit shop popup */}
      {editingShop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !editSaving) {
              setEditingShop(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-shop-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="edit-shop-title" className="text-lg font-semibold">
                Edit {editingShop.name}
              </h2>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingShop(null)}
              >
                Close
              </Button>
            </div>

            <form onSubmit={saveShop} className="grid gap-3 sm:grid-cols-2">
              {[
                ['name', 'Shop name'],
                ['gstNumber', 'GST number'],
                ['city', 'City'],
                ['district', 'District'],
                ['state', 'State'],
                ['pinCode', 'PIN code'],
                ['address', 'Full address'],
                ['contactPhone', 'Contact phone'],
                ['contactEmail', 'Contact email'],
                ['ownerFirstName', 'Owner first name'],
                ['ownerLastName', 'Owner last name'],
                ['ownerPhone', 'Owner phone'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="text-sm font-medium text-slate-700"
                >
                  {label}
                  <Input
                    required={[
                      'name',
                      'address',
                      'ownerFirstName',
                      'ownerLastName',
                    ].includes(key)}
                    maxLength={key === 'gstNumber' ? 15 : undefined}
                    value={editForm[key] || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        [key]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}

              <label className="text-sm font-medium text-slate-700">
                Shop category
                <Select
                  required
                  value={editForm.categoryId || ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      categoryId: e.target.value,
                    })
                  }
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Status
                <Select
                  value={editForm.status || 'active'}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Inactive</option>
                </Select>
              </label>

              <div className="col-span-full flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={editSaving}
                  onClick={() => setEditingShop(null)}
                >
                  Cancel
                </Button>

                <Button loading={editSaving}>
                  {editSaving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop details and employee popup */}
      {selectedShop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedShop(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-dialog-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="shop-dialog-title" className="text-lg font-semibold">
                  {selectedShop.name}
                </h2>
                <p className="text-sm text-slate-500">
                  Shop details and employee management
                </p>
              </div>

              <Button
                variant="secondary"
                onClick={() => setSelectedShop(null)}
              >
                Close
              </Button>
            </div>

            <Card className="mb-4 space-y-3">
              <h3 className="font-semibold">Shop Information</h3>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-slate-500">Shop name</p>
                  <p className="font-medium">{selectedShop.name}</p>
                </div>

                <div>
                  <p className="text-slate-500">Category</p>
                  <p>{selectedShop.category?.name || '—'}</p>
                </div>

                <div>
                  <p className="text-slate-500">Owner</p>
                  <p>{selectedShop.owner?.name || '—'}</p>
                </div>

                <div>
                  <p className="text-slate-500">Owner email</p>
                  <p>{selectedShop.owner?.email || '—'}</p>
                </div>

                <div>
                  <p className="text-slate-500">Address</p>
                  <p>{selectedShop.address || '—'}</p>
                </div>

                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge
                    tone={selectedShop.status === 'active' ? 'green' : 'red'}
                  >
                    {selectedShop.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Manage Employees</h3>
                  <p className="text-xs text-slate-500">
                    Employees belonging to {selectedShop.name}
                  </p>
                </div>

                <Button
                  onClick={loadEmployees}
                  disabled={employeesLoading}
                >
                  {employeesLoading ? 'Loading…' : 'View Employees'}
                </Button>
              </div>

              {employeeError && <Alert>{employeeError}</Alert>}
              {employeesLoading && <Spinner />}

              {!employeesLoading && employees.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Employee</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="px-3 py-2">
                            <div className="font-medium">
                              {employee.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {employee.email || '—'}
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            {employee.role || 'Employee'}
                          </td>

                          <td className="px-3 py-2">
                            {employee.phone || '—'}
                          </td>

                          <td className="px-3 py-2">
                            {employee.status || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!employeesLoading &&
                !employeeError &&
                employees.length === 0 && (
                  <p className="rounded-md bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                    Click "View Employees" to load this shop's employees.
                  </p>
                )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

