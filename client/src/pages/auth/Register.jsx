import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input } from '../../components/ui.jsx';
import { useAuth, homePath } from '../../context/AuthContext.jsx';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const user = await register(name, email, password, phone || undefined);

if (user.role === 'customer') {
  navigate('/customer', { replace: true });
} else {
  navigate(homePath(user), { replace: true });
}
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="text-3xl font-extrabold text-indigo-700">
            Multivendor
          </Link>
          <h1 className="mt-2 text-xl font-bold text-slate-900">Create Customer Account</h1>
          <p className="mt-1 text-sm text-slate-500">Sign up to browse products, shop, and track orders.</p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address *</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Phone Number</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password *</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Creating Account...' : 'Register'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 border-t pt-4">
            Already have an account?{' '}
            <Link to="/customer/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
