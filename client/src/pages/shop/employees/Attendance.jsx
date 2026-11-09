import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner } from '../../../components/ui.jsx';

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const currentMonth = () => today().slice(0, 7);
const statusName = { present: 'Present', absent: 'Absent', half_day: 'Half Day', on_leave: 'Leave' };

export default function ShopAttendance() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ userId: '', date: today(), status: 'present', checkIn: '09:00', checkOut: '18:00', workingHours: '8', notes: '' });
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (from || to) { if (from) params.set('from', from); if (to) params.set('to', to); }
      else params.set('month', month);
      if (employeeId) params.set('userId', employeeId);
      if (statusFilter) params.set('status', statusFilter);
      const [att, emp] = await Promise.all([api.get(`/shop/attendance?${params}`), api.get('/shop/attendance/employees')]);
      setRecords(att.items || []); setSummary(att.summary || {}); setEmployees(emp.items || []);
      if (!form.userId && emp.items?.length) setForm((current) => ({ ...current, userId: String(emp.items[0].userId) }));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [month, from, to, employeeId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const body = {
      userId: Number(form.userId), date: form.date, status: form.status,
      checkIn: ['present', 'half_day'].includes(form.status) ? form.checkIn || undefined : null,
      checkOut: ['present', 'half_day'].includes(form.status) ? form.checkOut || undefined : null,
      workingHours: ['present', 'half_day'].includes(form.status) ? Number(form.workingHours || 0) : 0,
      notes: form.notes || undefined,
    };
    try {
      if (editing) await api.patch(`/shop/attendance/${editing.id}`, body);
      else await api.post('/shop/attendance', body);
      setNotice(editing ? 'Attendance correction saved.' : 'Attendance recorded.');
      setEditing(null); setForm((current) => ({ ...current, date: today(), notes: '' }));
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const edit = (record) => {
    setEditing(record);
    setForm({ userId: String(record.userId), date: record.date, status: record.status, checkIn: record.checkIn?.slice(0, 5) || '', checkOut: record.checkOut?.slice(0, 5) || '', workingHours: String(record.workingHours || 0), notes: record.notes || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setEditing(null); setForm((current) => ({ ...current, date: today(), notes: '' })); };

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold text-slate-900">Attendance</h1><p className="mt-1 text-sm text-slate-600">Record and correct attendance for employees in this shop.</p></div>
    {error && <Alert>{error}</Alert>}{notice && <Alert kind="success">{notice}</Alert>}
    <Card><h2 className="mb-4 font-semibold">{editing ? 'Correct Attendance' : 'Record Attendance'}</h2><form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Employee" required><Select required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>{employees.map((emp) => <option key={emp.userId} value={emp.userId}>{emp.name}</option>)}</Select></Field><Field label="Date" required><Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Status" required><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="present">Present</option><option value="absent">Absent</option><option value="half_day">Half Day</option><option value="on_leave">Leave</option></Select></Field><Field label="Working hours"><Input type="number" min="0" max="24" step="0.25" value={form.workingHours} disabled={form.status === 'absent' || form.status === 'on_leave'} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} /></Field><Field label="Check-in"><Input type="time" value={form.checkIn} disabled={form.status === 'absent' || form.status === 'on_leave'} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></Field><Field label="Check-out"><Input type="time" value={form.checkOut} disabled={form.status === 'absent' || form.status === 'on_leave'} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></Field><Field label="Note"><Input maxLength={255} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field><div className="flex items-end gap-2"><Button type="submit" loading={saving} disabled={!employees.length}>{editing ? 'Save correction' : 'Mark attendance'}</Button>{editing && <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button>}</div></form></Card>
    <div className="flex flex-wrap items-end gap-3"><Field label="Month summary"><Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setFrom(''); setTo(''); }} /></Field><Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field><Field label="Employee history"><Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}><option value="">All employees</option>{employees.map((e) => <option key={e.userId} value={e.userId}>{e.name}</option>)}</Select></Field><Field label="Status"><Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{Object.entries(statusName).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field></div>
    {!from && !to && <div className="flex flex-wrap gap-2">{Object.entries(statusName).map(([key, label]) => <Badge key={key}>{label}: {summary[key] || 0}</Badge>)}</div>}
    {loading ? <Spinner /> : <Card className="overflow-x-auto p-0"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={record.id}><td className="px-4 py-3">{record.date}</td><td className="px-4 py-3">{record.user?.name}</td><td className="px-4 py-3"><Badge tone={record.status === 'present' ? 'green' : record.status === 'absent' ? 'red' : 'amber'}>{statusName[record.status]}</Badge></td><td className="px-4 py-3">{record.checkIn && record.checkOut ? `${record.checkIn.slice(0, 5)} – ${record.checkOut.slice(0, 5)}` : '—'}</td><td className="px-4 py-3">{record.workingHours ?? '—'}</td><td className="px-4 py-3">{record.notes || '—'}</td><td className="px-4 py-3"><Button variant="secondary" onClick={() => edit(record)}>Edit</Button></td></tr>)}{records.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No attendance records for this filter.</td></tr>}</tbody></table></Card>}
  </div>;
}
