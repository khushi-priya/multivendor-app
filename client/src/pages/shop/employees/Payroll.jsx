import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner } from '../../../components/ui.jsx';

const thisMonth = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const cash = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function ShopPayroll() {
  const [runs, setRuns] = useState([]);
  const [legacyPayments, setLegacyPayments] = useState([]);
  const [run, setRun] = useState(null);
  const [payPeriod, setPayPeriod] = useState(thisMonth());
  const [draftEdits, setDraftEdits] = useState({});
  const [paymentItem, setPaymentItem] = useState(null);
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRuns = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/shop/payroll');
      setRuns(data.items || []);
      setLegacyPayments(data.legacyPayments || []);
      return data.items || [];
    } catch (e) { setError(e.message); return []; }
  }, []);
  const loadRun = useCallback(async (id) => {
    setLoading(true); setError('');
    try {
      const data = await api.get(`/shop/payroll/${id}`);
      setRun(data.run);
      setDraftEdits(Object.fromEntries((data.run.items || []).map((item) => [item.id, { allowances: String(item.allowances), deductions: String(item.deductions), notes: item.notes || '' }])));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadRuns().then((items) => {
      setLoading(false);
      if (items.length) loadRun(items[0].id);
    });
  }, [loadRuns, loadRun]);

  const generate = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await api.post('/shop/payroll', { payPeriod });
      setNotice(`Payroll draft created for ${payPeriod}. No payments have been recorded.`);
      await loadRuns(); await loadRun(data.run.id);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const saveLine = async (item) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await api.patch(`/shop/payroll/${run.id}/items/${item.id}`, draftEdits[item.id]);
      setNotice(`Draft calculation updated for ${item.employeeName}.`); await loadRun(run.id); await loadRuns();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const finalize = async () => {
    if (!window.confirm(`Finalize payroll for ${run.payPeriod}? Finalized calculations cannot be edited.`)) return;
    setBusy(true); setError(''); setNotice('');
    try { await api.post(`/shop/payroll/${run.id}/finalize`); setNotice('Payroll finalized. Payments remain unpaid until recorded.'); await loadRun(run.id); await loadRuns(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const recordPayment = async (event) => {
    event.preventDefault(); if (!paymentItem) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.post(`/shop/payroll/${run.id}/items/${paymentItem.id}/payment`, { paymentDate, paymentMethod });
      setPaymentItem(null); setNotice(`Payment recorded for ${paymentItem.employeeName}.`); await loadRun(run.id); await loadRuns();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold text-slate-900">Payroll</h1><p className="mt-1 text-sm text-slate-600">Generate a reviewable draft, finalize its snapshot, then record actual payments.</p></div>
    {error && <Alert>{error}</Alert>}{notice && <Alert kind="success">{notice}</Alert>}
    <Card><form onSubmit={generate} className="flex flex-wrap items-end gap-3"><Field label="Payroll month" required><Input type="month" required value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} /></Field><Button type="submit" loading={busy}>Generate payroll draft</Button><Button type="button" variant="secondary" onClick={() => window.print()} disabled={!run}>Print statement</Button></form><p className="mt-3 text-xs text-slate-500">Shop is derived from your signed-in owner membership. One payroll run is allowed per shop and month.</p></Card>
    <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
      <div className="space-y-4"><Card className="h-fit p-0"><h2 className="border-b border-slate-100 px-4 py-3 font-semibold">Payroll history</h2>{runs.length ? <div className="divide-y divide-slate-100">{runs.map((entry) => <button key={entry.id} onClick={() => loadRun(entry.id)} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${run?.id === entry.id ? 'bg-indigo-50' : ''}`}><span className="font-medium">{entry.payPeriod}</span><span className="float-right"><Badge tone={entry.status === 'finalized' ? 'green' : 'amber'}>{entry.status}</Badge></span><span className="mt-1 block text-xs text-slate-500">Net {cash(entry.totalNet)} · {entry.items?.length || 0} employees</span></button>)}</div> : <p className="px-4 py-6 text-center text-sm text-slate-500">No payroll runs yet.</p>}</Card>{legacyPayments.length > 0 && <Card className="p-3"><h3 className="font-semibold">Previously recorded payments</h3><div className="mt-2 max-h-64 space-y-2 overflow-auto">{legacyPayments.map((payment) => <div key={payment.id} className="border-t border-slate-100 pt-2 text-xs"><div className="font-medium">{payment.user?.name || 'Employee'} · {payment.payPeriod}</div><div className="text-slate-500">{cash(payment.netAmount)} · {payment.status} · {payment.paymentDate}</div></div>)}</div></Card>}</div>
      <div className="min-w-0 space-y-4">{loading ? <Spinner /> : !run ? <Card><p className="text-sm text-slate-500">Generate a draft to review payroll calculations.</p></Card> : <>
        <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Payroll · {run.payPeriod}</h2><p className="mt-1 text-sm text-slate-500">Gross {cash(run.totalGross)} · Deductions {cash(run.totalDeductions)} · Net {cash(run.totalNet)}</p></div><div className="flex gap-2"><Badge tone={run.status === 'finalized' ? 'green' : 'amber'}>{run.status}</Badge>{run.status === 'draft' && <Button onClick={finalize} loading={busy}>Finalize payroll</Button>}</div></div></Card>
        <Card className="overflow-x-auto p-0"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Employee / Calculation</th><th className="px-3 py-3">Base</th><th className="px-3 py-3">Payable</th><th className="px-3 py-3">Attendance deduction</th><th className="px-3 py-3">Allowances</th><th className="px-3 py-3">Other deductions</th><th className="px-3 py-3">Net</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{(run.items || []).map((item) => <tr key={item.id} className="align-top"><td className="max-w-xs px-3 py-3"><div className="font-medium">{item.employeeName}</div><div className="text-xs text-slate-500">{item.designation} · {item.salaryType}</div><details className="mt-1 text-xs text-slate-500"><summary className="cursor-pointer">Calculation basis</summary><p className="mt-1">{item.calculationBasis}</p></details></td><td className="px-3 py-3">{cash(item.baseSalary)}</td><td className="px-3 py-3">{item.payableDays}/{item.totalDays} days<br />{Number(item.totalHours).toFixed(2)} hours</td><td className="px-3 py-3">{cash(item.attendanceDeduction)}</td><td className="min-w-28 px-3 py-3">{run.status === 'draft' ? <Input aria-label={`Allowances ${item.employeeName}`} type="number" min="0" step="0.01" value={draftEdits[item.id]?.allowances ?? item.allowances} onChange={(e) => setDraftEdits({ ...draftEdits, [item.id]: { ...draftEdits[item.id], allowances: e.target.value } })} /> : cash(item.allowances)}</td><td className="min-w-28 px-3 py-3">{run.status === 'draft' ? <Input aria-label={`Deductions ${item.employeeName}`} type="number" min="0" step="0.01" value={draftEdits[item.id]?.deductions ?? item.deductions} onChange={(e) => setDraftEdits({ ...draftEdits, [item.id]: { ...draftEdits[item.id], deductions: e.target.value } })} /> : cash(item.deductions)}</td><td className="px-3 py-3 font-semibold">{cash(item.netAmount)}</td><td className="px-3 py-3"><Badge tone={item.paymentStatus === 'paid' ? 'green' : 'amber'}>{item.paymentStatus}</Badge>{item.paymentDate && <div className="mt-1 text-xs text-slate-500">{item.paymentDate} · {item.paymentMethod}</div>}</td><td className="px-3 py-3">{run.status === 'draft' ? <Button variant="secondary" disabled={busy} onClick={() => saveLine(item)}>Save</Button> : item.paymentStatus === 'pending' ? <Button variant="secondary" onClick={() => { setPaymentItem(item); setPaymentDate(today()); }}>Record payment</Button> : '—'}</td></tr>)}{!run.items?.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No eligible employees in this payroll.</td></tr>}</tbody></table></Card>
      </>}</div>
    </div>
    {paymentItem && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPaymentItem(null)}><div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}><Card><h2 className="text-lg font-semibold">Record payment · {paymentItem.employeeName}</h2><p className="mt-1 text-sm text-slate-500">Amount: {cash(paymentItem.netAmount)}</p><form onSubmit={recordPayment} className="mt-4 space-y-4"><Field label="Payment date" required><Input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></Field><Field label="Payment method" required><Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option></Select></Field><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPaymentItem(null)}>Cancel</Button><Button type="submit" loading={busy}>Confirm payment recorded</Button></div></form></Card></div></div>}
  </div>;
}
