import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { homePath, useAuth } from '../../context/AuthContext.jsx';
import { Alert, Button, Card, Field, Input } from '../../components/ui.jsx';

export default function ShopOwnerLogin() {
  const { user, loading, loginShopOwner } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // A Super Admin often opens this page from Shops while still signed in.
  // Keep the owner form available so owner credentials can replace that session.
  if (!loading && user?.shop?.role === 'shop_owner') return <Navigate to="/shop/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const signedInUser = await loginShopOwner(email.trim(), password);
      navigate(homePath(signedInUser), { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-indigo-700">Shop Owner Sign In</h1>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-slate-600">Sign in with the email and password set up for your shop account.</p>
            {!loading && user && user.shop?.role !== 'shop_owner' && (
              <Alert kind="info">You are signed in as {user.name}. Signing in here will switch this browser session to the shop owner account.</Alert>
            )}
            {error && <Alert>{error}</Alert>}
            <Field label="Email" required>
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password" required>
              <div className="flex gap-2">
                <Input className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="button" variant="secondary" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
            </Field>
            <Button type="submit" loading={busy} className="w-full">Sign In</Button>
            <Link to="/forgot-password" className="block text-center text-sm text-indigo-600 hover:underline">Forgot password?</Link>
            <p className="text-center text-xs text-slate-500">Need an account? Ask your platform administrator to create a shop for you.</p>
          </form>
        </Card>
        <Link to="/login" className="mt-4 block text-center text-sm text-slate-600 hover:underline">Super Admin and other sign in</Link>
      </div>
    </main>
  );
}
