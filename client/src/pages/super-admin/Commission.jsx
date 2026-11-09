// import { useEffect, useState } from 'react';
// import { api } from '../../services/api.js';
// import { Alert, Button, Card, Input, Spinner } from '../../components/ui.jsx';

// export default function Commission() {
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);
//   const [percentage, setPercentage] = useState('5.00');
//   const [minOrderAmount, setMinOrderAmount] = useState('0.00');
//   const [notes, setNotes] = useState('');

//   useEffect(() => {
//     api
//       .get('/admin/commission')
//       .then((res) => {
//         if (res.setting) {
//           setPercentage(String(res.setting.percentage));
//           setMinOrderAmount(String(res.setting.minOrderAmount));
//           setNotes(res.setting.notes || '');
//         }
//       })
//       .catch((err) => setError(err.message))
//       .finally(() => setLoading(false));
//   }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setSaving(true);
//     setError(null);
//     setSuccess(null);
//     try {
//       const res = await api.put('/admin/commission', {
//         percentage: Number(percentage),
//         minOrderAmount: Number(minOrderAmount),
//         notes,
//       });
//       setSuccess('Platform commission rate updated successfully.');
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) return <Spinner />;

//   return (
//     <div className="mx-auto max-w-3xl space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-slate-900">Platform Commission Settings</h1>
//         <p className="mt-1 text-sm text-slate-600">
//           Set the platform fee percentage applied to retail orders. Order commission amounts are recorded as historical
//           snapshots and will not alter past orders when updated.
//         </p>
//       </div>

//       {error && <Alert variant="error">{error}</Alert>}
//       {success && <Alert variant="success">{success}</Alert>}

//       <Card>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-slate-700">Commission Percentage (%)</label>
//             <Input
//               type="number"
//               step="0.01"
//               min="0"
//               max="100"
//               required
//               value={percentage}
//               onChange={(e) => setPercentage(e.target.value)}
//               placeholder="e.g. 0.00"
//             />
//             <p className="mt-1 text-xs text-slate-500">The platform takes this percentage from order item subtotals.</p>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-slate-700">Minimum Order Amount for Commission (₹)</label>
//             <Input
//               type="number"
//               step="0.01"
//               min="0"
//               required
//               value={minOrderAmount}
//               onChange={(e) => setMinOrderAmount(e.target.value)}
//               placeholder="e.g. 0.00"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-slate-700">Notes / Policy Description</label>
//             <textarea
//               rows={3}
//               className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//               placeholder="e.g. Standard 5% platform service fee applied to retail transactions."
//             />
//           </div>

//           <div className="pt-2">
//             <Button type="submit" disabled={saving}>
//               {saving ? 'Saving...' : 'Save Commission Settings'}
//             </Button>
//           </div>
//         </form>
//       </Card>
//     </div>
//   );
// }

