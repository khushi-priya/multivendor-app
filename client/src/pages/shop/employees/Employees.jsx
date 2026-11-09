

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { hasPermission } from '../../../services/permissions.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Pagination,
  Select,
  Spinner,
} from '../../../components/ui.jsx';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: '',
  designation: '',
  employeeCode: '',
  address: '',
  joinedDate: '',
  salaryType: 'monthly',
  baseSalary: '0',
};

const roleLabel = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ShopEmployees() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionModules, setPermissionModules] = useState([]);
  const [expandedModules, setExpandedModules] = useState({});

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [editor, setEditor] = useState(null);
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [roleSuccess, setRoleSuccess] = useState('');

  const [updatingStatus, setUpdatingStatus] = useState(null);
  const can = (permission) =>
    user?.shop?.role === 'shop_owner' ||
    hasPermission(user?.permissions, permission);

  // Load employee roles
  const loadRoles = useCallback(async ({ strict = false } = {}) => {
    setRolesLoading(true);

    try {
      const data = await api.get('/shop/employee-roles');

      const receivedRoles = Array.isArray(data)
        ? data
        : data.items || data.roles || [];
      setPermissionModules(
        Array.isArray(data.permissionModules) ? data.permissionModules : []
      );

      const activeRoles = receivedRoles
        .filter(
          (role) =>
            role.isActive !== false &&
            role.status !== 'inactive'
        )
        .map((role) => {
          const value =
            role.value ||
            role.key ||
            role.code ||
            role.role;

          return {
            value,
            label:
              role.label ||
              role.name ||
              roleLabel(value),
            permissions: Array.isArray(role.permissions)
              ? role.permissions
              : [],
          };
        })
        .filter((role) => role.value);

      setRoles(activeRoles);
      return activeRoles;
    } catch (e) {
      if (strict) throw e;

      setError(e.message || 'Could not load employee roles.');
      setRoles([]);
      return [];
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // Load employees
  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
        excludeOwners: 'true',
      });

      if (query.trim()) {
        params.set('q', query.trim());
      }

      if (designation) {
        params.set('designation', designation);
      }

      if (status) {
        params.set('status', status);
      }

      const data = await api.get(
        `/shop/employees?${params}`
      );

      setItems(data.items || []);
      setTotal(data.total || 0);
      setDesignations(data.designations || []);
    } catch (e) {
      setError(
        e.message || 'Unable to load employees.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, query, designation, status]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    const timer = setTimeout(load, 200);

    return () => clearTimeout(timer);
  }, [load]);

  // Close employee form
  const closeEditor = () => {
    if (saving) return;

    setEditor(null);
    setForm(emptyForm);
    setError('');
    setCreatingRole(false);
    setNewRoleName('');
    setRoleError('');
    setRoleSuccess('');
  };

  // Open create employee form
  const openCreate = async () => {
    let availableRoles = roles;
    try {
      availableRoles = await loadRoles({ strict: true });
    } catch (e) {
      setError(e.message || 'Unable to load role permissions.');
      return;
    }

    const selectedRole = availableRoles[0]?.value || 'sales_associate';
    setEditor('create');

    setForm({
      ...emptyForm,
      role: selectedRole,
      permissions:
        availableRoles.find((role) => role.value === selectedRole)
          ?.permissions || [],
    });

    setError('');
    setNotice('');
    setCreatingRole(false);
    setNewRoleName('');
    setRoleError('');
    setRoleSuccess('');
  };

  // Open edit employee form
  const openEdit = (employee) => {
    setEditor(employee);

    setForm({
      ...emptyForm,
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || 'sales_associate',
      permissions: Array.isArray(employee.permissions)
        ? employee.permissions
        : roles.find((role) => role.value === employee.role)?.permissions || [],
      designation:
        employee.profile?.designation || '',
      employeeCode:
        employee.profile?.employeeCode || '',
      address: employee.profile?.address || '',
      joinedDate:
        employee.profile?.joinedDate || '',
    });

    setError('');
    setNotice('');
    setCreatingRole(false);
    setNewRoleName('');
    setRoleError('');
    setRoleSuccess('');
  };

  // Create a custom employee role
  const createRole = async () => {
    if (roleSaving) return;

    const name = newRoleName.trim();

    if (!name) {
      setRoleError('Enter a role name.');
      return;
    }

    setRoleSaving(true);
    setRoleError('');
    setRoleSuccess('');

    try {
      const response = await api.post(
        '/shop/employee-roles',
        { name }
      );

      const createdRole = response.role;

      if (!createdRole?.code) {
        throw new Error(
          'The server did not return the created role.'
        );
      }

      await loadRoles({ strict: true });

      setForm((current) => ({
        ...current,
        role: createdRole.code,
        permissions: Array.isArray(createdRole.permissions)
          ? createdRole.permissions
          : [],
      }));

      setNewRoleName('');
      setCreatingRole(false);

      setRoleSuccess(
        `${createdRole.name} role created and selected.`
      );
    } catch (e) {
      setRoleError(
        e.message || 'Unable to create role.'
      );
    } finally {
      setRoleSaving(false);
    }
  };

  // Save employee
  const save = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (editor === 'create') {
        await api.post('/shop/employees', {
          ...form,
          permissions: can('employees.manage')
            ? form.permissions
            : undefined,
          phone: form.phone || undefined,
          designation: form.designation || undefined,
          employeeCode:
            form.employeeCode || undefined,
          address: form.address || undefined,
          joinedDate: form.joinedDate || undefined,
          baseSalary: Number(form.baseSalary),
        });

        setNotice(
          'Employee account created successfully.'
        );
      } else {
        const roleChanged = form.role !== editor.role;
        const nextPermissions = [...(form.permissions || [])].sort();
        const previousPermissions = [
          ...(roleChanged
            ? roles.find((role) => role.value === form.role)?.permissions || []
            : editor.permissions || []),
        ].sort();
        const permissionsChanged =
          JSON.stringify(previousPermissions) !==
          JSON.stringify(nextPermissions);
        const body = {
          name: form.name,
          email: form.email,
          phone: form.phone || '',
          ...(roleChanged ? { role: form.role } : {}),
          ...(permissionsChanged
            ? { permissions: form.permissions }
            : {}),
          designation: form.designation || '',
          employeeCode: form.employeeCode || '',
          address: form.address || '',
          ...(form.joinedDate
            ? { joinedDate: form.joinedDate }
            : {}),
        };

        await api.patch(
          `/shop/employees/${editor.membershipId}`,
          body
        );

        setNotice(
          'Employee details updated successfully.'
        );
      }

      setEditor(null);
      setForm(emptyForm);

      await load();
    } catch (e) {
      setError(
        e.message || 'Unable to save employee.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Toggle employee status
  const toggle = async (employee) => {
    if (updatingStatus === employee.membershipId) {
      return;
    }

    const next =
      employee.status === 'active'
        ? 'inactive'
        : 'active';

    setUpdatingStatus(employee.membershipId);
    setError('');
    setNotice('');

    try {
      await api.patch(
        `/shop/employees/${employee.membershipId}`,
        { status: next }
      );

      setItems((previous) =>
        previous.map((item) =>
          item.membershipId === employee.membershipId
            ? { ...item, status: next }
            : item
        )
      );

      setNotice(
        `${employee.name} is now ${next}.`
      );
    } catch (e) {
      setError(
        e.message || 'Unable to update employee status.'
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* Page heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Employee Management
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Manage employee accounts assigned to this shop.
          </p>
        </div>

        {can('employees.create') && can('employees.assign') && (
          <Button onClick={openCreate}>Add Employee</Button>
        )}
      </div>

      {/* Notifications */}
      {error && !editor && (
        <Alert>{error}</Alert>
      )}

      {notice && (
        <Alert kind="success">{notice}</Alert>
      )}

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-72">
          <Input
            placeholder="Search name, employee ID, email, or phone"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-48">
          <Select
            value={designation}
            onChange={(e) => {
              setDesignation(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All designations</option>

            {designations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
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
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      {/* Employee list */}
      {loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">
                  Role / Designation
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((employee) => (
                <tr key={employee.membershipId}>

                  {/* Employee */}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left font-medium text-indigo-700 hover:underline"
                      onClick={() => setDetails(employee)}
                    >
                      {employee.name}
                    </button>

                    <div className="text-xs text-slate-500">
                      {employee.profile?.employeeCode ||
                        `Employee #${employee.userId}`}
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3">
                    {employee.email}

                    <div className="text-xs text-slate-500">
                      {employee.phone || '—'}
                    </div>
                  </td>

                  {/* Role and designation */}
                  <td className="px-4 py-3">
                    {roleLabel(employee.role)}

                    <div className="text-xs text-slate-500">
                      {employee.profile?.designation || '—'}
                    </div>
                  </td>

                  {/* Status badge and toggle button */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">

                      <Badge
                        tone={
                          employee.status === 'active'
                            ? 'green'
                            : 'amber'
                        }
                      >
                        {employee.status === 'active'
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>

                      {can('employees.manage') && <button
                        type="button"
                        onClick={() => toggle(employee)}
                        disabled={
                          updatingStatus === employee.membershipId
                        }
                        aria-label={`Change ${employee.name} status`}
                        aria-pressed={
                          employee.status === 'active'
                        }
                        title="Toggle employee status"
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          employee.status === 'active'
                            ? 'bg-green-600'
                            : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            employee.status === 'active'
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(
                        can('employees.update') ||
                        can('employees.assign') ||
                        can('employees.manage')
                      ) && (
                        <Button
                          variant="secondary"
                          onClick={() => openEdit(employee)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No employees match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Pagination */}
      {!loading && (
        <Pagination
          page={page}
          pageSize={10}
          total={total}
          onPage={setPage}
        />
      )}

      {/* Add / Edit Employee Modal */}
      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEditor}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal heading */}
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="employee-form-title"
                className="text-lg font-semibold"
              >
                {editor === 'create'
                  ? 'Add Employee'
                  : 'Edit Employee'}
              </h2>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close employee form"
                className="rounded-md px-2 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mb-3">
                <Alert>{error}</Alert>
              </div>
            )}

            <form
              onSubmit={save}
              className="grid gap-4 sm:grid-cols-2"
            >

              {/* Name */}
              <Field label="Full name" required>
                <Input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Email */}
              <Field label="Email" required>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Mobile */}
              <Field label="Mobile">
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(
                      /\D/g,
                      ''
                    );

                    setForm({
                      ...form,
                      phone: value,
                    });
                  }}
                  placeholder="Enter mobile number"
                />
              </Field>

              {/* Employee code */}
              <Field label="Employee code">
                <Input
                  value={form.employeeCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      employeeCode: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Role */}
              <Field label="Role" required>
                <div className="flex items-center gap-2">
                  <Select
                    className="block min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                    value={form.role}
                    disabled={!can('employees.assign')}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      const roleDefaults =
                        roles.find((role) => role.value === nextRole)
                          ?.permissions || [];
                      setForm((current) => ({
                        ...current,
                        role: nextRole,
                        permissions: [...roleDefaults],
                      }));
                    }}
                  >
                    {roles.map((role) => (
                      <option
                        key={role.value}
                        value={role.value}
                      >
                        {role.label}
                      </option>
                    ))}
                  </Select>

                  {can('employees.manage') && <button
                    type="button"
                    onClick={() => {
                      setCreatingRole(true);
                      setRoleError('');
                      setRoleSuccess('');
                    }}
                    disabled={roleSaving}
                    className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    + Create Role
                  </button>}
                </div>

                {/* Create custom role */}
                {creatingRole && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        maxLength={100}
                        value={newRoleName}
                        onChange={(e) => {
                          setNewRoleName(e.target.value);
                          setRoleError('');
                        }}
                        placeholder="Enter new role name"
                        aria-label="Enter new role name"
                        aria-invalid={Boolean(roleError)}
                        className="block min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                      />

                      <button
                        type="button"
                        onClick={createRole}
                        disabled={roleSaving}
                        className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {roleSaving ? 'Saving…' : 'Save'}
                      </button>

                      <button
                        type="button"
                        disabled={roleSaving}
                        onClick={() => {
                          setCreatingRole(false);
                          setNewRoleName('');
                          setRoleError('');
                        }}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>

                    {roleError && (
                      <p className="text-xs text-red-600">
                        {roleError}
                      </p>
                    )}
                  </div>
                )}

                {roleSuccess && (
                  <p
                    className="mt-1 text-xs text-green-700"
                    role="status"
                  >
                    {roleSuccess}
                  </p>
                )}

                {rolesLoading && (
                  <p className="mt-1 text-xs text-slate-500">
                    Loading available roles...
                  </p>
                )}
              </Field>

              {/* Module Permissions */}
              {/* <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Module Permissions
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Select which modules and actions this employee is allowed to access. Changing the role loads its defaults and replaces the current selections.
                  </p>
                </div>

                {permissionModules.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {permissionModules.map((module) => (
                      <fieldset
                        key={module.key}
                        className="rounded-md border border-slate-200 bg-white p-3"
                      >
                        <legend className="px-1 text-sm font-medium text-slate-800">
                          {module.label}
                        </legend>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                          {(module.actions || []).map((action) => {
                            const actionKey =
                              typeof action === 'string' ? action : action.key;
                            const permission = `${module.key}.${actionKey}`;
                            const label =
                              (typeof action === 'object' && action.label) ||
                              ({
                                update: 'Edit',
                                approve: 'Approve / Reject',
                                collect: 'Collect',
                                reconcile: 'Reconcile',
                              }[actionKey]) ||
                              roleLabel(actionKey);
                            const selected =
                              (form.permissions || []).includes(permission);

                            return (
                              <label
                                key={permission}
                                className="inline-flex items-center gap-2 text-xs text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={
                                    saving ||
                                    !can('employees.manage')
                                  }
                                  onChange={(event) => {
                                    setForm((current) => {
                                      const currentPermissions =
                                        current.permissions || [];
                                      return {
                                        ...current,
                                        permissions: event.target.checked
                                          ? [...currentPermissions, permission]
                                          : currentPermissions.filter(
                                              (item) => item !== permission
                                            ),
                                      };
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {label}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Loading available module permissions...
                  </p>
                )}
              </section> */}
              
{/* Module Permissions */}
<section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
  <div>
    <h3 className="text-sm font-semibold text-slate-900">
      Module Permissions
    </h3>
    <p className="mt-1 text-xs text-slate-600">
      Expand a module to configure its permissions.
      Select or clear all permissions within each module.
    </p>
  </div>

  {permissionModules.length ? (
    <div className="space-y-2">
      {permissionModules.map((module) => {
        const actions = (module.actions || [])
          .map((action) => ({
            key: typeof action === 'string' ? action : action.key,
            label:
              (typeof action === 'object' && action.label) ||
              ({
                update: 'Edit',
                approve: 'Approve',
                reject: 'Reject',
                collect: 'Collect Payment',
                reconcile: 'Reconcile',
              }[
                typeof action === 'string' ? action : action.key
              ]) ||
              roleLabel(
                typeof action === 'string' ? action : action.key
              ),
          }))
          .filter((action) => action.key);

        const modulePermissions = actions.map(
          (action) => `${module.key}.${action.key}`
        );

        const selectedPermissions = form.permissions || [];

        const selectedCount = modulePermissions.filter(
          (permission) => selectedPermissions.includes(permission)
        ).length;

        const isExpanded = Boolean(expandedModules[module.key]);

        const allSelected =
          modulePermissions.length > 0 &&
          selectedCount === modulePermissions.length;

        return (
          <div
            key={module.key}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            {/* Module dropdown header */}
            <button
              type="button"
              onClick={() =>
                setExpandedModules((previous) => ({
                  ...previous,
                  [module.key]: !previous[module.key],
                }))
              }
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-sm font-semibold text-indigo-700">
                  {module.label?.charAt(0)?.toUpperCase() || 'M'}
                </span>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {module.label}
                  </p>

                  <p className="text-xs text-slate-500">
                    {selectedCount} of {modulePermissions.length} permissions selected
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    allSelected
                      ? 'bg-green-50 text-green-700'
                      : selectedCount > 0
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {allSelected
                    ? 'All selected'
                    : selectedCount > 0
                    ? 'Partial'
                    : 'None'}
                </span>

                <svg
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="m5 7.5 5 5 5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>

            {/* Expanded module permissions */}
            {isExpanded && (
              <div className="border-t border-slate-100 px-3 py-3">
                {/* Select All / Clear All */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Configure actions
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={
                        saving ||
                        !can('employees.manage') ||
                        !modulePermissions.length ||
                        allSelected
                      }
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: [
                            ...new Set([
                              ...(current.permissions || []),
                              ...modulePermissions,
                            ]),
                          ],
                        }))
                      }
                      className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving ||
                        !can('employees.manage') ||
                        selectedCount === 0
                      }
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: (
                            current.permissions || []
                          ).filter(
                            (permission) =>
                              !modulePermissions.includes(permission)
                          ),
                        }))
                      }
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Individual permissions */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {actions.map((action) => {
                    const permission =
                      `${module.key}.${action.key}`;

                    const selected =
                      selectedPermissions.includes(permission);

                    return (
                      <label
                        key={permission}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                          selected
                            ? 'border-indigo-200 bg-indigo-50/60 text-indigo-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        } ${
                          saving || !can('employees.manage')
                            ? 'cursor-not-allowed opacity-60'
                            : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={
                            saving ||
                            !can('employees.manage')
                          }
                          onChange={(event) => {
                            setForm((current) => {
                              const currentPermissions =
                                current.permissions || [];

                              return {
                                ...current,
                                permissions: event.target.checked
                                  ? [
                                      ...new Set([
                                        ...currentPermissions,
                                        permission,
                                      ]),
                                    ]
                                  : currentPermissions.filter(
                                      (item) => item !== permission
                                    ),
                              };
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />

                        <span>{action.label}</span>
                      </label>
                    );
                  })}
                </div>

                {actions.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No actions are configured for this module.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  ) : (
    <p className="text-xs text-slate-500">
      Loading available module permissions...
    </p>
  )}
</section>


              {/* Designation */}
              <Field label="Designation">
                <Input
                  value={form.designation}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      designation: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Joining date */}
              <Field label="Joining date">
                <Input
                  type="date"
                  value={form.joinedDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      joinedDate: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Address */}
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Create-only fields */}
              {editor === 'create' && (
                <>
                  <Field
                    label="Initial password"
                    required
                    hint="At least 8 characters, including a letter and number."
                  >
                    <Input
                      required
                      type="password"
                      minLength={8}
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Salary type">
                    <Select
                      value={form.salaryType}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          salaryType: e.target.value,
                        })
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                    </Select>
                  </Field>

                  <Field label="Base rate" required>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={form.baseSalary}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          baseSalary: e.target.value,
                        })
                      }
                    />
                  </Field>
                </>
              )}

              {/* Form buttons */}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button type="submit" loading={saving}>
                  {editor === 'create'
                    ? 'Create employee'
                    : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {details && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetails(null)}
        >
          <div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {details.name}
                </h2>

                <button
                  type="button"
                  aria-label="Close employee details"
                  onClick={() => setDetails(null)}
                  className="rounded-md px-2 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  &times;
                </button>
              </div>

              <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">
                  Employee ID
                </dt>
                <dd>
                  {details.profile?.employeeCode ||
                    details.userId}
                </dd>

                <dt className="text-slate-500">Email</dt>
                <dd>{details.email}</dd>

                <dt className="text-slate-500">Mobile</dt>
                <dd>{details.phone || '—'}</dd>

                <dt className="text-slate-500">Role</dt>
                <dd>{roleLabel(details.role)}</dd>

                <dt className="text-slate-500">
                  Designation
                </dt>
                <dd>
                  {details.profile?.designation || '—'}
                </dd>

                <dt className="text-slate-500">
                  Joining date
                </dt>
                <dd>
                  {details.profile?.joinedDate || '—'}
                </dd>

                <dt className="text-slate-500">Address</dt>
                <dd>
                  {details.profile?.address || '—'}
                </dd>
              </dl>

              <Button
                className="mt-4"
                onClick={() => setDetails(null)}
              >
                Close
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
