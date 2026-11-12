// import { useEffect, useState } from 'react';
// import { api } from '../../../services/api.js';
// import { useAuth } from '../../../context/AuthContext.jsx';
// import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';
// import { hasPermission } from '../../../services/permissions.js';


// export default function ShopInventory() {
//   const { user } = useAuth();
//   const [tab, setTab] = useState('stock'); // 'stock' | 'movements'
//   const [items, setItems] = useState([]);
//   const [movements, setMovements] = useState([]);
//   const [totalValuation, setTotalValuation] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);

//   // Adjustment Modal
//   const [adjustItem, setAdjustItem] = useState(null);
//   const [changeQty, setChangeQty] = useState('');
//   const [reason, setReason] = useState('');
//   const [movementType, setMovementType] = useState('adjustment');
//   const [savingAdj, setSavingAdj] = useState(false);
//   const canAdjust = user?.shop?.role === 'shop_owner' ||
//     hasPermission(user?.permissions, 'inventory.update');

//   const loadInventory = () => {
//     setLoading(true);
//     api
//       .get('/shop/inventory')
//       .then((res) => {
//         setItems(res.items || []);
//         setTotalValuation(res.totalValuation || 0);
//       })
//       .catch((err) => setError(err.message))
//       .finally(() => setLoading(false));
//   };

//   const loadMovements = () => {
//     setLoading(true);
//     api
//       .get('/shop/inventory/movements')
//       .then((res) => setMovements(res.items || []))
//       .catch((err) => setError(err.message))
//       .finally(() => setLoading(false));
//   };

//   useEffect(() => {
//     if (tab === 'stock') loadInventory();
//     else loadMovements();
//   }, [tab]);

//   const handleAdjustSubmit = async (e) => {
//     e.preventDefault();
//     if (!adjustItem || !changeQty || !reason.trim()) return;
//     setSavingAdj(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       await api.post('/shop/inventory/adjust', {
//         productVariantId: adjustItem.productVariantId,
//         changeQuantity: Number(changeQty),
//         reason: reason.trim(),
//         movementType,
//       });
//       setSuccess(`Inventory adjusted for ${adjustItem.product?.name} (${adjustItem.variant?.variantName})`);
//       setAdjustItem(null);
//       setChangeQty('');
//       setReason('');
//       loadInventory();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setSavingAdj(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Retail Inventory & Stock</h1>
//           <p className="mt-1 text-sm text-slate-600">
//             Real-time stock quantities, low-stock alerts, and full traceability of stock movements.
//           </p>
//         </div>
//         <div className="rounded-lg bg-indigo-50 px-4 py-2 text-right">
//           <div className="text-xs font-semibold uppercase text-indigo-600">Total Stock Valuation</div>
//           <div className="text-xl font-bold text-indigo-900">₹{Number(totalValuation).toFixed(2)}</div>
//         </div>
//       </div>

//       {error && <Alert variant="error">{error}</Alert>}
//       {success && <Alert variant="success">{success}</Alert>}

//       {/* Tabs */}
//       <div className="border-b border-slate-200">
//         <nav className="flex space-x-6" aria-label="Tabs">
//           <button
//             type="button"
//             onClick={() => setTab('stock')}
//             className={`border-b-2 py-2 text-sm font-medium ${
//               tab === 'stock'
//                 ? 'border-indigo-600 text-indigo-600'
//                 : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
//             }`}
//           >
//             Current Stock Levels
//           </button>
//           <button
//             type="button"
//             onClick={() => setTab('movements')}
//             className={`border-b-2 py-2 text-sm font-medium ${
//               tab === 'movements'
//                 ? 'border-indigo-600 text-indigo-600'
//                 : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
//             }`}
//           >
//             Audit Trail & Movements History
//           </button>
//         </nav>
//       </div>

//       {loading ? (
//         <Spinner />
//       ) : tab === 'stock' ? (
//         items.length === 0 ? (
//           <Card>
//             <div className="py-8 text-center text-sm text-slate-500">No inventory entries found.</div>
//           </Card>
//         ) : (
//           <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
//             <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
//               <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
//                 <tr>
//                   <th className="px-4 py-3">Product Name</th>
//                   <th className="px-4 py-3">Variant</th>
//                   <th className="px-4 py-3">Category</th>
//                   <th className="px-4 py-3">Retail Price</th>
//                   <th className="px-4 py-3">Quantity</th>
//                   <th className="px-4 py-3">Valuation</th>
//                   {canAdjust && <th className="px-4 py-3">Action</th>}
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {items.map((it) => (
//                   <tr key={it.id} className="hover:bg-slate-50">
//                     <td className="px-4 py-3 font-semibold text-slate-900">{it.product?.name}</td>
//                     <td className="px-4 py-3 text-slate-700">
//                       {it.variant?.variantName} <span className="text-xs text-slate-400 font-mono">({it.variant?.sku})</span>
//                     </td>
//                     <td className="px-4 py-3 text-xs text-slate-500">{it.product?.category?.name || '—'}</td>
//                     <td className="px-4 py-3 font-medium text-slate-800">₹{Number(it.retailPrice || 0).toFixed(2)}</td>
//                     {canAdjust && <td className="px-4 py-3">
//                       <span
//                         className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
//                           it.isLowStock
//                             ? 'bg-amber-100 text-amber-800'
//                             : 'bg-emerald-100 text-emerald-800'
//                         }`}
//                       >
//                         {it.quantity} units
//                         {it.isLowStock && <span className="text-[10px] font-normal text-amber-700">(Low)</span>}
//                       </span>
//                     </td>}
//                     <td className="px-4 py-3 font-semibold text-slate-900">₹{Number(it.valuation || 0).toFixed(2)}</td>
//                     <td className="px-4 py-3">
//                       <button
//                         type="button"
//                         onClick={() => setAdjustItem(it)}
//                         className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
//                       >
//                         Adjust Stock
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )
//       ) : movements.length === 0 ? (
//         <Card>
//           <div className="py-8 text-center text-sm text-slate-500">No stock movements recorded yet.</div>
//         </Card>
//       ) : (
//         <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
//           <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
//             <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
//               <tr>
//                 <th className="px-4 py-3">Date</th>
//                 <th className="px-4 py-3">Product / Variant</th>
//                 <th className="px-4 py-3">Type</th>
//                 <th className="px-4 py-3">Change</th>
//                 <th className="px-4 py-3">Balance After</th>
//                 <th className="px-4 py-3">Reason / Ref</th>
//                 <th className="px-4 py-3">Actor</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-200 text-xs">
//               {movements.map((m) => (
//                 <tr key={m.id} className="hover:bg-slate-50">
//                   <td className="px-4 py-3 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
//                   <td className="px-4 py-3 font-medium text-slate-900">
//                     {m.product?.name} ({m.variant?.variantName})
//                   </td>
//                   <td className="px-4 py-3 capitalize text-slate-700">{m.movementType}</td>
//                   <td className="px-4 py-3 font-bold">
//                     <span className={m.changeQuantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
//                       {m.changeQuantity > 0 ? `+${m.changeQuantity}` : m.changeQuantity}
//                     </span>
//                   </td>
//                   <td className="px-4 py-3 font-semibold text-slate-800">{m.balanceAfter}</td>
//                   <td className="px-4 py-3 text-slate-600">{m.notes || m.referenceType || '—'}</td>
//                   <td className="px-4 py-3 text-slate-500">{m.creator?.name || 'System'}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Manual Stock Adjustment Modal */}
//             {/* Manual Stock Adjustment Modal */}
//       {adjustItem && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
//           <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
//             <div className="flex items-start justify-between gap-3">
//               <div>
//                 <h2 className="text-lg font-bold text-slate-900">
//                   Adjust Stock Quantity
//                 </h2>
//                 <p className="mt-1 text-xs text-slate-500">
//                   {adjustItem.product?.name} — {adjustItem.variant?.variantName}
//                   {' '}(Current: {adjustItem.quantity})
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={() => {
//                   if (savingAdj) return;
//                   setAdjustItem(null);
//                   setChangeQty('');
//                   setReason('');
//                   setMovementType('adjustment');
//                 }}
//                 disabled={savingAdj}
//                 className="shrink-0 rounded-md p-1 text-2xl font-bold leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
//                 aria-label="Close adjust stock popup"
//                 title="Close"
//               >
//                 &times;
//               </button>
//             </div>

//             <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-slate-700">
//                   Movement Reason Type
//                 </label>
//                 <select
//                   value={movementType}
//                   onChange={(e) => setMovementType(e.target.value)}
//                   className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm"
//                 >
//                   <option value="adjustment">Manual Adjustment</option>
//                   <option value="damaged">Damaged / Expired</option>
//                   <option value="return">Returned Stock</option>
//                   <option value="receipt">Goods Receipt</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-slate-700">
//                   Quantity Delta (e.g. +5 or -3)
//                 </label>
//                 <Input
//                   type="number"
//                   required
//                   value={changeQty}
//                   onChange={(e) => setChangeQty(e.target.value)}
//                   placeholder="e.g. 5 or -2"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-slate-700">
//                   Audit Reason *
//                 </label>
//                 <Input
//                   required
//                   value={reason}
//                   onChange={(e) => setReason(e.target.value)}
//                   placeholder="e.g. Periodic stock count correction"
//                 />
//               </div>

//               <div className="flex justify-end gap-2 pt-2">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   onClick={() => {
//                     if (savingAdj) return;
//                     setAdjustItem(null);
//                     setChangeQty('');
//                     setReason('');
//                     setMovementType('adjustment');
//                   }}
//                   disabled={savingAdj}
//                 >
//                   Cancel
//                 </Button>

//                 <Button type="submit" disabled={savingAdj}>
//                   {savingAdj ? 'Applying...' : 'Confirm Adjustment'}
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
      
//     </div>
//   );
// }


import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';
import { hasPermission } from '../../../services/permissions.js';

export default function ShopInventory() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stock');
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [totalValuation, setTotalValuation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Search
  const [search, setSearch] = useState('');

  // Adjustment Modal
  const [adjustItem, setAdjustItem] = useState(null);
  const [changeQty, setChangeQty] = useState('');
  const [reason, setReason] = useState('');
  const [movementType, setMovementType] = useState('adjustment');
  const [savingAdj, setSavingAdj] = useState(false);

  const canAdjust =
    user?.shop?.role === 'shop_owner' ||
    hasPermission(user?.permissions, 'inventory.update');

  const loadInventory = () => {
    setLoading(true);
    setError(null);

    api.get('/shop/inventory')
      .then((res) => {
        setItems(res.items || []);
        setTotalValuation(res.totalValuation || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadMovements = () => {
    setLoading(true);
    setError(null);

    api.get('/shop/inventory/movements')
      .then((res) => setMovements(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'stock') loadInventory();
    else loadMovements();
  }, [tab]);

  // Filter inventory by product name
  const filteredItems = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) return items;

    return items.filter((item) =>
      String(item.product?.name || '')
        .toLowerCase()
        .includes(searchTerm)
    );
  }, [items, search]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();

    if (!adjustItem || !changeQty || !reason.trim()) return;

    setSavingAdj(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/shop/inventory/adjust', {
        productVariantId: adjustItem.productVariantId,
        changeQuantity: Number(changeQty),
        reason: reason.trim(),
        movementType,
      });

      setSuccess(
        `Inventory adjusted for ${adjustItem.product?.name} (${adjustItem.variant?.variantName})`
      );

      setAdjustItem(null);
      setChangeQty('');
      setReason('');
      setMovementType('adjustment');

      loadInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAdj(false);
    }
  };

  const closeAdjustment = () => {
    if (savingAdj) return;

    setAdjustItem(null);
    setChangeQty('');
    setReason('');
    setMovementType('adjustment');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Retail Inventory & Stock
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time stock quantities, low-stock alerts, and full traceability of stock movements.
          </p>
        </div>

        <div className="rounded-lg bg-indigo-50 px-4 py-2 text-right">
          <div className="text-xs font-semibold uppercase text-indigo-600">
            Total Stock Valuation
          </div>
          <div className="text-xl font-bold text-indigo-900">
            ₹{Number(totalValuation).toFixed(2)}
          </div>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setTab('stock')}
            className={`border-b-2 py-2 text-sm font-medium ${
              tab === 'stock'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Current Stock Levels
          </button>

          <button
            type="button"
            onClick={() => setTab('movements')}
            className={`border-b-2 py-2 text-sm font-medium ${
              tab === 'movements'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Audit Trail & Movements History
          </button>
        </nav>
      </div>

      {/* Search - Current Stock */}
      {tab === 'stock' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name..."
            />
          </div>

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : tab === 'stock' ? (
        filteredItems.length === 0 ? (
          <Card>
            <div className="py-8 text-center text-sm text-slate-500">
              {search
                ? `No products found matching "${search}".`
                : 'No inventory entries found.'}
            </div>
          </Card>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Showing {filteredItems.length} of {items.length} inventory entries
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Variant</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Retail Price</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Valuation</th>
                    {canAdjust && <th className="px-4 py-3">Action</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {it.product?.name}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {it.variant?.variantName}{' '}
                        <span className="font-mono text-xs text-slate-400">
                          ({it.variant?.sku})
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">
                        {it.product?.category?.name || '—'}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        ₹{Number(it.retailPrice || 0).toFixed(2)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            it.isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {it.quantity} units
                          {it.isLowStock && (
                            <span className="text-[10px] font-normal text-amber-700">
                              (Low)
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-900">
                        ₹{Number(it.valuation || 0).toFixed(2)}
                      </td>

                      {canAdjust && (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setAdjustItem(it)}
                            className="text-xs font-medium text-indigo-600 underline hover:text-indigo-800"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : movements.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            No stock movements recorded yet.
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product / Variant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Balance After</th>
                <th className="px-4 py-3">Reason / Ref</th>
                <th className="px-4 py-3">Actor</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-900">
                    {m.product?.name} ({m.variant?.variantName})
                  </td>

                  <td className="px-4 py-3 capitalize text-slate-700">
                    {m.movementType}
                  </td>

                  <td className="px-4 py-3 font-bold">
                    <span className={m.changeQuantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {m.changeQuantity > 0
                        ? `+${m.changeQuantity}`
                        : m.changeQuantity}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {m.balanceAfter}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {m.notes || m.referenceType || '—'}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {m.creator?.name || 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Adjust Stock Quantity
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {adjustItem.product?.name} — {adjustItem.variant?.variantName}
                  {' '}(Current: {adjustItem.quantity})
                </p>
              </div>

              <button
                type="button"
                onClick={closeAdjustment}
                disabled={savingAdj}
                className="shrink-0 rounded-md p-1 text-2xl font-bold leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close adjust stock popup"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Movement Reason Type
                </label>

                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm"
                >
                  <option value="adjustment">Manual Adjustment</option>
                  <option value="damaged">Damaged / Expired</option>
                  <option value="return">Returned Stock</option>
                  <option value="receipt">Goods Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Quantity Delta (e.g. +5 or -3)
                </label>

                <Input
                  type="number"
                  required
                  value={changeQty}
                  onChange={(e) => setChangeQty(e.target.value)}
                  placeholder="e.g. 5 or -2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Audit Reason *
                </label>

                <Input
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Periodic stock count correction"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeAdjustment}
                  disabled={savingAdj}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={savingAdj}>
                  {savingAdj ? 'Applying...' : 'Confirm Adjustment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
