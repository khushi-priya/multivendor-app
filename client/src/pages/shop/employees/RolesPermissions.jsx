// // import { useCallback, useEffect, useState } from 'react';
// // import { api } from '../../../services/api.js';
// // import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';

// // const ACTION_LABELS = {
// //   view: 'View',
// //   create: 'Create',
// //   update: 'Edit / Update',
// //   delete: 'Delete',
// //   manage: 'Manage',
// //   assign: 'Assign',
// //   approve: 'Approve / Reject',
// //   collect: 'Collect Payment',
// //   reconcile: 'Reconcile',
// //   refund: 'Refund',
// // };

// // const emptyForm = { name: '', permissions: [] };

// // export default function RolesPermissions() {
// //   const [roles, setRoles] = useState([]);
// //   const [modules, setModules] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [saving, setSaving] = useState(false);
// //   const [error, setError] = useState('');
// //   const [notice, setNotice] = useState('');
// //   const [editingCode, setEditingCode] = useState(null);
// //   const [form, setForm] = useState(emptyForm);

// //   const loadRoles = useCallback(async () => {
// //     setLoading(true);
// //     setError('');
// //     try {
// //       const response = await api.get('/shop/employee-roles/manage');
// //       setRoles(response.items || []);
// //       setModules(response.permissionModules || []);
// //     } catch (requestError) {
// //       setError(requestError.message || 'Unable to load roles.');
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, []);

// //   useEffect(() => {
// //     loadRoles();
// //   }, [loadRoles]);

// //   const beginEdit = (role) => {
// //     setEditingCode(role?.code || null);
// //     setForm({
// //       name: role?.name || '',
// //       permissions: role?.permissions || [],
// //     });
// //     setNotice('');
// //     setError('');
// //   };

// //   const togglePermission = (permission) => {
// //     setForm((current) => ({
// //       ...current,
// //       permissions: current.permissions.includes(permission)
// //         ? current.permissions.filter((value) => value !== permission)
// //         : [...current.permissions, permission],
// //     }));
// //   };

// //   const saveRole = async (event) => {
// //     event.preventDefault();
// //     if (saving) return;
// //     setSaving(true);
// //     setError('');
// //     setNotice('');
// //     try {
// //       if (editingCode) {
// //         await api.patch(
// //           `/shop/employee-roles/${encodeURIComponent(editingCode)}`,
// //           { name: form.name.trim(), permissions: form.permissions },
// //         );
// //         setNotice('Role permissions saved. Employees who use role defaults receive the changes on their next request; individual permission overrides remain unchanged.');
// //       } else {
// //         await api.post('/shop/employee-roles', {
// //           name: form.name.trim(),
// //           permissions: form.permissions,
// //         });
// //         setNotice('Role created.');
// //       }
// //       setForm(emptyForm);
// //       setEditingCode(null);
// //       await loadRoles();
// //     } catch (requestError) {
// //       setError(requestError.message || 'Unable to save this role.');
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   const toggleActive = async (role) => {
// //     setSaving(true);
// //     setError('');
// //     setNotice('');
// //     try {
// //       await api.patch(
// //         `/shop/employee-roles/${encodeURIComponent(role.code)}`,
// //         { isActive: !role.isActive },
// //       );
// //       setNotice(role.isActive ? 'Role deactivated.' : 'Role activated.');
// //       await loadRoles();
// //     } catch (requestError) {
// //       setError(requestError.message || 'Unable to update role status.');
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   const selectAll = () => {
// //     setForm({
// //       ...form,
// //       permissions: modules.flatMap((module) =>
// //         module.actions.map((action) => `${module.key}.${action}`),
// //       ),
// //     });
// //   };

// //   const clearAll = () => setForm((current) => ({ ...current, permissions: [] }));

// //   return (
// //     <div className="space-y-6">
// //       <header>
// //         <h1 className="text-2xl font-bold text-slate-900">Roles &amp; Permissions</h1>
// //         <p className="mt-1 text-sm text-slate-600">
// //           Configure shop roles and the modules each role can use.
// //         </p>
// //       </header>

// //       {error && <Alert kind="error">{error}</Alert>}
// //       {notice && <Alert kind="success">{notice}</Alert>}

// //       <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
// //         <Card>
// //           <div className="mb-4 flex items-center justify-between gap-3">
// //             <h2 className="text-lg font-semibold text-slate-900">Shop roles</h2>
// //             {/* <Button type="button" onClick={() => beginEdit(null)}>Create role</Button> */}
// //           </div>
// //           {loading ? <Spinner /> : roles.length === 0 ? (
// //             <p className="py-6 text-center text-sm text-slate-500">No roles are available.</p>
// //           ) : (
// //             <div className="divide-y divide-slate-200">
// //               {roles.map((role) => (
// //                 <div key={role.code} className="flex flex-wrap items-center justify-between gap-3 py-4">
// //                   <div>
// //                     <div className="flex flex-wrap items-center gap-2">
// //                       <h3 className="font-semibold text-slate-900">{role.name}</h3>
// //                       <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${role.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
// //                         {role.isActive ? 'Active' : 'Inactive'}
// //                       </span>
// //                       {role.builtIn && <span className="text-xs text-slate-500">Default role</span>}
// //                     </div>
// //                     <p className="mt-1 text-xs text-slate-500">
// //                       {role.employeeCount} assigned {role.employeeCount === 1 ? 'employee' : 'employees'} · {role.permissions.length} permissions
// //                     </p>
// //                   </div>
// //                   <div className="flex gap-2">
// //                     <Button type="button" variant="secondary" onClick={() => beginEdit(role)}>Edit permissions</Button>
// //                     {!role.builtIn && (
// //                       <Button type="button" variant="secondary" disabled={saving} onClick={() => toggleActive(role)}>
// //                         {role.isActive ? 'Deactivate' : 'Activate'}
// //                       </Button>
// //                     )}
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </Card>

// //         <Card>
// //           <h2 className="text-lg font-semibold text-slate-900">
// //             {editingCode ? `Edit ${form.name}` : 'Create a role'}
// //           </h2>
// //           <form className="mt-4 space-y-4" onSubmit={saveRole}>
// //             <label className="block text-sm font-medium text-slate-700">
// //               Role name
// //               <Input
// //                 className="mt-1"
// //                 required
// //                 maxLength={100}
// //                 value={form.name}
// //                 onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
// //                 placeholder="e.g. Stock Controller"
// //               />
// //             </label>

// //             <div className="flex flex-wrap items-center justify-between gap-2">
// //               <h3 className="font-medium text-slate-800">Module permissions</h3>
// //               <div className="flex gap-2">
// //                 <button type="button" onClick={selectAll} className="text-xs font-medium text-indigo-700 hover:underline">Select all</button>
// //                 <button type="button" onClick={clearAll} className="text-xs font-medium text-slate-600 hover:underline">Clear all</button>
// //               </div>
// //             </div>
// //             <p className="text-xs text-slate-500">
// //               Choose each module/action explicitly. Sensitive approvals and payment actions remain separately permissioned.
// //             </p>
// //             <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
// //               {modules.map((module) => (
// //                 <fieldset key={module.key} className="rounded-lg border border-slate-200 p-3">
// //                   <legend className="px-1 text-sm font-semibold text-slate-800">{module.label}</legend>
// //                   <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
// //                     {module.actions.map((action) => {
// //                       const permission = `${module.key}.${action}`;
// //                       return (
// //                         <label key={permission} className="flex items-center gap-2 text-xs text-slate-700">
// //                           <input
// //                             type="checkbox"
// //                             checked={form.permissions.includes(permission)}
// //                             onChange={() => togglePermission(permission)}
// //                             className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
// //                           />
// //                           {ACTION_LABELS[action] || action}
// //                         </label>
// //                       );
// //                     })}
// //                   </div>
// //                 </fieldset>
// //               ))}
// //             </div>
// //             <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
// //               <Button type="button" variant="secondary" disabled={saving} onClick={() => beginEdit(null)}>Clear form</Button>
// //               <Button type="submit" disabled={saving || !form.name.trim()}>
// //                 {saving ? 'Saving…' : editingCode ? 'Save permissions' : 'Create role'}
// //               </Button>
// //             </div>
// //           </form>
// //         </Card>
// //       </div>
// //     </div>
// //   );
// // }


import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';

const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  update: 'Edit / Update',
  delete: 'Delete',
  manage: 'Manage',
  assign: 'Assign',
  approve: 'Approve / Reject',
  collect: 'Collect Payment',
  reconcile: 'Reconcile',
  refund: 'Refund',
};

const emptyForm = { name: '', permissions: [] };

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [editingCode, setEditingCode] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [modalOpen, setModalOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/shop/employee-roles/manage');

      setRoles(response.items || []);
      setModules(response.permissionModules || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Open the create/edit popup.
  const beginEdit = (role = null) => {
    setEditingCode(role?.code || null);

    setForm({
      name: role?.name || '',
      permissions: Array.isArray(role?.permissions)
        ? [...role.permissions]
        : [],
    });

    setExpandedModules({});
    setNotice('');
    setError('');
    setModalOpen(true);
  };

  // Close the popup.
  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingCode(null);
    setForm(emptyForm);
    setExpandedModules({});
  };

  // Toggle an individual permission.
  const togglePermission = (permission) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((value) => value !== permission)
        : [...current.permissions, permission],
    }));
  };

  // Select all permissions.
  const selectAll = () => {
    const allPermissions = modules.flatMap((module) =>
      (module.actions || []).map(
        (action) => `${module.key}.${action}`,
      ),
    );

    setForm((current) => ({
      ...current,
      permissions: [...new Set(allPermissions)],
    }));
  };

  // Clear all permissions.
  const clearAll = () => {
    setForm((current) => ({
      ...current,
      permissions: [],
    }));
  };

  // Select all permissions inside one module.
  const selectModulePermissions = (module) => {
    const modulePermissions = (module.actions || []).map(
      (action) => `${module.key}.${action}`,
    );

    setForm((current) => ({
      ...current,
      permissions: [
        ...new Set([...current.permissions, ...modulePermissions]),
      ],
    }));
  };

  // Clear permissions inside one module.
  const clearModulePermissions = (module) => {
    const modulePermissions = (module.actions || []).map(
      (action) => `${module.key}.${action}`,
    );

    setForm((current) => ({
      ...current,
      permissions: current.permissions.filter(
        (permission) => !modulePermissions.includes(permission),
      ),
    }));
  };

  // Expand/collapse a module.
  const toggleModule = (moduleKey) => {
    setExpandedModules((current) => ({
      ...current,
      [moduleKey]: !current[moduleKey],
    }));
  };

  // Save new role or update existing role.
  const saveRole = async (event) => {
    event.preventDefault();

    if (saving || !form.name.trim()) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (editingCode) {
        await api.patch(
          `/shop/employee-roles/${encodeURIComponent(editingCode)}`,
          {
            name: form.name.trim(),
            permissions: form.permissions,
          },
        );

        setNotice(
          'Role permissions saved. Employees who use role defaults receive the changes on their next request; individual permission overrides remain unchanged.',
        );
      } else {
        await api.post('/shop/employee-roles', {
          name: form.name.trim(),
          permissions: form.permissions,
        });

        setNotice('Role created successfully.');
      }

      setModalOpen(false);
      setEditingCode(null);
      setForm(emptyForm);
      setExpandedModules({});

      await loadRoles();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save this role.');
    } finally {
      setSaving(false);
    }
  };

  // Activate/deactivate custom role.
  const toggleActive = async (role) => {
    if (saving) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await api.patch(
        `/shop/employee-roles/${encodeURIComponent(role.code)}`,
        { isActive: !role.isActive },
      );

      setNotice(
        role.isActive
          ? 'Role deactivated.'
          : 'Role activated.',
      );

      await loadRoles();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update role status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Roles &amp; Permissions
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Configure shop roles and control which modules and actions
            each role can access.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => beginEdit(null)}
        >
          + Create Role
        </Button>
      </header>

      {/* NOTICES */}
      {error && (
        <Alert kind="error">{error}</Alert>
      )}

      {notice && (
        <Alert kind="success">{notice}</Alert>
      )}

      {/* FULL-WIDTH SHOP ROLES CARD */}
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Shop Roles
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage employee roles and their permissions.
            </p>
          </div>

          {/* <Button
            type="button"
            onClick={() => beginEdit(null)}
          >
            + Create Role
          </Button> */}
        </div>

        {loading ? (
          <div className="py-8">
            <Spinner />
          </div>
        ) : roles.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No roles are available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employees
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Permissions
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {roles.map((role) => (
                  <tr
                    key={role.code}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {role.name}
                      </div>

                      {role.builtIn && (
                        <span className="mt-1 inline-block text-xs text-slate-500">
                          Default role
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {role.employeeCount ?? 0}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {role.permissions?.length || 0}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          role.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {role.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => beginEdit(role)}
                        >
                          Edit Permissions
                        </Button>

                        {!role.builtIn && (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={saving}
                            onClick={() => toggleActive(role)}
                          >
                            {role.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE / EDIT ROLE MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="role-modal-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {editingCode ? 'Edit Role Permissions' : 'Create New Role'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Set the role name and select the permissions it requires.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                aria-label="Close popup"
                className="rounded-lg px-3 py-1 text-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* MODAL FORM */}
            <form
              onSubmit={saveRole}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">

                {/* ROLE NAME */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Role Name <span className="text-red-500">*</span>
                  </label>

                  <Input
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Stock Controller"
                  />
                </div>

                {/* PERMISSIONS HEADER */}
                <div className="rounded-lg border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Module Permissions
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {form.permissions.length} permissions selected
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        onClick={clearAll}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    {modules.length === 0 ? (
                      <p className="py-5 text-center text-sm text-slate-500">
                        No permission modules are available.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {modules.map((module) => {
                          const actions = module.actions || [];

                          const modulePermissions = actions.map(
                            (action) => `${module.key}.${action}`,
                          );

                          const selectedCount = modulePermissions.filter(
                            (permission) =>
                              form.permissions.includes(permission),
                          ).length;

                          const allSelected =
                            modulePermissions.length > 0 &&
                            selectedCount === modulePermissions.length;

                          const expanded =
                            Boolean(expandedModules[module.key]);

                          return (
                            <div
                              key={module.key}
                              className="overflow-hidden rounded-lg border border-slate-200"
                            >
                              {/* MODULE HEADER */}
                              <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-3 py-3 sm:px-4">
                                <button
                                  type="button"
                                  onClick={() => toggleModule(module.key)}
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                  <span className="text-xs text-slate-500">
                                    {expanded ? '▼' : '▶'}
                                  </span>

                                  <span className="truncate text-sm font-semibold text-slate-800">
                                    {module.label}
                                  </span>

                                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                    {selectedCount}/{actions.length}
                                  </span>
                                </button>

                                <div className="flex shrink-0 gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      selectModulePermissions(module)
                                    }
                                    className="rounded border border-indigo-200 px-2 py-1 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-50"
                                  >
                                    Select All
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      clearModulePermissions(module)
                                    }
                                    className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
                                  >
                                    Clear All
                                  </button>
                                </div>
                              </div>

                              {/* MODULE ACTIONS */}
                              {expanded && (
                                <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4">
                                  {actions.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                      No actions available for this module.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                      {actions.map((action) => {
                                        const permission =
                                          `${module.key}.${action}`;

                                        return (
                                          <label
                                            key={permission}
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-white"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={form.permissions.includes(
                                                permission,
                                              )}
                                              onChange={() =>
                                                togglePermission(permission)
                                              }
                                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />

                                            <span>
                                              {ACTION_LABELS[action] || action}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs leading-5 text-slate-500">
                  Choose each module and action explicitly. Sensitive
                  approvals, payment collection, reconciliation and refunds
                  remain separately permissioned.
                </p>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={closeModal}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    saving ||
                    !form.name.trim()
                  }
                >
                  {saving
                    ? 'Saving…'
                    : editingCode
                      ? 'Save Permissions'
                      : 'Create Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


