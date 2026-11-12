

// import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import { api } from '../../services/api.js';
// import { useAuth } from '../../context/AuthContext.jsx';
// import { hasPermission } from '../../services/permissions.js';
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

// const emptyForm = {
//   name: '',
//   contactPerson: '',
//   contactPhone: '',
//   contactEmail: '',
//   gstNumber: '',
//   address: '',
//   status: 'active',
// };

// const money = (value) =>
//   `₹${Number(value || 0).toLocaleString('en-IN', {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   })}`;

// const date = (value) => (value ? new Date(value).toLocaleDateString() : '—');

// const statusClass = (status) => {
//   const colors = {
//     completed: 'bg-emerald-100 text-emerald-800',
//     received: 'bg-teal-100 text-teal-800',
//     dispatched: 'bg-indigo-100 text-indigo-800',
//     accepted: 'bg-blue-100 text-blue-800',
//     submitted: 'bg-amber-100 text-amber-800',
//     rejected: 'bg-rose-100 text-rose-800',
//     cancelled: 'bg-slate-100 text-slate-700',
//   };
//   return colors[status] || 'bg-slate-100 text-slate-700';
// };

// function Modal({ title, onClose, children, showFooterClose = true }) {
//   return (
//     <div className="fixed inset-y-0 left-0 right-0 z-40 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5 lg:left-64">
//       <section
//         role="dialog"
//         aria-modal="true"
//         aria-label={title}
//         className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-6"
//       >
//         <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
//           <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

//           <button
//             type="button"
//             onClick={onClose}
//             aria-label="Close dialog"
//             className="rounded px-2 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
//           >
//             ×
//           </button>
//         </div>

//         {children}

//         {showFooterClose && (
//           <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
//             <Button type="button" variant="secondary" onClick={onClose}>
//               Close
//             </Button>
//           </div>
//         )}
//       </section>
//     </div>
//   );
// }

// export default function ShopWholesalers() {
//   const { user } = useAuth();

//   const can = (permission) =>
//     user?.shop?.role === 'shop_owner' ||
//     hasPermission(user?.permissions, permission);

//   const canCreate = can('wholesalers.create');
//   const canEdit = can('wholesalers.update') || canCreate;
//   const canBookOrders = canCreate;

//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState('');
//   const [query, setQuery] = useState('');

//   const [updatingStatusId, setUpdatingStatusId] = useState(null);

//   const [openMenuId, setOpenMenuId] = useState(null);
//   const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
//   const menuButtonRef = useRef(null);

//   const [modal, setModal] = useState(null);
//   const [form, setForm] = useState(emptyForm);
//   const [editLoadedId, setEditLoadedId] = useState(null);
//   const [formErrors, setFormErrors] = useState({});
//   const [formError, setFormError] = useState('');
//   const [busy, setBusy] = useState(false);
//   const [notice, setNotice] = useState(null);

//   const [modalLoading, setModalLoading] = useState(false);
//   const [modalError, setModalError] = useState('');
//   const [modalSuccess, setModalSuccess] = useState('');
//   const [purchaseOrders, setPurchaseOrders] = useState([]);
//   const [documents, setDocuments] = useState([]);
//   const [payments, setPayments] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [orderItems, setOrderItems] = useState([]);
//   const [orderNotes, setOrderNotes] = useState('');
//   const [poDetails, setPoDetails] = useState(null);
//   const [billFile, setBillFile] = useState(null);
//   const [billPoId, setBillPoId] = useState('');
//   const [billNumber, setBillNumber] = useState('');
//   const [billDate, setBillDate] = useState('');
//   const [billAmount, setBillAmount] = useState('');
//   const [billNotes, setBillNotes] = useState('');
//   const [paymentAmount, setPaymentAmount] = useState('');
//   const [paymentDate, setPaymentDate] = useState(
//     new Date().toISOString().slice(0, 10),
//   );
//   const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
//   const [paymentReference, setPaymentReference] = useState('');
//   const [paymentPoId, setPaymentPoId] = useState('');
//   const [paymentNotes, setPaymentNotes] = useState('');
//   const [showPaymentForm, setShowPaymentForm] = useState(false);

//   const updateMenuPosition = useCallback((button) => {
//     if (!button) return;

//     const rect = button.getBoundingClientRect();
//     const menuWidth = 240;
//     const menuHeight = 220;
//     const screenPadding = 8;

//     let left = rect.left + rect.width / 2 - menuWidth / 2;
//     let top = rect.top + rect.height / 2 - menuHeight / 2;

//     left = Math.max(
//       screenPadding,
//       Math.min(left, window.innerWidth - menuWidth - screenPadding),
//     );

//     top = Math.max(
//       screenPadding,
//       Math.min(top, window.innerHeight - menuHeight - screenPadding),
//     );

//     setMenuPosition({ top, left });
//   }, []);

//   useEffect(() => {
//     if (openMenuId === null) return undefined;

//     const repositionMenu = () => {
//       if (menuButtonRef.current) {
//         updateMenuPosition(menuButtonRef.current);
//       }
//     };

//     window.addEventListener('scroll', repositionMenu, true);
//     window.addEventListener('resize', repositionMenu);
//     repositionMenu();

//     return () => {
//       window.removeEventListener('scroll', repositionMenu, true);
//       window.removeEventListener('resize', repositionMenu);
//     };
//   }, [openMenuId, updateMenuPosition]);

//   const toggleActionsMenu = (event, itemId) => {
//     if (openMenuId === itemId) {
//       setOpenMenuId(null);
//       menuButtonRef.current = null;
//       return;
//     }

//     menuButtonRef.current = event.currentTarget;
//     updateMenuPosition(event.currentTarget);
//     setOpenMenuId(itemId);
//   };

//   const closeActionsMenu = () => {
//     setOpenMenuId(null);
//     menuButtonRef.current = null;
//   };

//   const loadWholesalers = useCallback(async () => {
//     setLoading(true);
//     setLoadError('');

//     try {
//       const response = await api.get('/shop/wholesalers');
//       setItems(Array.isArray(response.items) ? response.items : []);
//     } catch (error) {
//       setLoadError(error.message || 'Unable to load authorized wholesalers.');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadWholesalers();
//   }, [loadWholesalers]);

//   const filteredItems = useMemo(() => {
//     const needle = query.trim().toLowerCase();

//     return items.filter((item) => {
//       const text = [
//         item.code,
//         item.name,
//         item.contactPerson,
//         item.contactPhone,
//       ]
//         .filter(Boolean)
//         .join(' ')
//         .toLowerCase();

//       return !needle || text.includes(needle);
//     });
//   }, [items, query]);

//   const activeWholesaler = modal?.wholesaler;

//   const closeModal = () => {
//     if (busy) return;

//     setModal(null);
//     setEditLoadedId(null);
//     setModalError('');
//     setModalSuccess('');
//     setPoDetails(null);
//     setShowPaymentForm(false);
//   };

//   const toggleWholesalerStatus = async (item) => {
//     if (updatingStatusId !== null) return;

//     const newStatus = item.status === 'active' ? 'inactive' : 'active';

//     setUpdatingStatusId(item.id);
//     setNotice(null);

//     try {
//       await api.patch(`/shop/wholesalers/${encodeURIComponent(item.id)}`, {
//         status: newStatus,
//       });

//       setItems((current) =>
//         current.map((wholesaler) =>
//           String(wholesaler.id) === String(item.id)
//             ? { ...wholesaler, status: newStatus }
//             : wholesaler,
//         ),
//       );

//       setNotice({
//         kind: 'success',
//         text: `${item.name} is now ${newStatus}.`,
//       });
//     } catch (error) {
//       setNotice({
//         kind: 'error',
//         text: error.message || 'Unable to update wholesaler status.',
//       });
//     } finally {
//       setUpdatingStatusId(null);
//     }
//   };

//   const openEditWholesaler = (wholesaler) => {
//     closeActionsMenu();
//     setEditLoadedId(null);

//     setForm({
//       name: wholesaler.name || '',
//       contactPerson: wholesaler.contactPerson || '',
//       contactPhone: wholesaler.contactPhone || '',
//       contactEmail: wholesaler.contactEmail || '',
//       gstNumber: wholesaler.gstNumber || '',
//       address: wholesaler.address || '',
//       status: wholesaler.status || 'active',
//     });

//     setFormErrors({});
//     setFormError('');
//     setNotice(null);
//     setModal({ action: 'edit', wholesaler });
//   };

//   const openAction = (wholesaler, action) => {
//     closeActionsMenu();

//     setModal({ action, wholesaler });
//     setModalError('');
//     setModalSuccess('');
//     setPoDetails(null);
//     setOrderItems([]);
//     setOrderNotes('');
//     setBillFile(null);
//     setBillPoId('');
//     setBillNumber('');
//     setBillDate('');
//     setBillAmount('');
//     setBillNotes('');
//     setPaymentAmount('');
//     setPaymentDate(new Date().toISOString().slice(0, 10));
//     setPaymentMethod('bank_transfer');
//     setPaymentReference('');
//     setPaymentPoId('');
//     setPaymentNotes('');
//     setShowPaymentForm(action === 'payments' && canCreate);
//   };

//   useEffect(() => {
//     if (!modal || !modal.wholesaler) return undefined;

//     let active = true;

//     const loadModalData = async () => {
//       setModalLoading(true);
//       setModalError('');

//       try {
//         const wholesalerId = encodeURIComponent(modal.wholesaler.id);

//         if (modal.action === 'edit') {
//           const response = await api.get(`/shop/wholesalers/${wholesalerId}`);
//           if (!active) return;

//           const item = response.item;
//           setForm({
//             name: item.name || '',
//             contactPerson: item.contactPerson || '',
//             contactPhone: item.contactPhone || '',
//             contactEmail: item.contactEmail || '',
//             gstNumber: item.gstNumber || '',
//             address: item.address || '',
//             status: item.status || 'active',
//           });
//           setEditLoadedId(String(item.id));
//         } else if (modal.action === 'book') {
//           const [catalog, wholesalerList] = await Promise.all([
//             api.get('/shop/catalog/products'),
//             api.get('/shop/wholesalers'),
//           ]);

//           if (!active) return;

//           const isAuthorizedActive = (wholesalerList.items || []).some(
//             (item) =>
//               String(item.id) === String(modal.wholesaler.id) &&
//               item.status === 'active',
//           );

//           if (!isAuthorizedActive) {
//             setModalError(
//               'Purchase orders can only be placed with an active authorized wholesaler.',
//             );
//             return;
//           }

//           const variants = (catalog.items || []).flatMap((product) =>
//             (product.variants || []).map((variant) => ({
//               productId: product.id,
//               productName: product.name,
//               productVariantId: variant.id,
//               variantName: variant.variantName,
//               unitPrice: Number(variant.wholesalePrice || variant.price || 0),
//             })),
//           );

//           setProducts(variants);

//           if (variants.length) {
//             setOrderItems([
//               {
//                 productId: variants[0].productId,
//                 productVariantId: variants[0].productVariantId,
//                 quantity: 1,
//                 unitPrice: variants[0].unitPrice,
//               },
//             ]);
//           }
//         } else if (modal.action === 'orders') {
//           const response = await api.get(
//             `/shop/wholesale-orders?wholesalerId=${wholesalerId}`,
//           );

//           if (active) setPurchaseOrders(response.items || []);
//         } else if (modal.action === 'bills') {
//           const [billResponse, poResponse] = await Promise.all([
//             api.get(`/shop/bills?wholesalerId=${wholesalerId}`),
//             api.get(`/shop/wholesale-orders?wholesalerId=${wholesalerId}`),
//           ]);

//           if (!active) return;

//           setDocuments(
//             (billResponse.items || []).filter(
//               (item) =>
//                 String(item.wholesalerId) === String(modal.wholesaler.id),
//             ),
//           );

//           setPurchaseOrders(poResponse.items || []);
//         } else if (modal.action === 'payments') {
//           const [paymentResponse, poResponse, wholesalerResponse] =
//             await Promise.all([
//               api.get(`/shop/wholesale-payments?wholesalerId=${wholesalerId}`),
//               api.get(`/shop/wholesale-orders?wholesalerId=${wholesalerId}`),
//               api.get('/shop/wholesalers'),
//             ]);

//           if (!active) return;

//           setPayments(
//             (paymentResponse.items || []).filter(
//               (item) =>
//                 String(item.wholesalerId) === String(modal.wholesaler.id),
//             ),
//           );

//           setPurchaseOrders(poResponse.items || []);

//           const currentWholesaler = (wholesalerResponse.items || []).find(
//             (item) => String(item.id) === String(modal.wholesaler.id),
//           );

//           setModal((current) =>
//             current
//               ? {
//                   ...current,
//                   wholesaler: {
//                     ...current.wholesaler,
//                     outstandingAmount:
//                       currentWholesaler?.outstandingAmount || 0,
//                   },
//                 }
//               : current,
//           );
//         }
//       } catch (error) {
//         if (active) {
//           const message = error.message || 'Unable to load wholesaler information.';
//           if (modal.action === 'edit') {
//             setFormError(message);
//           } else {
//             setModalError(message);
//           }
//         }
//       } finally {
//         if (active) setModalLoading(false);
//       }
//     };

//     loadModalData();

//     return () => {
//       active = false;
//     };
//   }, [modal?.action, modal?.wholesaler?.id]);
//     const setField = (field) => (event) => {
//     setForm((current) => ({
//       ...current,
//       [field]: event.target.value,
//     }));

//     setFormErrors((current) => ({
//       ...current,
//       [field]: undefined,
//     }));
//   };

//   const saveWholesaler = async (event) => {
//     event.preventDefault();

//     const isEditing = modal?.action === 'edit';

//     if (
//       isEditing &&
//       String(editLoadedId) !== String(modal.wholesaler.id)
//     ) {
//       setFormError(
//         'Wholesaler details have not loaded. Please close and reopen the editor.',
//       );
//       return;
//     }

//     setBusy(true);
//     setFormError('');
//     setFormErrors({});
//     setNotice(null);

//     const payload = {
//       ...form,
//       contactEmail: form.contactEmail || undefined,
//       gstNumber: form.gstNumber || undefined,
//       address: form.address || undefined,
//     };

//     try {
//       if (isEditing) {
//         await api.patch(
//           `/shop/wholesalers/${encodeURIComponent(modal.wholesaler.id)}`,
//           payload,
//         );
//       } else {
//         await api.post('/shop/wholesalers', payload);
//       }

//       setForm(emptyForm);
//       setModal(null);
//       setNotice({
//         kind: 'success',
//         text: isEditing
//           ? 'Wholesaler details updated successfully.'
//           : 'Wholesaler created and authorized for this shop.',
//       });

//       await loadWholesalers();
//     } catch (error) {
//       setFormError(
//         error.message ||
//           (isEditing
//             ? 'Unable to update wholesaler.'
//             : 'Unable to create wholesaler.'),
//       );
//       setFormErrors(error.details || {});
//     } finally {
//       setBusy(false);
//     }
//   };

//   const changeOrderItem = (index, field, value) => {
//     setOrderItems((current) =>
//       current.map((item, itemIndex) => {
//         if (itemIndex !== index) return item;

//         if (field === 'productVariantId') {
//           const variant = products.find(
//             (product) => String(product.productVariantId) === value,
//           );

//           return variant
//             ? {
//                 ...item,
//                 productId: variant.productId,
//                 productVariantId: variant.productVariantId,
//                 unitPrice: variant.unitPrice,
//               }
//             : item;
//         }

//         return { ...item, [field]: value };
//       }),
//     );
//   };

//   const placeOrder = async (event) => {
//     event.preventDefault();

//     setBusy(true);
//     setModalError('');
//     setModalSuccess('');

//     try {
//       await api.post('/shop/wholesale-orders', {
//         wholesalerId: Number(activeWholesaler.id),
//         notes: orderNotes || undefined,
//         items: orderItems.map((item) => ({
//           productId: Number(item.productId),
//           productVariantId: Number(item.productVariantId),
//           quantity: Number(item.quantity),
//           unitPrice: Number(item.unitPrice),
//         })),
//       });

//       setModalSuccess('Purchase order placed successfully.');
//       setOrderItems([]);
//       setOrderNotes('');

//       const [orderResponse] = await Promise.all([
//         api.get(
//           `/shop/wholesale-orders?wholesalerId=${encodeURIComponent(activeWholesaler.id)}`,
//         ),
//         loadWholesalers(),
//       ]);

//       setPurchaseOrders(orderResponse.items || []);
//     } catch (error) {
//       setModalError(error.message || 'Unable to place purchase order.');
//     } finally {
//       setBusy(false);
//     }
//   };

//   const uploadBill = async (event) => {
//     event.preventDefault();

//     if (!billFile) {
//       setModalError('Choose a bill or invoice file to upload.');
//       return;
//     }

//     setBusy(true);
//     setModalError('');
//     setModalSuccess('');

//     try {
//       const formData = new FormData();

//       formData.append('file', billFile);
//       formData.append('documentType', 'bill');
//       formData.append('wholesalerId', String(activeWholesaler.id));

//       if (billPoId) {
//         formData.append('purchaseOrderId', billPoId);
//       }

//       const metadata = [
//         billNumber && `Bill: ${billNumber}`,
//         billDate && `Date: ${billDate}`,
//         billAmount && `Amount: ${billAmount}`,
//         billNotes,
//       ]
//         .filter(Boolean)
//         .join(' | ');

//       if (metadata) formData.append('notes', metadata);

//       await api.upload('/shop/bills', formData);

//       setModalSuccess('Bill uploaded successfully.');
//       setBillFile(null);
//       setBillNumber('');
//       setBillDate('');
//       setBillAmount('');
//       setBillNotes('');

//       const response = await api.get(
//         `/shop/bills?wholesalerId=${encodeURIComponent(activeWholesaler.id)}`,
//       );

//       setDocuments(response.items || []);
//       await loadWholesalers();
//       event.target.reset();
//     } catch (error) {
//       setModalError(error.message || 'Unable to upload the bill.');
//     } finally {
//       setBusy(false);
//     }
//   };

//   const recordPayment = async (event) => {
//     event.preventDefault();

//     setBusy(true);
//     setModalError('');
//     setModalSuccess('');

//     try {
//       await api.post('/shop/wholesale-payments', {
//         wholesalerId: Number(activeWholesaler.id),
//         purchaseOrderId: paymentPoId ? Number(paymentPoId) : undefined,
//         amount: Number(paymentAmount),
//         paymentMethod,
//         paymentDate,
//         referenceNumber: paymentReference || undefined,
//         notes: paymentNotes || undefined,
//       });

//       setModalSuccess(
//         'Payment record saved. This records a payment made outside the application.',
//       );

//       setPaymentAmount('');
//       setPaymentReference('');
//       setPaymentNotes('');

//       const [paymentResponse, wholesalerResponse] = await Promise.all([
//         api.get(
//           `/shop/wholesale-payments?wholesalerId=${encodeURIComponent(activeWholesaler.id)}`,
//         ),
//         api.get('/shop/wholesalers'),
//       ]);

//       setPayments(paymentResponse.items || []);

//       const currentWholesaler = (wholesalerResponse.items || []).find(
//         (item) => String(item.id) === String(activeWholesaler.id),
//       );

//       if (currentWholesaler) {
//         setModal((current) =>
//           current
//             ? {
//                 ...current,
//                 wholesaler: {
//                   ...current.wholesaler,
//                   outstandingAmount: currentWholesaler.outstandingAmount,
//                 },
//               }
//             : current,
//         );
//       }

//       await loadWholesalers();
//     } catch (error) {
//       setModalError(error.message || 'Unable to record payment.');
//     } finally {
//       setBusy(false);
//     }
//   };

//   const openOrderDetails = async (order) => {
//     setModalError('');

//     try {
//       const response = await api.get(`/shop/wholesale-orders/${order.id}`);
//       setPoDetails(response.purchaseOrder);
//     } catch (error) {
//       setModalError(error.message || 'Unable to load purchase order details.');
//     }
//   };

//   const actionTitle = {
//     book: 'Book Wholesale Order',
//     orders: 'Purchase Orders',
//     bills: 'Upload Bills',
//     payments: 'Payment History',
//   };

//   const modalTitle = activeWholesaler
//     ? `${actionTitle[modal.action]} · ${activeWholesaler.name}`
//     : '';

//   return (
//     <div className="space-y-5">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//         <PageHeader
//           title="Manage Wholesalers"
//           subtitle="Manage your authorized wholesalers and wholesale activity."
//         />

//         {canCreate && (
//           <Button
//             type="button"
//             onClick={() => {
//               setForm(emptyForm);
//               setFormError('');
//               setFormErrors({});
//               setNotice(null);
//               setModal({ action: 'create' });
//             }}
//           >
//             + Create Wholesaler
//           </Button>
//         )}
//       </div>

//       {loadError && <Alert>{loadError}</Alert>}
//       {notice && <Alert kind={notice.kind}>{notice.text}</Alert>}

//       <Card className="p-0">
//         <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
//           <Input
//             aria-label="Search wholesalers"
//             value={query}
//             onChange={(event) => setQuery(event.target.value)}
//             placeholder="Search code, wholesaler, contact or phone"
//           />
//         </div>

//         {loading ? (
//           <Spinner label="Loading wholesalers…" />
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-[900px] w-full text-left text-sm">
//               <thead className="bg-slate-50 text-xs uppercase text-slate-500">
//                 <tr>
//                   <th className="px-4 py-3 font-medium">Code</th>
//                   <th className="px-4 py-3 font-medium">Wholesaler</th>
//                   <th className="px-4 py-3 font-medium">Contact</th>
//                   <th className="px-4 py-3 font-medium">Status</th>
//                   <th className="px-4 py-3 font-medium">Open POs</th>
//                   <th className="px-4 py-3 font-medium">Outstanding</th>
//                   <th className="px-4 py-3 font-medium">Actions</th>
//                 </tr>
//               </thead>

//               <tbody className="divide-y divide-slate-100">
//                 {filteredItems.map((item) => (
//                   <tr key={item.id}>
//                     <td className="px-4 py-3 font-mono text-xs text-slate-600">
//                       {item.code}
//                     </td>

//                     <td className="px-4 py-3 font-medium text-slate-900">
//                       {item.name}
//                     </td>

//                     <td className="px-4 py-3 text-slate-600">
//                       <div>{item.contactPerson || '—'}</div>
//                       <div className="text-xs">{item.contactPhone || '—'}</div>
//                     </td>

//                     <td className="px-4 py-3">
//   <div className="flex flex-col items-start gap-2">
//     <Badge
//       tone={
//         item.status === 'active'
//           ? 'green'
//           : 'amber'
//       }
//     >
//       {item.status === 'active' ? 'Active' : 'Inactive'}
//     </Badge>

//     <button
//       type="button"
//       onClick={() => toggleWholesalerStatus(item)}
//       disabled={updatingStatusId === item.id}
//       aria-label={`Change ${item.name} status`}
//       aria-pressed={item.status === 'active'}
//       title="Toggle wholesaler status"
//       className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
//         item.status === 'active'
//           ? 'bg-green-600'
//           : 'bg-slate-300'
//       }`}
//     >
//       <span
//         className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
//           item.status === 'active'
//             ? 'translate-x-6'
//             : 'translate-x-1'
//         }`}
//       />
//     </button>
//   </div>
// </td>

//                     {/* <td className="px-4 py-3">
//                       <button
//                         type="button"
//                         disabled={updatingStatusId !== null}
//                         onClick={() => toggleWholesalerStatus(item)}
//                         aria-pressed={item.status === 'active'}
//                         aria-label={`Wholesaler ${item.name} is ${item.status}. Click to ${
//                           item.status === 'active' ? 'deactivate' : 'activate'
//                         }`}
//                         className={`relative inline-flex h-7 w-24 items-center rounded-full px-1 transition-colors disabled:cursor-wait disabled:opacity-60 ${
//                           item.status === 'active'
//                             ? 'bg-emerald-600'
//                             : 'bg-slate-400'
//                         }`}
//                       >
//                         <span
//                           className={`absolute text-xs font-semibold text-white ${
//                             item.status === 'active' ? 'left-2' : 'right-2'
//                           }`}
//                         >
//                           {updatingStatusId === item.id
//                             ? 'Saving...'
//                             : item.status === 'active'
//                               ? 'Active'
//                               : 'Inactive'}
//                         </span>

//                         <span
//                           className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
//                             item.status === 'active'
//                               ? 'translate-x-[4.25rem]'
//                               : 'translate-x-0'
//                           }`}
//                         />
//                       </button>
//                     </td> */}

//                     <td className="px-4 py-3">
//                       {item.openPurchaseOrders ?? 0}
//                     </td>

//                     <td className="px-4 py-3">
//                       {money(item.outstandingAmount)}
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="flex items-center gap-2">
//                         {canEdit && (
//                           <Button
//                             type="button"
//                             size="sm"
//                             variant="secondary"
//                             onClick={() => openEditWholesaler(item)}
//                           >
//                             Edit
//                           </Button>
//                         )}

//                         <button
//                           ref={openMenuId === item.id ? menuButtonRef : null}
//                           type="button"
//                           aria-haspopup="menu"
//                           aria-expanded={openMenuId === item.id}
//                           onClick={(event) => toggleActionsMenu(event, item.id)}
//                           className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
//                         >
//                           Actions
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}

//                 {filteredItems.length === 0 && (
//                   <tr>
//                     <td
//                       colSpan="7"
//                       className="px-4 py-10 text-center text-slate-500"
//                     >
//                       {items.length
//                         ? 'No wholesalers match your search.'
//                         : 'No wholesalers are authorized for this shop yet.'}
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </Card>
//             {openMenuId !== null && (
//         <div
//           role="menu"
//           style={{
//             position: 'fixed',
//             top: menuPosition.top,
//             left: menuPosition.left,
//             width: '240px',
//             zIndex: 9999,
//           }}
//           className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
//         >
//           <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
//             <span className="text-sm font-semibold text-slate-700">
//               Manage Wholesaler
//             </span>

//             <button
//               type="button"
//               onClick={closeActionsMenu}
//               aria-label="Close Actions menu"
//               className="rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
//             >
//               ×
//             </button>
//           </div>

//           {[
//             ['book', 'Book Wholesale Order'],
//             ['orders', 'Purchase Orders'],
//             ['bills', 'Upload Bills'],
//             ['payments', 'Payment History'],
//           ]
//             .filter(([action]) => {
//               if (action === 'book') return canBookOrders;
//               if (action === 'bills') return canCreate;
//               return can('wholesalers.view');
//             })
//             .map(([action, label]) => (
//               <button
//                 key={action}
//                 type="button"
//                 role="menuitem"
//                 onClick={() => {
//                   const wholesaler = items.find(
//                     (item) => String(item.id) === String(openMenuId),
//                   );

//                   if (wholesaler) openAction(wholesaler, action);
//                 }}
//                 className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
//               >
//                 {label}
//               </button>
//             ))}
//         </div>
//       )}

//       {(modal?.action === 'create' && canCreate ||
//         modal?.action === 'edit' && canEdit) && (
//         <Modal
//           title={modal.action === 'edit' ? 'Edit Wholesaler' : 'Create Wholesaler'}
//           onClose={closeModal}
//           showFooterClose={false}
//         >
//           <form onSubmit={saveWholesaler} className="space-y-4">
//             {formError && <Alert>{formError}</Alert>}

//             <div className="grid gap-4 sm:grid-cols-2">
//               <Field
//                 label="Wholesaler / Business Name"
//                 required
//                 error={fieldError(formErrors, 'name')}
//               >
//                 <Input
//                   required
//                   minLength={2}
//                   maxLength={150}
//                   value={form.name}
//                   onChange={setField('name')}
//                 />
//               </Field>

//               <Field
//                 label="Contact Person"
//                 required
//                 error={fieldError(formErrors, 'contactPerson')}
//               >
//                 <Input
//                   required
//                   minLength={2}
//                   maxLength={120}
//                   value={form.contactPerson}
//                   onChange={setField('contactPerson')}
//                 />
//               </Field>

//               <Field
//                 label="Phone Number"
//                 required
//                 error={fieldError(formErrors, 'contactPhone')}
//               >
//                 <Input
//                   required
//                   type="tel"
//                   value={form.contactPhone}
//                   onChange={setField('contactPhone')}
//                 />
//               </Field>

//               <Field
//                 label="Email Address"
//                 error={fieldError(formErrors, 'contactEmail')}
//               >
//                 <Input
//                   type="email"
//                   value={form.contactEmail}
//                   onChange={setField('contactEmail')}
//                 />
//               </Field>

//               <Field label="GST Number">
//                 <Input
//                   maxLength={20}
//                   value={form.gstNumber}
//                   onChange={setField('gstNumber')}
//                 />
//               </Field>

//               <Field label="Status">
//                 <select
//                   className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
//                   value={form.status}
//                   onChange={setField('status')}
//                 >
//                   <option value="active">Active</option>
//                   <option value="inactive">Inactive</option>
//                 </select>
//               </Field>
//             </div>

//             <Field label="Address">
//               <Textarea
//                 maxLength={500}
//                 value={form.address}
//                 onChange={setField('address')}
//               />
//             </Field>

//             <div className="flex justify-end gap-3">
//               <Button
//                 type="button"
//                 variant="secondary"
//                 disabled={busy}
//                 onClick={closeModal}
//               >
//                 Cancel
//               </Button>

//               <Button
//                 type="submit"
//                 loading={busy}
//                 disabled={
//                   busy ||
//                   (modal.action === 'edit' &&
//                     (modalLoading ||
//                       String(editLoadedId) !== String(modal.wholesaler.id)))
//                 }
//               >
//                 {modal.action === 'edit' ? 'Save Changes' : 'Create Wholesaler'}
//               </Button>
//             </div>
//           </form>
//         </Modal>
//       )}
// {modal &&
//   activeWholesaler &&
//   ['book', 'orders', 'bills', 'payments'].includes(modal.action) && (
//     <Modal title={modalTitle} onClose={closeModal}>
//           {modalError && (
//             <div className="mb-4">
//               <Alert>{modalError}</Alert>
//             </div>
//           )}

//           {modalSuccess && (
//             <div className="mb-4">
//               <Alert kind="success">{modalSuccess}</Alert>
//             </div>
//           )}

//           {modal.action === 'book' &&
//             (modalLoading ? (
//               <Spinner label="Loading shop products…" />
//             ) : (
//               <form onSubmit={placeOrder} className="space-y-4">
//                 <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
//                   Supplier:{' '}
//                   <span className="font-semibold">
//                     {activeWholesaler.name}
//                   </span>
//                   {activeWholesaler.contactPhone
//                     ? ` · ${activeWholesaler.contactPhone}`
//                     : ''}
//                 </div>

//                 {!products.length ? (
//                   <p className="text-sm text-slate-500">
//                     No catalog products are available for purchase orders.
//                   </p>
//                 ) : (
//                   <>
//                     <div className="space-y-3">
//                       {orderItems.map((item, index) => (
//                         <div
//                           key={`${item.productVariantId}-${index}`}
//                           className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_100px_140px_auto]"
//                         >
//                           <Field label="Product / Variant">
//                             <select
//                               className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
//                               value={item.productVariantId}
//                               onChange={(event) =>
//                                 changeOrderItem(
//                                   index,
//                                   'productVariantId',
//                                   event.target.value,
//                                 )
//                               }
//                             >
//                               {products.map((product) => (
//                                 <option
//                                   key={product.productVariantId}
//                                   value={product.productVariantId}
//                                 >
//                                   {product.productName} · {product.variantName}
//                                 </option>
//                               ))}
//                             </select>
//                           </Field>

//                           <Field label="Quantity">
//                             <Input
//                               type="number"
//                               min="1"
//                               required
//                               value={item.quantity}
//                               onChange={(event) =>
//                                 changeOrderItem(
//                                   index,
//                                   'quantity',
//                                   event.target.value,
//                                 )
//                               }
//                             />
//                           </Field>

//                           <Field label="Unit price">
//                             <Input
//                               type="number"
//                               min="0.01"
//                               step="0.01"
//                               required
//                               value={item.unitPrice}
//                               onChange={(event) =>
//                                 changeOrderItem(
//                                   index,
//                                   'unitPrice',
//                                   event.target.value,
//                                 )
//                               }
//                             />
//                           </Field>

//                           <div className="flex items-end">
//                             <Button
//                               type="button"
//                               variant="secondary"
//                               disabled={orderItems.length <= 1}
//                               onClick={() =>
//                                 setOrderItems((current) =>
//                                   current.filter((_, row) => row !== index),
//                                 )
//                               }
//                             >
//                               Remove
//                             </Button>
//                           </div>

//                           <p className="text-sm text-slate-600 sm:col-span-4">
//                             Line total:{' '}
//                             {money(
//                               Number(item.quantity || 0) *
//                                 Number(item.unitPrice || 0),
//                             )}
//                           </p>
//                         </div>
//                       ))}
//                     </div>

//                     <Button
//                       type="button"
//                       variant="secondary"
//                       disabled={!products.length}
//                       onClick={() => {
//                         const first = products[0];

//                         setOrderItems((current) => [
//                           ...current,
//                           {
//                             productId: first.productId,
//                             productVariantId: first.productVariantId,
//                             quantity: 1,
//                             unitPrice: first.unitPrice,
//                           },
//                         ]);
//                       }}
//                     >
//                       + Add Product
//                     </Button>

//                     <p className="text-right text-lg font-semibold text-slate-900">
//                       Total:{' '}
//                       {money(
//                         orderItems.reduce(
//                           (sum, item) =>
//                             sum +
//                             Number(item.quantity || 0) *
//                               Number(item.unitPrice || 0),
//                           0,
//                         ),
//                       )}
//                     </p>

//                     <Field label="Notes">
//                       <Textarea
//                         value={orderNotes}
//                         onChange={(event) => setOrderNotes(event.target.value)}
//                       />
//                     </Field>

//                     <Button
//                       type="submit"
//                       loading={busy}
//                       disabled={!orderItems.length}
//                     >
//                       Place Order
//                     </Button>
//                   </>
//                 )}
//               </form>
//             ))}

//           {modal.action === 'orders' &&
//             (modalLoading ? (
//               <Spinner label="Loading purchase orders…" />
//             ) : (
//               <div className="space-y-4">
//                 {purchaseOrders.length ? (
//                   <div className="overflow-x-auto rounded-lg border border-slate-200">
//                     <table className="min-w-[620px] w-full text-left text-sm">
//                       <thead className="bg-slate-50 text-xs uppercase text-slate-500">
//                         <tr>
//                           <th className="px-3 py-3">PO Number</th>
//                           <th className="px-3 py-3">Order Date</th>
//                           <th className="px-3 py-3">Total Amount</th>
//                           <th className="px-3 py-3">Status</th>
//                           <th className="px-3 py-3">Action</th>
//                         </tr>
//                       </thead>

//                       <tbody className="divide-y divide-slate-100">
//                         {purchaseOrders.map((order) => (
//                           <tr key={order.id}>
//                             <td className="px-3 py-3 font-medium">
//                               {order.orderNumber}
//                             </td>
//                             <td className="px-3 py-3">
//                               {date(order.createdAt)}
//                             </td>
//                             <td className="px-3 py-3">
//                               {money(order.totalAmount)}
//                             </td>
//                             <td className="px-3 py-3">
//                               <span
//                                 className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(order.status)}`}
//                               >
//                                 {order.status}
//                               </span>
//                             </td>
//                             <td className="px-3 py-3">
//                               <button
//                                 type="button"
//                                 onClick={() => openOrderDetails(order)}
//                                 className="font-medium text-indigo-600 hover:underline"
//                               >
//                                 View details
//                               </button>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 ) : (
//                   <p className="py-8 text-center text-sm text-slate-500">
//                     No purchase orders for this wholesaler.
//                   </p>
//                 )}

//                 {poDetails && (
//                   <Card>
//                     <h3 className="font-semibold text-slate-900">
//                       Order {poDetails.orderNumber} details
//                     </h3>

//                     <div className="mt-3 overflow-x-auto">
//                       <table className="min-w-[500px] w-full text-left text-sm">
//                         <thead>
//                           <tr className="text-slate-500">
//                             <th className="py-2">Product</th>
//                             <th>Quantity</th>
//                             <th>Received</th>
//                             <th>Unit Price</th>
//                             <th>Amount</th>
//                           </tr>
//                         </thead>

//                         <tbody className="divide-y divide-slate-100">
//                           {(poDetails.items || []).map((item) => (
//                             <tr key={item.id}>
//                               <td className="py-2">
//                                 {item.productName} · {item.variantName}
//                               </td>
//                               <td>{item.quantity}</td>
//                               <td>{item.receivedQuantity}</td>
//                               <td>{money(item.unitPrice)}</td>
//                               <td>{money(item.totalPrice)}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   </Card>
//                 )}
//               </div>
//             ))}
//                       {modal.action === 'bills' &&
//             (modalLoading ? (
//               <Spinner label="Loading bills…" />
//             ) : (
//               <div className="space-y-6">
//                 <form
//                   onSubmit={uploadBill}
//                   className="space-y-4 rounded-lg border border-slate-200 p-4"
//                 >
//                   <p className="text-sm text-slate-600">
//                     Supplier:{' '}
//                     <span className="font-medium text-slate-900">
//                       {activeWholesaler.name}
//                     </span>
//                   </p>

//                   <div className="grid gap-4 sm:grid-cols-2">
//                     <Field label="Purchase Order">
//                       <select
//                         className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
//                         value={billPoId}
//                         onChange={(event) => setBillPoId(event.target.value)}
//                       >
//                         <option value="">No related purchase order</option>
//                         {purchaseOrders.map((order) => (
//                           <option key={order.id} value={order.id}>
//                             {order.orderNumber}
//                           </option>
//                         ))}
//                       </select>
//                     </Field>

//                     <Field label="Bill / Invoice Number">
//                       <Input
//                         maxLength={100}
//                         value={billNumber}
//                         onChange={(event) => setBillNumber(event.target.value)}
//                       />
//                     </Field>

//                     <Field label="Bill Date">
//                       <Input
//                         type="date"
//                         value={billDate}
//                         onChange={(event) => setBillDate(event.target.value)}
//                       />
//                     </Field>

//                     <Field label="Bill Amount">
//                       <Input
//                         type="number"
//                         min="0.01"
//                         step="0.01"
//                         value={billAmount}
//                         onChange={(event) => setBillAmount(event.target.value)}
//                       />
//                     </Field>

//                     <Field label="Invoice file (PDF, JPEG, PNG or WEBP)" required>
//                       <Input
//                         type="file"
//                         required
//                         accept="application/pdf,image/jpeg,image/png,image/webp"
//                         onChange={(event) =>
//                           setBillFile(event.target.files?.[0] || null)
//                         }
//                       />
//                     </Field>

//                     <Field label="Notes">
//                       <Input
//                         maxLength={500}
//                         value={billNotes}
//                         onChange={(event) => setBillNotes(event.target.value)}
//                       />
//                     </Field>
//                   </div>

//                   <Button type="submit" loading={busy}>
//                     Upload Bill
//                   </Button>
//                 </form>

//                 <div>
//                   <h3 className="mb-3 font-semibold text-slate-900">
//                     Uploaded bills
//                   </h3>

//                   {documents.length ? (
//                     <div className="overflow-x-auto rounded-lg border border-slate-200">
//                       <table className="min-w-[650px] w-full text-left text-sm">
//                         <thead className="bg-slate-50 text-xs uppercase text-slate-500">
//                           <tr>
//                             <th className="px-3 py-3">Document</th>
//                             <th className="px-3 py-3">Purchase Order</th>
//                             <th className="px-3 py-3">Date / Details</th>
//                             <th className="px-3 py-3">Download</th>
//                           </tr>
//                         </thead>

//                         <tbody className="divide-y divide-slate-100">
//                           {documents.map((document) => (
//                             <tr key={document.id}>
//                               <td className="px-3 py-3">
//                                 {document.originalFilename}
//                               </td>
//                               <td className="px-3 py-3">
//                                 {document.purchaseOrder?.orderNumber || '—'}
//                               </td>
//                               <td className="px-3 py-3">
//                                 <div>{date(document.createdAt)}</div>
//                                 <div className="text-xs text-slate-500">
//                                   {document.notes || '—'}
//                                 </div>
//                               </td>
//                               <td className="px-3 py-3">
//                                 <a
//                                   className="font-medium text-indigo-600 hover:underline"
//                                   href={`/api/v1/shop/bills/${document.id}/download`}
//                                 >
//                                   Download
//                                 </a>
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   ) : (
//                     <p className="py-5 text-center text-sm text-slate-500">
//                       No bills uploaded for this wholesaler.
//                     </p>
//                   )}
//                 </div>
//               </div>
//             ))}

//           {modal.action === 'payments' &&
//             (modalLoading ? (
//               <Spinner label="Loading payment history…" />
//             ) : (
//               <div className="space-y-5">
//                 <div className="flex flex-wrap items-center justify-between gap-3">
//                   <p className="text-sm text-slate-600">
//                     Outstanding balance:{' '}
//                     <span className="font-semibold text-slate-900">
//                       {money(activeWholesaler.outstandingAmount)}
//                     </span>
//                   </p>

//                   {canCreate && (
//                     <Button
//                       type="button"
//                       variant="secondary"
//                       onClick={() =>
//                         setShowPaymentForm((current) => !current)
//                       }
//                     >
//                       {showPaymentForm
//                         ? 'Hide Record Payment'
//                         : 'Record Payment'}
//                     </Button>
//                   )}
//                 </div>

//                 {showPaymentForm && (
//                   <form
//                     onSubmit={recordPayment}
//                     className="space-y-4 rounded-lg border border-slate-200 p-4"
//                   >
//                     <p className="text-xs text-slate-500">
//                       This records an external payment; it does not initiate a bank transfer.
//                     </p>

//                     <div className="grid gap-4 sm:grid-cols-2">
//                       <Field label="Amount" required>
//                         <Input
//                           type="number"
//                           min="0.01"
//                           step="0.01"
//                           max={activeWholesaler.outstandingAmount || 0}
//                           required
//                           value={paymentAmount}
//                           onChange={(event) =>
//                             setPaymentAmount(event.target.value)
//                           }
//                         />
//                       </Field>

//                       <Field label="Payment Date" required>
//                         <Input
//                           type="date"
//                           required
//                           value={paymentDate}
//                           onChange={(event) =>
//                             setPaymentDate(event.target.value)
//                           }
//                         />
//                       </Field>

//                       <Field label="Payment Method">
//                         <select
//                           className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
//                           value={paymentMethod}
//                           onChange={(event) =>
//                             setPaymentMethod(event.target.value)
//                           }
//                         >
//                           <option value="upi">UPI</option>
//                           <option value="bank_transfer">Bank Transfer</option>
//                           <option value="cash">Cash</option>
//                           <option value="cheque">Cheque</option>
//                         </select>
//                       </Field>

//                       <Field label="Related Purchase Order">
//                         <select
//                           className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
//                           value={paymentPoId}
//                           onChange={(event) =>
//                             setPaymentPoId(event.target.value)
//                           }
//                         >
//                           <option value="">No related purchase order</option>
//                           {purchaseOrders.map((order) => (
//                             <option key={order.id} value={order.id}>
//                               {order.orderNumber}
//                             </option>
//                           ))}
//                         </select>
//                       </Field>

//                       <Field label="Transaction / Receipt Reference">
//                         <Input
//                           maxLength={100}
//                           value={paymentReference}
//                           onChange={(event) =>
//                             setPaymentReference(event.target.value)
//                           }
//                         />
//                       </Field>

//                       <Field label="Remarks">
//                         <Input
//                           maxLength={500}
//                           value={paymentNotes}
//                           onChange={(event) =>
//                             setPaymentNotes(event.target.value)
//                           }
//                         />
//                       </Field>
//                     </div>

//                     <Button type="submit" loading={busy}>
//                       Save Payment Record
//                     </Button>
//                   </form>
//                 )}

//                 {payments.length ? (
//                   <div className="overflow-x-auto rounded-lg border border-slate-200">
//                     <table className="min-w-[700px] w-full text-left text-sm">
//                       <thead className="bg-slate-50 text-xs uppercase text-slate-500">
//                         <tr>
//                           <th className="px-3 py-3">Payment Date</th>
//                           <th className="px-3 py-3">Amount</th>
//                           <th className="px-3 py-3">Method</th>
//                           <th className="px-3 py-3">Reference</th>
//                           <th className="px-3 py-3">Purchase Order</th>
//                           <th className="px-3 py-3">Status</th>
//                         </tr>
//                       </thead>

//                       <tbody className="divide-y divide-slate-100">
//                         {payments.map((payment) => (
//                           <tr key={payment.id}>
//                             <td className="px-3 py-3">
//                               {date(payment.paymentDate || payment.createdAt)}
//                             </td>
//                             <td className="px-3 py-3">
//                               {money(payment.amount)}
//                             </td>
//                             <td className="px-3 py-3 capitalize">
//                               {(payment.paymentMethod || '').replace(/_/g, ' ')}
//                             </td>
//                             <td className="px-3 py-3">
//                               {payment.referenceNumber || '—'}
//                             </td>
//                             <td className="px-3 py-3">
//                               {payment.purchaseOrder?.orderNumber || '—'}
//                             </td>
//                             <td className="px-3 py-3">
//                               <Badge tone="green">Recorded</Badge>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 ) : (
//                   <p className="py-6 text-center text-sm text-slate-500">
//                     No payment records for this wholesaler.
//                   </p>
//                 )}
//               </div>
//             ))}
//         </Modal>
//       )}
//     </div>
//   );
// }


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasPermission } from '../../services/permissions.js';
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

const emptyForm = {
  name: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  gstNumber: '',
  address: '',
  status: 'active',
};

const isValidIndianMobile = (value) => /^[6-9]\d{9}$/.test(value);

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const date = (value) =>
  value ? new Date(value).toLocaleDateString() : '—';

const statusClass = (status) => {
  const colors = {
    completed: 'bg-emerald-100 text-emerald-800',
    received: 'bg-teal-100 text-teal-800',
    dispatched: 'bg-indigo-100 text-indigo-800',
    accepted: 'bg-blue-100 text-blue-800',
    submitted: 'bg-amber-100 text-amber-800',
    rejected: 'bg-rose-100 text-rose-800',
    cancelled: 'bg-slate-100 text-slate-700',
  };

  return colors[status] || 'bg-slate-100 text-slate-700';
};

function Modal({ title, onClose, children, showFooterClose = true }) {
  return (
    <div className="fixed inset-y-0 left-0 right-0 z-40 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5 lg:left-64">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded px-2 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        {children}

        {showFooterClose && (
          <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ShopWholesalers() {
  const { user } = useAuth();

  const can = (permission) =>
    user?.shop?.role === 'shop_owner' ||
    hasPermission(user?.permissions, permission);

  const canCreate = can('wholesalers.create');
  const canEdit = can('wholesalers.update') || canCreate;
  const canBookOrders = canCreate;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const menuButtonRef = useRef(null);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editLoadedId, setEditLoadedId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [poDetails, setPoDetails] = useState(null);

  const [billFile, setBillFile] = useState(null);
  const [billPoId, setBillPoId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billNotes, setBillNotes] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentPoId, setPaymentPoId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  /* =========================================================
     ACTION MENU POSITION
  ========================================================= */

  const updateMenuPosition = useCallback((button) => {
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 220;
    const screenPadding = 8;

    let left = rect.left + rect.width / 2 - menuWidth / 2;
    let top = rect.top + rect.height / 2 - menuHeight / 2;

    left = Math.max(
      screenPadding,
      Math.min(left, window.innerWidth - menuWidth - screenPadding),
    );

    top = Math.max(
      screenPadding,
      Math.min(top, window.innerHeight - menuHeight - screenPadding),
    );

    setMenuPosition({ top, left });
  }, []);

  useEffect(() => {
    if (openMenuId === null) return undefined;

    const repositionMenu = () => {
      if (menuButtonRef.current) {
        updateMenuPosition(menuButtonRef.current);
      }
    };

    window.addEventListener('scroll', repositionMenu, true);
    window.addEventListener('resize', repositionMenu);

    repositionMenu();

    return () => {
      window.removeEventListener('scroll', repositionMenu, true);
      window.removeEventListener('resize', repositionMenu);
    };
  }, [openMenuId, updateMenuPosition]);

  const toggleActionsMenu = (event, itemId) => {
    if (openMenuId === itemId) {
      setOpenMenuId(null);
      menuButtonRef.current = null;
      return;
    }

    menuButtonRef.current = event.currentTarget;
    updateMenuPosition(event.currentTarget);
    setOpenMenuId(itemId);
  };

  const closeActionsMenu = () => {
    setOpenMenuId(null);
    menuButtonRef.current = null;
  };

  /* =========================================================
     LOAD WHOLESALERS
  ========================================================= */

  const loadWholesalers = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await api.get('/shop/wholesalers');

      setItems(
        Array.isArray(response.items) ? response.items : [],
      );
    } catch (error) {
      setLoadError(
        error.message || 'Unable to load authorized wholesalers.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWholesalers();
  }, [loadWholesalers]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      const text = [
        item.code,
        item.name,
        item.contactPerson,
        item.contactPhone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !needle || text.includes(needle);
    });
  }, [items, query]);

  const activeWholesaler = modal?.wholesaler;

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeModal = () => {
    if (busy) return;

    setModal(null);
    setEditLoadedId(null);
    setModalError('');
    setModalSuccess('');
    setFormError('');
    setFormErrors({});
    setPoDetails(null);
    setShowPaymentForm(false);
  };

  /* =========================================================
     UPDATE WHOLESALER STATUS
  ========================================================= */

  const toggleWholesalerStatus = async (item) => {
    if (updatingStatusId !== null) return;

    const newStatus =
      item.status === 'active' ? 'inactive' : 'active';

    setUpdatingStatusId(item.id);
    setNotice(null);

    try {
      await api.patch(
        `/shop/wholesalers/${encodeURIComponent(item.id)}`,
        { status: newStatus },
      );

      setItems((current) =>
        current.map((wholesaler) =>
          String(wholesaler.id) === String(item.id)
            ? { ...wholesaler, status: newStatus }
            : wholesaler,
        ),
      );

      setNotice({
        kind: 'success',
        text: `${item.name} is now ${newStatus}.`,
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error.message || 'Unable to update wholesaler status.',
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /* =========================================================
     EDIT WHOLESALER
  ========================================================= */

  const openEditWholesaler = (wholesaler) => {
    closeActionsMenu();
    setEditLoadedId(null);

    setForm({
      name: wholesaler.name || '',
      contactPerson: wholesaler.contactPerson || '',
      contactPhone: String(wholesaler.contactPhone || '')
        .replace(/\D/g, '')
        .slice(0, 10),
      contactEmail: wholesaler.contactEmail || '',
      gstNumber: wholesaler.gstNumber || '',
      address: wholesaler.address || '',
      status: wholesaler.status || 'active',
    });

    setFormErrors({});
    setFormError('');
    setNotice(null);

    setModal({
      action: 'edit',
      wholesaler,
    });
  };

  /* =========================================================
     OPEN OTHER ACTIONS
  ========================================================= */

  const openAction = (wholesaler, action) => {
    closeActionsMenu();

    setModal({ action, wholesaler });
    setModalError('');
    setModalSuccess('');
    setPoDetails(null);
    setOrderItems([]);
    setOrderNotes('');

    setBillFile(null);
    setBillPoId('');
    setBillNumber('');
    setBillDate('');
    setBillAmount('');
    setBillNotes('');

    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('bank_transfer');
    setPaymentReference('');
    setPaymentPoId('');
    setPaymentNotes('');

    setShowPaymentForm(
      action === 'payments' && canCreate,
    );
  };

  /* =========================================================
     LOAD MODAL DATA
  ========================================================= */

  useEffect(() => {
    if (!modal || !modal.wholesaler) return undefined;

    let active = true;

    const loadModalData = async () => {
      setModalLoading(true);
      setModalError('');

      try {
        const wholesalerId = encodeURIComponent(
          modal.wholesaler.id,
        );

        if (modal.action === 'edit') {
          const response = await api.get(
            `/shop/wholesalers/${wholesalerId}`,
          );

          if (!active) return;

          const item = response.item;

          setForm({
            name: item.name || '',
            contactPerson: item.contactPerson || '',
            contactPhone: String(item.contactPhone || '')
              .replace(/\D/g, '')
              .slice(0, 10),
            contactEmail: item.contactEmail || '',
            gstNumber: item.gstNumber || '',
            address: item.address || '',
            status: item.status || 'active',
          });

          setEditLoadedId(String(item.id));
        } else if (modal.action === 'book') {
          const [catalog, wholesalerList] = await Promise.all([
            api.get('/shop/catalog/products'),
            api.get('/shop/wholesalers'),
          ]);

          if (!active) return;

          const isAuthorizedActive = (
            wholesalerList.items || []
          ).some(
            (item) =>
              String(item.id) === String(modal.wholesaler.id) &&
              item.status === 'active',
          );

          if (!isAuthorizedActive) {
            setModalError(
              'Purchase orders can only be placed with an active authorized wholesaler.',
            );
            return;
          }

          const variants = (catalog.items || []).flatMap(
            (product) =>
              (product.variants || []).map((variant) => ({
                productId: product.id,
                productName: product.name,
                productVariantId: variant.id,
                variantName: variant.variantName,
                unitPrice: Number(
                  variant.wholesalePrice || variant.price || 0,
                ),
              })),
          );

          setProducts(variants);

          if (variants.length) {
            setOrderItems([
              {
                productId: variants[0].productId,
                productVariantId: variants[0].productVariantId,
                quantity: 1,
                unitPrice: variants[0].unitPrice,
              },
            ]);
          }
        } else if (modal.action === 'orders') {
          const response = await api.get(
            `/shop/wholesale-orders?wholesalerId=${wholesalerId}`,
          );

          if (active) {
            setPurchaseOrders(response.items || []);
          }
        } else if (modal.action === 'bills') {
          const [billResponse, poResponse] = await Promise.all([
            api.get(`/shop/bills?wholesalerId=${wholesalerId}`),
            api.get(
              `/shop/wholesale-orders?wholesalerId=${wholesalerId}`,
            ),
          ]);

          if (!active) return;

          setDocuments(
            (billResponse.items || []).filter(
              (item) =>
                String(item.wholesalerId) ===
                String(modal.wholesaler.id),
            ),
          );

          setPurchaseOrders(poResponse.items || []);
        } else if (modal.action === 'payments') {
          const [
            paymentResponse,
            poResponse,
            wholesalerResponse,
          ] = await Promise.all([
            api.get(
              `/shop/wholesale-payments?wholesalerId=${wholesalerId}`,
            ),
            api.get(
              `/shop/wholesale-orders?wholesalerId=${wholesalerId}`,
            ),
            api.get('/shop/wholesalers'),
          ]);

          if (!active) return;

          setPayments(
            (paymentResponse.items || []).filter(
              (item) =>
                String(item.wholesalerId) ===
                String(modal.wholesaler.id),
            ),
          );

          setPurchaseOrders(poResponse.items || []);

          const currentWholesaler = (
            wholesalerResponse.items || []
          ).find(
            (item) =>
              String(item.id) === String(modal.wholesaler.id),
          );

          setModal((current) =>
            current
              ? {
                  ...current,
                  wholesaler: {
                    ...current.wholesaler,
                    outstandingAmount:
                      currentWholesaler?.outstandingAmount || 0,
                  },
                }
              : current,
          );
        }
      } catch (error) {
        if (active) {
          const message =
            error.message ||
            'Unable to load wholesaler information.';

          if (modal.action === 'edit') {
            setFormError(message);
          } else {
            setModalError(message);
          }
        }
      } finally {
        if (active) setModalLoading(false);
      }
    };

    loadModalData();

    return () => {
      active = false;
    };
  }, [modal?.action, modal?.wholesaler?.id]);

  /* =========================================================
     FORM FIELD HANDLER
  ========================================================= */

  const setField = (field) => (event) => {
    let value = event.target.value;

    if (field === 'contactPhone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    if (field === 'contactPhone') {
      setFormError('');
    }
  };

  /* =========================================================
     CREATE / UPDATE WHOLESALER
  ========================================================= */

  const saveWholesaler = async (event) => {
    event.preventDefault();

    const isEditing = modal?.action === 'edit';

    if (
      isEditing &&
      String(editLoadedId) !== String(modal.wholesaler.id)
    ) {
      setFormError(
        'Wholesaler details have not loaded. Please close and reopen the editor.',
      );
      return;
    }

    // Validate Indian mobile number for both create and edit.
    if (!isValidIndianMobile(form.contactPhone)) {
      setFormErrors({
        contactPhone:
          'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.',
      });
      return;
    }

    setBusy(true);
    setFormError('');
    setFormErrors({});
    setNotice(null);

    const payload = {
      ...form,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail || undefined,
      gstNumber: form.gstNumber || undefined,
      address: form.address || undefined,
    };

    try {
      if (isEditing) {
        await api.patch(
          `/shop/wholesalers/${encodeURIComponent(modal.wholesaler.id)}`,
          payload,
        );
      } else {
        await api.post('/shop/wholesalers', payload);
      }

      setForm(emptyForm);
      setModal(null);

      setNotice({
        kind: 'success',
        text: isEditing
          ? 'Wholesaler details updated successfully.'
          : 'Wholesaler created and authorized for this shop.',
      });

      await loadWholesalers();
    } catch (error) {
      setFormError(
        error.message ||
          (isEditing
            ? 'Unable to update wholesaler.'
            : 'Unable to create wholesaler.'),
      );

      setFormErrors(error.details || {});
    } finally {
      setBusy(false);
    }
  };

  /* =========================================================
     PURCHASE ORDER ITEMS
  ========================================================= */

  const changeOrderItem = (index, field, value) => {
    setOrderItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === 'productVariantId') {
          const variant = products.find(
            (product) =>
              String(product.productVariantId) === String(value),
          );

          return variant
            ? {
                ...item,
                productId: variant.productId,
                productVariantId: variant.productVariantId,
                unitPrice: variant.unitPrice,
              }
            : item;
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    setBusy(true);
    setModalError('');
    setModalSuccess('');

    try {
      await api.post('/shop/wholesale-orders', {
        wholesalerId: Number(activeWholesaler.id),
        notes: orderNotes || undefined,
        items: orderItems.map((item) => ({
          productId: Number(item.productId),
          productVariantId: Number(item.productVariantId),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });

      setModalSuccess('Purchase order placed successfully.');
      setOrderItems([]);
      setOrderNotes('');

      const [orderResponse] = await Promise.all([
        api.get(
          `/shop/wholesale-orders?wholesalerId=${encodeURIComponent(activeWholesaler.id)}`,
        ),
        loadWholesalers(),
      ]);

      setPurchaseOrders(orderResponse.items || []);
    } catch (error) {
      setModalError(
        error.message || 'Unable to place purchase order.',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =========================================================
     UPLOAD BILL
  ========================================================= */

  const uploadBill = async (event) => {
    event.preventDefault();

    if (!billFile) {
      setModalError('Choose a bill or invoice file to upload.');
      return;
    }

    setBusy(true);
    setModalError('');
    setModalSuccess('');

    try {
      const formData = new FormData();

      formData.append('file', billFile);
      formData.append('documentType', 'bill');
      formData.append(
        'wholesalerId',
        String(activeWholesaler.id),
      );

      if (billPoId) {
        formData.append('purchaseOrderId', billPoId);
      }

      const metadata = [
        billNumber && `Bill: ${billNumber}`,
        billDate && `Date: ${billDate}`,
        billAmount && `Amount: ${billAmount}`,
        billNotes,
      ]
        .filter(Boolean)
        .join(' | ');

      if (metadata) {
        formData.append('notes', metadata);
      }

      await api.upload('/shop/bills', formData);

      setModalSuccess('Bill uploaded successfully.');
      setBillFile(null);
      setBillNumber('');
      setBillDate('');
      setBillAmount('');
      setBillNotes('');

      const response = await api.get(
        `/shop/bills?wholesalerId=${encodeURIComponent(activeWholesaler.id)}`,
      );

      setDocuments(response.items || []);
      await loadWholesalers();

      event.target.reset();
    } catch (error) {
      setModalError(
        error.message || 'Unable to upload the bill.',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =========================================================
     RECORD PAYMENT
  ========================================================= */

  const recordPayment = async (event) => {
    event.preventDefault();

    setBusy(true);
    setModalError('');
    setModalSuccess('');

    try {
      await api.post('/shop/wholesale-payments', {
        wholesalerId: Number(activeWholesaler.id),
        purchaseOrderId: paymentPoId
          ? Number(paymentPoId)
          : undefined,
        amount: Number(paymentAmount),
        paymentMethod,
        paymentDate,
        referenceNumber: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });

      setModalSuccess(
        'Payment record saved. This records a payment made outside the application.',
      );

      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');

      const [
        paymentResponse,
        wholesalerResponse,
      ] = await Promise.all([
        api.get(
          `/shop/wholesale-payments?wholesalerId=${encodeURIComponent(activeWholesaler.id)}`,
        ),
        api.get('/shop/wholesalers'),
      ]);

      setPayments(paymentResponse.items || []);

      const currentWholesaler = (
        wholesalerResponse.items || []
      ).find(
        (item) =>
          String(item.id) === String(activeWholesaler.id),
      );

      if (currentWholesaler) {
        setModal((current) =>
          current
            ? {
                ...current,
                wholesaler: {
                  ...current.wholesaler,
                  outstandingAmount:
                    currentWholesaler.outstandingAmount,
                },
              }
            : current,
        );
      }

      await loadWholesalers();
    } catch (error) {
      setModalError(
        error.message || 'Unable to record payment.',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =========================================================
     PURCHASE ORDER DETAILS
  ========================================================= */

  const openOrderDetails = async (order) => {
    setModalError('');

    try {
      const response = await api.get(
        `/shop/wholesale-orders/${order.id}`,
      );

      setPoDetails(response.purchaseOrder);
    } catch (error) {
      setModalError(
        error.message || 'Unable to load purchase order details.',
      );
    }
  };

  const actionTitle = {
    book: 'Book Wholesale Order',
    orders: 'Purchase Orders',
    bills: 'Upload Bills',
    payments: 'Payment History',
  };

  const modalTitle = activeWholesaler
    ? `${actionTitle[modal.action]} · ${activeWholesaler.name}`
    : '';

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Manage Wholesalers"
          subtitle="Manage your authorized wholesalers and wholesale activity."
        />

        {canCreate && (
          <Button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setFormError('');
              setFormErrors({});
              setNotice(null);
              setEditLoadedId(null);
              setModal({ action: 'create' });
            }}
          >
            + Create Wholesaler
          </Button>
        )}
      </div>

      {loadError && <Alert>{loadError}</Alert>}

      {notice && (
        <Alert kind={notice.kind}>{notice.text}</Alert>
      )}

      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
          <Input
            aria-label="Search wholesalers"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code, wholesaler, contact or phone"
          />
        </div>

        {loading ? (
          <Spinner label="Loading wholesalers…" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Wholesaler</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Open POs</th>
                  <th className="px-4 py-3 font-medium">Outstanding</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {item.code}
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.name}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      <div>{item.contactPerson || '—'}</div>
                      <div className="text-xs">
                        {item.contactPhone || '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <Badge
                          tone={
                            item.status === 'active'
                              ? 'green'
                              : 'amber'
                          }
                        >
                          {item.status === 'active'
                            ? 'Active'
                            : 'Inactive'}
                        </Badge>

                        <button
                          type="button"
                          onClick={() =>
                            toggleWholesalerStatus(item)
                          }
                          disabled={updatingStatusId === item.id}
                          aria-label={`Change ${item.name} status`}
                          aria-pressed={item.status === 'active'}
                          title="Toggle wholesaler status"
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            item.status === 'active'
                              ? 'bg-green-600'
                              : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              item.status === 'active'
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {item.openPurchaseOrders ?? 0}
                    </td>

                    <td className="px-4 py-3">
                      {money(item.outstandingAmount)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              openEditWholesaler(item)
                            }
                          >
                            Edit
                          </Button>
                        )}

                        <button
                          ref={
                            openMenuId === item.id
                              ? menuButtonRef
                              : null
                          }
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === item.id}
                          onClick={(event) =>
                            toggleActionsMenu(event, item.id)
                          }
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Actions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      {items.length
                        ? 'No wholesalers match your search.'
                        : 'No wholesalers are authorized for this shop yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ACTIONS MENU */}
      {openMenuId !== null && (
        <div
          role="menu"
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            width: '240px',
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">
              Manage Wholesaler
            </span>

            <button
              type="button"
              onClick={closeActionsMenu}
              aria-label="Close Actions menu"
              className="rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              ×
            </button>
          </div>

          {[
            ['book', 'Book Wholesale Order'],
            ['orders', 'Purchase Orders'],
            ['bills', 'Upload Bills'],
            ['payments', 'Payment History'],
          ]
            .filter(([action]) => {
              if (action === 'book') return canBookOrders;
              if (action === 'bills') return canCreate;

              return can('wholesalers.view');
            })
            .map(([action, label]) => (
              <button
                key={action}
                type="button"
                role="menuitem"
                onClick={() => {
                  const wholesaler = items.find(
                    (item) =>
                      String(item.id) === String(openMenuId),
                  );

                  if (wholesaler) {
                    openAction(wholesaler, action);
                  }
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {label}
              </button>
            ))}
        </div>
      )}

      {/* CREATE / EDIT WHOLESALER MODAL */}
      {(modal?.action === 'create' && canCreate ||
        modal?.action === 'edit' && canEdit) && (
        <Modal
          title={
            modal.action === 'edit'
              ? 'Edit Wholesaler'
              : 'Create Wholesaler'
          }
          onClose={closeModal}
          showFooterClose={false}
        >
          <form
            onSubmit={saveWholesaler}
            className="space-y-4"
          >
            {formError && <Alert>{formError}</Alert>}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Wholesaler / Business Name"
                required
                error={fieldError(formErrors, 'name')}
              >
                <Input
                  required
                  minLength={2}
                  maxLength={150}
                  value={form.name}
                  onChange={setField('name')}
                />
              </Field>

              <Field
                label="Contact Person"
                required
                error={fieldError(formErrors, 'contactPerson')}
              >
                <Input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.contactPerson}
                  onChange={setField('contactPerson')}
                />
              </Field>

              {/* VALIDATED MOBILE NUMBER */}
              <Field
                label="Phone Number"
                required
                error={fieldError(formErrors, 'contactPhone')}
              >
                <Input
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.contactPhone}
                  placeholder="Enter 10-digit mobile number"
                  onChange={setField('contactPhone')}
                />

                <p className="mt-1 text-xs text-slate-500">
                  Enter a 10-digit mobile number.
                  {' '}
                  {form.contactPhone.length}/10 digits
                </p>
              </Field>

              <Field
                label="Email Address"
                error={fieldError(formErrors, 'contactEmail')}
              >
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={setField('contactEmail')}
                />
              </Field>

              <Field label="GST Number">
                <Input
                  maxLength={20}
                  value={form.gstNumber}
                  onChange={setField('gstNumber')}
                />
              </Field>

              <Field label="Status">
                <select
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={form.status}
                  onChange={setField('status')}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            <Field label="Address">
              <Textarea
                maxLength={500}
                value={form.address}
                onChange={setField('address')}
              />
            </Field>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={closeModal}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                loading={busy}
                disabled={
                  busy ||
                  (modal.action === 'edit' &&
                    (modalLoading ||
                      String(editLoadedId) !==
                        String(modal.wholesaler.id)))
                }
              >
                {modal.action === 'edit'
                  ? 'Save Changes'
                  : 'Create Wholesaler'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* WHOLESALER ACTION MODALS */}
      {modal &&
        activeWholesaler &&
        ['book', 'orders', 'bills', 'payments'].includes(
          modal.action,
        ) && (
          <Modal
            title={modalTitle}
            onClose={closeModal}
          >
            {modalError && (
              <div className="mb-4">
                <Alert>{modalError}</Alert>
              </div>
            )}

            {modalSuccess && (
              <div className="mb-4">
                <Alert kind="success">{modalSuccess}</Alert>
              </div>
            )}

            {/* BOOK WHOLESALE ORDER */}
            {modal.action === 'book' &&
              (modalLoading ? (
                <Spinner label="Loading shop products…" />
              ) : (
                <form
                  onSubmit={placeOrder}
                  className="space-y-4"
                >
                  <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                    Supplier:{' '}
                    <span className="font-semibold">
                      {activeWholesaler.name}
                    </span>

                    {activeWholesaler.contactPhone
                      ? ` · ${activeWholesaler.contactPhone}`
                      : ''}
                  </div>

                  {!products.length ? (
                    <p className="text-sm text-slate-500">
                      No catalog products are available for purchase orders.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {orderItems.map((item, index) => (
                          <div
                            key={`${item.productVariantId}-${index}`}
                            className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_100px_140px_auto]"
                          >
                            <Field label="Product / Variant">
                              <select
                                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                value={item.productVariantId}
                                onChange={(event) =>
                                  changeOrderItem(
                                    index,
                                    'productVariantId',
                                    event.target.value,
                                  )
                                }
                              >
                                {products.map((product) => (
                                  <option
                                    key={product.productVariantId}
                                    value={product.productVariantId}
                                  >
                                    {product.productName} · {product.variantName}
                                  </option>
                                ))}
                              </select>
                            </Field>

                            <Field label="Quantity">
                              <Input
                                type="number"
                                min="1"
                                required
                                value={item.quantity}
                                onChange={(event) =>
                                  changeOrderItem(
                                    index,
                                    'quantity',
                                    event.target.value,
                                  )
                                }
                              />
                            </Field>

                            <Field label="Unit price">
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={item.unitPrice}
                                onChange={(event) =>
                                  changeOrderItem(
                                    index,
                                    'unitPrice',
                                    event.target.value,
                                  )
                                }
                              />
                            </Field>

                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={orderItems.length <= 1}
                                onClick={() =>
                                  setOrderItems((current) =>
                                    current.filter(
                                      (_, row) => row !== index,
                                    ),
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </div>

                            <p className="text-sm text-slate-600 sm:col-span-4">
                              Line total:{' '}
                              {money(
                                Number(item.quantity || 0) *
                                  Number(item.unitPrice || 0),
                              )}
                            </p>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!products.length}
                        onClick={() => {
                          const first = products[0];

                          setOrderItems((current) => [
                            ...current,
                            {
                              productId: first.productId,
                              productVariantId: first.productVariantId,
                              quantity: 1,
                              unitPrice: first.unitPrice,
                            },
                          ]);
                        }}
                      >
                        + Add Product
                      </Button>

                      <p className="text-right text-lg font-semibold text-slate-900">
                        Total:{' '}
                        {money(
                          orderItems.reduce(
                            (sum, item) =>
                              sum +
                              Number(item.quantity || 0) *
                                Number(item.unitPrice || 0),
                            0,
                          ),
                        )}
                      </p>

                      <Field label="Notes">
                        <Textarea
                          value={orderNotes}
                          onChange={(event) =>
                            setOrderNotes(event.target.value)
                          }
                        />
                      </Field>

                      <Button
                        type="submit"
                        loading={busy}
                        disabled={!orderItems.length}
                      >
                        Place Order
                      </Button>
                    </>
                  )}
                </form>
              ))}

            {/* PURCHASE ORDERS */}
            {modal.action === 'orders' &&
              (modalLoading ? (
                <Spinner label="Loading purchase orders…" />
              ) : (
                <div className="space-y-4">
                  {purchaseOrders.length ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-[620px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-3">PO Number</th>
                            <th className="px-3 py-3">Order Date</th>
                            <th className="px-3 py-3">Total Amount</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Action</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {purchaseOrders.map((order) => (
                            <tr key={order.id}>
                              <td className="px-3 py-3 font-medium">
                                {order.orderNumber}
                              </td>
                              <td className="px-3 py-3">
                                {date(order.createdAt)}
                              </td>
                              <td className="px-3 py-3">
                                {money(order.totalAmount)}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(order.status)}`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  type="button"
                                  onClick={() => openOrderDetails(order)}
                                  className="font-medium text-indigo-600 hover:underline"
                                >
                                  View details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No purchase orders for this wholesaler.
                    </p>
                  )}

                  {poDetails && (
                    <Card>
                      <h3 className="font-semibold text-slate-900">
                        Order {poDetails.orderNumber} details
                      </h3>

                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-[500px] w-full text-left text-sm">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="py-2">Product</th>
                              <th>Quantity</th>
                              <th>Received</th>
                              <th>Unit Price</th>
                              <th>Amount</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {(poDetails.items || []).map((item) => (
                              <tr key={item.id}>
                                <td className="py-2">
                                  {item.productName} · {item.variantName}
                                </td>
                                <td>{item.quantity}</td>
                                <td>{item.receivedQuantity}</td>
                                <td>{money(item.unitPrice)}</td>
                                <td>{money(item.totalPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              ))}

            {/* BILLS */}
            {modal.action === 'bills' &&
              (modalLoading ? (
                <Spinner label="Loading bills…" />
              ) : (
                <div className="space-y-6">
                  <form
                    onSubmit={uploadBill}
                    className="space-y-4 rounded-lg border border-slate-200 p-4"
                  >
                    <p className="text-sm text-slate-600">
                      Supplier:{' '}
                      <span className="font-medium text-slate-900">
                        {activeWholesaler.name}
                      </span>
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Purchase Order">
                        <select
                          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          value={billPoId}
                          onChange={(event) =>
                            setBillPoId(event.target.value)
                          }
                        >
                          <option value="">
                            No related purchase order
                          </option>
                          {purchaseOrders.map((order) => (
                            <option key={order.id} value={order.id}>
                              {order.orderNumber}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Bill / Invoice Number">
                        <Input
                          maxLength={100}
                          value={billNumber}
                          onChange={(event) =>
                            setBillNumber(event.target.value)
                          }
                        />
                      </Field>

                      <Field label="Bill Date">
                        <Input
                          type="date"
                          value={billDate}
                          onChange={(event) =>
                            setBillDate(event.target.value)
                          }
                        />
                      </Field>

                      <Field label="Bill Amount">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={billAmount}
                          onChange={(event) =>
                            setBillAmount(event.target.value)
                          }
                        />
                      </Field>

                      <Field
                        label="Invoice file (PDF, JPEG, PNG or WEBP)"
                        required
                      >
                        <Input
                          type="file"
                          required
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            setBillFile(
                              event.target.files?.[0] || null,
                            )
                          }
                        />
                      </Field>

                      <Field label="Notes">
                        <Input
                          maxLength={500}
                          value={billNotes}
                          onChange={(event) =>
                            setBillNotes(event.target.value)
                          }
                        />
                      </Field>
                    </div>

                    <Button type="submit" loading={busy}>
                      Upload Bill
                    </Button>
                  </form>

                  <div>
                    <h3 className="mb-3 font-semibold text-slate-900">
                      Uploaded bills
                    </h3>

                    {documents.length ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-[650px] w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-3">Document</th>
                              <th className="px-3 py-3">Purchase Order</th>
                              <th className="px-3 py-3">Date / Details</th>
                              <th className="px-3 py-3">Download</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {documents.map((document) => (
                              <tr key={document.id}>
                                <td className="px-3 py-3">
                                  {document.originalFilename}
                                </td>
                                <td className="px-3 py-3">
                                  {document.purchaseOrder?.orderNumber || '—'}
                                </td>
                                <td className="px-3 py-3">
                                  <div>{date(document.createdAt)}</div>
                                  <div className="text-xs text-slate-500">
                                    {document.notes || '—'}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <a
                                    className="font-medium text-indigo-600 hover:underline"
                                    href={`/api/v1/shop/bills/${document.id}/download`}
                                  >
                                    Download
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="py-5 text-center text-sm text-slate-500">
                        No bills uploaded for this wholesaler.
                      </p>
                    )}
                  </div>
                </div>
              ))}

            {/* PAYMENT HISTORY */}
            {modal.action === 'payments' &&
              (modalLoading ? (
                <Spinner label="Loading payment history…" />
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      Outstanding balance:{' '}
                      <span className="font-semibold text-slate-900">
                        {money(activeWholesaler.outstandingAmount)}
                      </span>
                    </p>

                    {canCreate && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setShowPaymentForm((current) => !current)
                        }
                      >
                        {showPaymentForm
                          ? 'Hide Record Payment'
                          : 'Record Payment'}
                      </Button>
                    )}
                  </div>

                  {showPaymentForm && (
                    <form
                      onSubmit={recordPayment}
                      className="space-y-4 rounded-lg border border-slate-200 p-4"
                    >
                      <p className="text-xs text-slate-500">
                        This records an external payment; it does not initiate a bank transfer.
                      </p>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Amount" required>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={activeWholesaler.outstandingAmount || 0}
                            required
                            value={paymentAmount}
                            onChange={(event) =>
                              setPaymentAmount(event.target.value)
                            }
                          />
                        </Field>

                        <Field label="Payment Date" required>
                          <Input
                            type="date"
                            required
                            value={paymentDate}
                            onChange={(event) =>
                              setPaymentDate(event.target.value)
                            }
                          />
                        </Field>

                        <Field label="Payment Method">
                          <select
                            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={paymentMethod}
                            onChange={(event) =>
                              setPaymentMethod(event.target.value)
                            }
                          >
                            <option value="upi">UPI</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                          </select>
                        </Field>

                        <Field label="Related Purchase Order">
                          <select
                            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={paymentPoId}
                            onChange={(event) =>
                              setPaymentPoId(event.target.value)
                            }
                          >
                            <option value="">
                              No related purchase order
                            </option>
                            {purchaseOrders.map((order) => (
                              <option key={order.id} value={order.id}>
                                {order.orderNumber}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Transaction / Receipt Reference">
                          <Input
                            maxLength={100}
                            value={paymentReference}
                            onChange={(event) =>
                              setPaymentReference(event.target.value)
                            }
                          />
                        </Field>

                        <Field label="Remarks">
                          <Input
                            maxLength={500}
                            value={paymentNotes}
                            onChange={(event) =>
                              setPaymentNotes(event.target.value)
                            }
                          />
                        </Field>
                      </div>

                      <Button type="submit" loading={busy}>
                        Save Payment Record
                      </Button>
                    </form>
                  )}

                  {payments.length ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-[700px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-3">Payment Date</th>
                            <th className="px-3 py-3">Amount</th>
                            <th className="px-3 py-3">Method</th>
                            <th className="px-3 py-3">Reference</th>
                            <th className="px-3 py-3">Purchase Order</th>
                            <th className="px-3 py-3">Status</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {payments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="px-3 py-3">
                                {date(
                                  payment.paymentDate ||
                                    payment.createdAt,
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {money(payment.amount)}
                              </td>
                              <td className="px-3 py-3 capitalize">
                                {(payment.paymentMethod || '').replace(
                                  /_/g,
                                  ' ',
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {payment.referenceNumber || '—'}
                              </td>
                              <td className="px-3 py-3">
                                {payment.purchaseOrder?.orderNumber || '—'}
                              </td>
                              <td className="px-3 py-3">
                                <Badge tone="green">Recorded</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No payment records for this wholesaler.
                    </p>
                  )}
                </div>
              ))}
          </Modal>
        )}
    </div>
  );
}
