import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homePath } from '../../context/AuthContext.jsx';
import { Alert, Button, Card, Field, Input } from '../../components/ui.jsx';

export default function CustomerRegister() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!loading && user) return <Navigate to={homePath(user)} replace />;
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) return setError('Password must be at least 8 characters and contain a letter and a number.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setBusy(true);
    try { await register(form.name, form.email, form.password, form.phone); navigate('/customer', { replace: true }); }
    catch (err) { setError(err.message || 'Could not create your account.'); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-md py-8"><h1 className="mb-6 text-center text-2xl font-bold">Create your customer account</h1><Card><form onSubmit={submit} className="space-y-4">
    {error && <Alert>{error}</Alert>}
    <Field label="Full name" required><Input value={form.name} onChange={update('name')} autoComplete="name" minLength={2} maxLength={120} required /></Field>
    <Field label="Email" required><Input type="email" value={form.email} onChange={update('email')} autoComplete="email" required /></Field>
    <Field label="Phone"><Input type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" maxLength={20} /></Field>
    <Field label="Password" hint="Use at least 8 characters." required><Input type="password" value={form.password} onChange={update('password')} autoComplete="new-password" minLength={8} required /></Field>
    <Field label="Confirm password" required><Input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} autoComplete="new-password" required /></Field>
    <Button type="submit" loading={busy} className="w-full">Create account</Button>
  </form></Card><p className="mt-4 text-center text-sm text-slate-600">Already registered? <Link className="font-semibold text-indigo-700" to="/customer/login">Sign in</Link></p></div>;
}
