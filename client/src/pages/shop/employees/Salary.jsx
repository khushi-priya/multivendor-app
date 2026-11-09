import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Button, Card, Field, Input, Select, Spinner } from '../../../components/ui.jsx';

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function ShopSalary() {
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState('');
  const [salaryType, setSalaryType] = useState('monthly');
  const [baseSalary, setBaseSalary] = useState('0.00');
  const [allowances, setAllowances] = useState('0.00');
  const [deductions, setDeductions] = useState('0.00');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [employeeData, salaryData] = await Promise.all([api.get('/shop/employees?page=1&pageSize=100&status=active&excludeOwners=true'), api.get('/shop/salary')]);
      setEmployees(employeeData.items || []); setHistory(salaryData.items || []);
      setUserId((current) => current || String(employeeData.items?.[0]?.userId || ''));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const selected = employees.find((e) => e.userId === Number(userId));
  const employeeHistory = history.filter((record) => record.userId === Number(userId));
  const choose = (id) => {
    setUserId(id);
    const employee = employees.find((e) => e.userId === Number(id));
    const latest = history.filter((s) => s.userId === Number(id) && s.effectiveDate <= today()).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    setSalaryType(latest?.salaryType || employee?.profile?.salaryType || 'monthly');
    setBaseSalary(String(latest?.baseSalary ?? employee?.profile?.baseSalary ?? '0.00'));
    setAllowances(String(latest?.allowances ?? '0.00'));
    setDeductions(String(latest?.deductions ?? '0.00'));
  };
  useEffect(() => { if (employees.length && userId) choose(userId); }, [employees, history]); // refresh shown snapshot when data arrives

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await api.post('/shop/salary', { userId: Number(userId), salaryType, baseSalary, allowances, deductions, effectiveDate, notes: notes || undefined });
      setNotice('Salary change saved with its effective date.'); setNotes(''); await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold text-slate-900">Salary Management</h1><p className="mt-1 text-sm text-slate-600">Create dated salary records. Past salary history is preserved.</p></div>
    {error && <Alert>{error}</Alert>}{notice && <Alert kind="success">{notice}</Alert>}
    <Card><form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Employee" required><Select required value={userId} onChange={(e) => choose(e.target.value)}>{employees.map((employee) => <option key={employee.userId} value={employee.userId}>{employee.name} · {employee.profile?.designation || employee.role.replace(/_/g, ' ')}</option>)}</Select></Field><Field label="Salary basis" required><Select value={salaryType} onChange={(e) => setSalaryType(e.target.value)}><option value="monthly">Monthly salary</option><option value="daily">Daily rate</option><option value="hourly">Hourly rate</option></Select></Field><Field label={salaryType === 'monthly' ? 'Monthly base salary' : `${salaryType} rate`} required><Input type="number" min="0" max="99999999.99" step="0.01" required value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} /></Field><Field label="Allowances" required><Input type="number" min="0" max="99999999.99" step="0.01" required value={allowances} onChange={(e) => setAllowances(e.target.value)} /></Field><Field label="Other deductions" required><Input type="number" min="0" max="99999999.99" step="0.01" required value={deductions} onChange={(e) => setDeductions(e.target.value)} /></Field><Field label="Effective date" required><Input type="date" required value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></Field><Field label="Notes"><Input maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field><div className="flex items-end"><Button type="submit" loading={saving} disabled={!employees.length}>Save salary record</Button></div></form>{!employees.length && <p className="mt-3 text-sm text-slate-500">Create an active employee before configuring salary.</p>}</Card>
    <Card className="overflow-x-auto p-0"><div className="border-b border-slate-100 px-4 py-3"><h2 className="font-semibold">Salary history {selected ? `· ${selected.name}` : ''}</h2></div><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">Basis</th><th className="px-4 py-3">Base rate</th><th className="px-4 py-3">Allowances</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Notes</th></tr></thead><tbody className="divide-y divide-slate-100">{employeeHistory.map((s) => <tr key={s.id}><td className="px-4 py-3">{s.user?.name}</td><td className="px-4 py-3">{s.effectiveDate}</td><td className="px-4 py-3 capitalize">{s.salaryType}</td><td className="px-4 py-3">{s.baseSalary}</td><td className="px-4 py-3">{s.allowances}</td><td className="px-4 py-3">{s.deductions}</td><td className="px-4 py-3">{s.notes || '—'}</td></tr>)}{!employeeHistory.length && selected && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No dated salary changes yet. Current profile rate: {selected.profile?.salaryType || 'monthly'} {selected.profile?.baseSalary ?? '0.00'}.</td></tr>}</tbody></table></Card>
  </div>;
}
