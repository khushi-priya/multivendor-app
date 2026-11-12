


// import { useCallback, useEffect, useState } from 'react';
// import { api } from '../../services/api.js';
// import {
//   Alert,
//   Badge,
//   Button,
//   Card,
//   Field,
//   Input,
//   PageHeader,
//   Spinner,
//   Textarea,
//   fieldError,
// } from '../../components/ui.jsx';

// const empty = {
//   name: '',
//   contactEmail: '',
//   contactPhone: '',
//   gstNumber: '',
//   address: '',
// };

// export default function Wholesalers() {
//   const [items, setItems] = useState(null);
//   const [shops, setShops] = useState([]);
//   const [selectedShopId, setSelectedShopId] = useState('');
//   const [shopsLoading, setShopsLoading] = useState(false);

//   const [form, setForm] = useState(empty);
//   const [details, setDetails] = useState({});
//   const [error, setError] = useState('');
//   const [busy, setBusy] = useState(false);
//   const [updatingStatusId, setUpdatingStatusId] = useState(null);
//   const [editing, setEditing] = useState(null);
//   const [modalOpen, setModalOpen] = useState(false);

//   const load = useCallback(async () => {
//     try {
//       setError('');
//       const data = await api.get('/admin/wholesalers');
//       setItems(data.items || []);
//     } catch (e) {
//       setError(e.message || 'Unable to load wholesalers.');
//     }
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load]);

//   // Load active shops for the Add Wholesaler popup.
//   const loadShops = async () => {
//     setShopsLoading(true);
//     setError('');

//     try {
//       const data = await api.get('/admin/shops?page=1&pageSize=100');

//       const activeShops = (data.items || []).filter(
//         (shop) => !shop.status || shop.status === 'active'
//       );

//       setShops(activeShops);
//     } catch (e) {
//       setError(e.message || 'Unable to load shops.');
//       setShops([]);
//     } finally {
//       setShopsLoading(false);
//     }
//   };

//   const set = (key) => (e) => {
//     setForm((previous) => ({
//       ...previous,
//       [key]: e.target.value,
//     }));
//   };

//   const openAdd = () => {
//     setEditing(null);
//     setForm(empty);
//     setSelectedShopId('');
//     setDetails({});
//     setError('');
//     setModalOpen(true);

//     loadShops();
//   };

//   const openEdit = (item) => {
//     setEditing(item.id);
//     setForm({
//       name: item.name || '',
//       contactEmail: item.contactEmail || '',
//       contactPhone: item.contactPhone || '',
//       gstNumber: item.gstNumber || '',
//       address: item.address || '',
//     });
//     setSelectedShopId('');
//     setDetails({});
//     setError('');
//     setModalOpen(true);
//   };

//   const closeModal = () => {
//     if (busy) return;

//     setModalOpen(false);
//     setEditing(null);
//     setForm(empty);
//     setSelectedShopId('');
//     setDetails({});
//     setError('');
//   };

//   const save = async (e) => {
//     e.preventDefault();

//     if (!editing && !selectedShopId) {
//       setError('Please select a shop before adding the wholesaler.');
//       setDetails({
//         shopId: ['Please select a shop'],
//       });
//       return;
//     }

//     setBusy(true);
//     setError('');
//     setDetails({});

//     try {
//       if (editing) {
//         await api.patch(`/admin/wholesalers/${editing}`, form);
//       } else {
//         await api.post('/admin/wholesalers', {
//           ...form,
//           shopId: Number(selectedShopId),
//         });
//       }

//       setModalOpen(false);
//       setEditing(null);
//       setForm(empty);
//       setSelectedShopId('');
//       setDetails({});

//       await load();
//     } catch (err) {
//       setError(err.message || 'Unable to save wholesaler.');
//       setDetails(err.details || {});
//     } finally {
//       setBusy(false);
//     }
//   };

//   const toggle = async (wholesaler) => {
//     if (updatingStatusId === wholesaler.id) return;

//     const next =
//       wholesaler.status === 'active' ? 'inactive' : 'active';

//     if (
//       !window.confirm(
//         `${next === 'inactive' ? 'Deactivate' : 'Activate'} ${wholesaler.name}?`
//       )
//     ) {
//       return;
//     }

//     setError('');
//     setUpdatingStatusId(wholesaler.id);

//     try {
//       await api.patch(`/admin/wholesalers/${wholesaler.id}`, {
//         status: next,
//       });

//       await load();
//     } catch (err) {
//       setError(err.message || 'Unable to update wholesaler status.');
//     } finally {
//       setUpdatingStatusId(null);
//     }
//   };

//   return (
//     <div className="space-y-5">
//       <div className="flex flex-wrap items-start justify-between gap-3">
//         <PageHeader
//           title="Wholesalers"
//           subtitle="Manage wholesalers and their shop access."
//         />

//         <Button onClick={openAdd}>
//           + Add Wholesaler
//         </Button>
//       </div>

//       {error && !modalOpen && <Alert>{error}</Alert>}

//       {items === null ? (
//         <Spinner />
//       ) : (
//         <Card className="overflow-x-auto p-0">
//           <table className="min-w-full text-left text-sm">
//             <thead className="bg-slate-50 text-xs uppercase text-slate-500">
//               <tr>
//                 <th className="px-4 py-3">Name</th>
//                 <th className="px-4 py-3">Contact</th>
//                 <th className="px-4 py-3">GST number</th>
//                 <th className="px-4 py-3">Shops</th>
//                 <th className="px-4 py-3">Status</th>
//                 <th className="px-4 py-3 text-right">Actions</th>
//               </tr>
//             </thead>

//             <tbody className="divide-y divide-slate-100">
//               {items.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan={6}
//                     className="px-4 py-10 text-center text-slate-500"
//                   >
//                     No wholesalers found. Click Add Wholesaler to create one.
//                   </td>
//                 </tr>
//               )}

//               {items.map((wholesaler) => (
//                 <tr key={wholesaler.id}>
//                   <td className="px-4 py-3 font-medium text-slate-900">
//                     {wholesaler.name}
//                   </td>

//                   <td className="px-4 py-3 text-xs text-slate-600">
//                     {wholesaler.contactEmail || '—'}
//                     <div>{wholesaler.contactPhone || '—'}</div>
//                   </td>

//                   <td className="px-4 py-3 font-mono text-xs">
//                     {wholesaler.gstNumber || '—'}
//                   </td>

//                   <td className="px-4 py-3">
//                     {wholesaler.shopCount ?? 0}
//                   </td>

//                   {/* Status badge and compact toggle */}
//                   <td className="px-4 py-3">
//                     <div className="flex flex-col items-start gap-2">
//                       <Badge
//                         tone={
//                           wholesaler.status === 'active'
//                             ? 'green'
//                             : 'slate'
//                         }
//                       >
//                         {wholesaler.status === 'active'
//                           ? 'Active'
//                           : 'Inactive'}
//                       </Badge>

//                       <button
//                         type="button"
//                         onClick={() => toggle(wholesaler)}
//                         disabled={updatingStatusId === wholesaler.id}
//                         aria-label={`Change ${wholesaler.name} status`}
//                         aria-pressed={wholesaler.status === 'active'}
//                         title="Toggle wholesaler status"
//                         className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
//                           wholesaler.status === 'active'
//                             ? 'bg-green-600'
//                             : 'bg-slate-300'
//                         }`}
//                       >
//                         <span
//                           className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
//                             wholesaler.status === 'active'
//                               ? 'translate-x-6'
//                               : 'translate-x-1'
//                           }`}
//                         />
//                       </button>
//                     </div>
//                   </td>

//                   {/* Only Edit remains in Actions */}
//                   <td className="px-4 py-3">
//                     <div className="flex justify-end gap-2">
//                       <Button
//                         variant="secondary"
//                         onClick={() => openEdit(wholesaler)}
//                       >
//                         Edit
//                       </Button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </Card>
//       )}

//       {/* Add / Edit Wholesaler Popup */}
//       {modalOpen && (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
//           onClick={closeModal}
//         >
//           <div
//             role="dialog"
//             aria-modal="true"
//             aria-labelledby="wholesaler-modal-title"
//             className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
//             onClick={(e) => e.stopPropagation()}
//           >
//             {/* Popup heading and compact shop dropdown */}
//             <div className="mb-5 flex items-start justify-between gap-3">
//               <div className="min-w-0">
//                 <h2
//                   id="wholesaler-modal-title"
//                   className="text-lg font-semibold text-slate-900"
//                 >
//                   {editing ? 'Edit Wholesaler' : 'Add Wholesaler'}
//                 </h2>

//                 <p className="mt-1 text-sm text-slate-500">
//                   Enter wholesaler details below.
//                 </p>
//               </div>

//               <div className="flex shrink-0 items-center gap-2">
//                 {!editing && (
//                   <div className="w-36">
//                     <label
//                       htmlFor="wholesaler-shop"
//                       className="sr-only"
//                     >
//                       Select shop
//                     </label>

//                     <select
//                       id="wholesaler-shop"
//                       value={selectedShopId}
//                       onChange={(e) => {
//                         setSelectedShopId(e.target.value);
//                         setDetails((previous) => ({
//                           ...previous,
//                           shopId: undefined,
//                         }));
//                         setError('');
//                       }}
//                       disabled={shopsLoading || busy}
//                       required
//                       className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
//                     >
//                       <option value="">
//                         {shopsLoading ? 'Loading...' : 'Select Shop *'}
//                       </option>

//                       {shops.map((shop) => (
//                         <option key={shop.id} value={shop.id}>
//                           {shop.name}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 )}

//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   disabled={busy}
//                   aria-label="Close popup"
//                   className="rounded-md px-2 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 disabled:opacity-50"
//                 >
//                   &times;
//                 </button>
//               </div>
//             </div>

//             {error && (
//               <div className="mb-4">
//                 <Alert>{error}</Alert>
//               </div>
//             )}

//             {!editing && !shopsLoading && shops.length === 0 && (
//               <div className="mb-4">
//                 <Alert>
//                   No active shops are available. Please activate or create a
//                   shop before adding a wholesaler.
//                 </Alert>
//               </div>
//             )}

//             {!editing && fieldError(details, 'shopId') && (
//               <p className="mb-3 text-xs text-red-600">
//                 {fieldError(details, 'shopId')}
//               </p>
//             )}

//             <form onSubmit={save} className="space-y-4">
//               <Field
//                 label="Name"
//                 required
//                 error={fieldError(details, 'name')}
//               >
//                 <Input
//                   value={form.name}
//                   onChange={set('name')}
//                   required
//                   placeholder="Enter wholesaler name"
//                 />
//               </Field>

//               <Field
//                 label="Contact email"
//                 error={fieldError(details, 'contactEmail')}
//               >
//                 <Input
//                   type="email"
//                   value={form.contactEmail}
//                   onChange={set('contactEmail')}
//                   placeholder="Enter email address"
//                 />
//               </Field>

//               <Field
//                 label="Contact phone"
//                 error={fieldError(details, 'contactPhone')}
//               >
//                 <Input
//                   type="tel"
//                   inputMode="numeric"
//                   value={form.contactPhone}
//                   onChange={(e) =>
//                     setForm((previous) => ({
//                       ...previous,
//                       contactPhone: e.target.value.replace(/\D/g, ''),
//                     }))
//                   }
//                   maxLength={10}
//                   placeholder="Enter 10-digit mobile number"
//                 />
//               </Field>

//               <Field
//                 label="GST number"
//                 error={fieldError(details, 'gstNumber')}
//                 hint="Optional; enter the registered 15-character GSTIN."
//               >
//                 <Input
//                   value={form.gstNumber}
//                   onChange={set('gstNumber')}
//                   maxLength={15}
//                   placeholder="Enter GSTIN"
//                 />
//               </Field>

//               <Field label="Address">
//                 <Textarea
//                   value={form.address}
//                   onChange={set('address')}
//                   placeholder="Enter wholesaler address"
//                 />
//               </Field>

//               <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   onClick={closeModal}
//                   disabled={busy}
//                 >
//                   Cancel
//                 </Button>

//                 <Button
//                   type="submit"
//                   loading={busy}
//                   disabled={
//                     busy ||
//                     (!editing &&
//                       (shopsLoading || shops.length === 0 || !selectedShopId))
//                   }
//                 >
//                   {editing ? 'Save Changes' : 'Add Wholesaler'}
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



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
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [shopsLoading, setShopsLoading] = useState(false);

  const [form, setForm] = useState(empty);
  const [details, setDetails] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
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

  // Load active shops for the Add Wholesaler popup.
  const loadShops = async () => {
    setShopsLoading(true);
    setError('');

    try {
      const data = await api.get('/admin/shops?page=1&pageSize=100');

      const activeShops = (data.items || []).filter(
        (shop) => !shop.status || shop.status === 'active'
      );

      setShops(activeShops);
    } catch (e) {
      setError(e.message || 'Unable to load shops.');
      setShops([]);
    } finally {
      setShopsLoading(false);
    }
  };

  const set = (key) => (e) => {
    setForm((previous) => ({
      ...previous,
      [key]: e.target.value,
    }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setSelectedShopId('');
    setDetails({});
    setError('');
    setModalOpen(true);

    loadShops();
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
    setSelectedShopId('');
    setDetails({});
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busy) return;

    setModalOpen(false);
    setEditing(null);
    setForm(empty);
    setSelectedShopId('');
    setDetails({});
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();

    if (!editing && !selectedShopId) {
      setError('Please select a shop before adding the wholesaler.');
      setDetails({
        shopId: ['Please select a shop'],
      });
      return;
    }

    setBusy(true);
    setError('');
    setDetails({});

    try {
      if (editing) {
        await api.patch(`/admin/wholesalers/${editing}`, form);
      } else {
        await api.post('/admin/wholesalers', {
          ...form,
          shopId: Number(selectedShopId),
        });
      }

      setModalOpen(false);
      setEditing(null);
      setForm(empty);
      setSelectedShopId('');
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
    if (updatingStatusId === wholesaler.id) return;

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
    setUpdatingStatusId(wholesaler.id);

    try {
      await api.patch(`/admin/wholesalers/${wholesaler.id}`, {
        status: next,
      });

      await load();
    } catch (err) {
      setError(err.message || 'Unable to update wholesaler status.');
    } finally {
      setUpdatingStatusId(null);
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
                    <div className="flex flex-col items-start gap-2">
                      <Badge
                        tone={
                          wholesaler.status === 'active'
                            ? 'green'
                            : 'slate'
                        }
                      >
                        {wholesaler.status === 'active'
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>

                      <button
                        type="button"
                        onClick={() => toggle(wholesaler)}
                        disabled={updatingStatusId === wholesaler.id}
                        aria-label={`Change ${wholesaler.name} status`}
                        aria-pressed={wholesaler.status === 'active'}
                        title="Toggle wholesaler status"
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          wholesaler.status === 'active'
                            ? 'bg-green-600'
                            : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            wholesaler.status === 'active'
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => openEdit(wholesaler)}
                      >
                        Edit
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
            {/* Popup heading */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
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

            {error && (
              <div className="mb-4">
                <Alert>{error}</Alert>
              </div>
            )}

            {!editing && !shopsLoading && shops.length === 0 && (
              <div className="mb-4">
                <Alert>
                  No active shops are available. Please activate or create a
                  shop before adding a wholesaler.
                </Alert>
              </div>
            )}

            <form onSubmit={save} className="space-y-4">
              {/* Select Shop is now part of the form */}
              {!editing && (
                <Field
                  label="Select Shop"
                  required
                  error={fieldError(details, 'shopId')}
                >
                  <select
                    id="wholesaler-shop"
                    value={selectedShopId}
                    onChange={(e) => {
                      setSelectedShopId(e.target.value);
                      setDetails((previous) => ({
                        ...previous,
                        shopId: undefined,
                      }));
                      setError('');
                    }}
                    disabled={shopsLoading || busy}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {shopsLoading ? 'Loading shops...' : 'Select a shop'}
                    </option>

                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

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
                      contactPhone: e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 10),
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

                <Button
                  type="submit"
                  loading={busy}
                  disabled={
                    busy ||
                    (!editing &&
                      (shopsLoading || shops.length === 0 || !selectedShopId))
                  }
                >
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
