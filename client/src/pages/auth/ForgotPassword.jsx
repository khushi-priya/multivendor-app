import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Button, Card, Field, Input } from '../../components/ui.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const d = await api.post('/auth/forgot-password', { email });
      setMessage(d.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold">Forgot password</h2>
            {message && <Alert kind="success">{message}</Alert>}
            {error && <Alert>{error}</Alert>}
            {!message && (
              <>
                <Field label="Email" required>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Button type="submit" loading={busy} className="w-full">
                  Send reset link
                </Button>
              </>
            )}
            <p className="text-center text-sm">
              <Link to="/login" className="text-indigo-600 hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
