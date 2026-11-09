import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Button, Card, Field, Input, fieldError } from '../../components/ui.jsx';

// Used for both first-time account setup (owner invitations) and password reset.
export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const isSetup = params.get('mode') === 'setup';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return;
    setError('');
    setDetails({});
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
      setDetails(err.details);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Card>
          {done ? (
            <div className="space-y-4">
              <Alert kind="success">{isSetup ? 'Your account is ready.' : 'Password updated.'} You can now sign in.</Alert>
              <Link to="/login" className="block text-center text-sm font-medium text-indigo-600 hover:underline">
                Go to sign in
              </Link>
            </div>
          ) : !token ? (
            <Alert>This link is missing its token. Please use the link from your email.</Alert>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold">{isSetup ? 'Set up your account' : 'Choose a new password'}</h2>
              {error && <Alert>{error}</Alert>}
              <Field label="New password" required hint="At least 8 characters, with a letter and a number." error={fieldError(details, 'password')}>
                <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <Field label="Confirm password" required error={mismatch ? 'Passwords do not match' : undefined}>
                <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </Field>
              <Button type="submit" loading={busy} disabled={mismatch} className="w-full">
                {isSetup ? 'Set password' : 'Update password'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
