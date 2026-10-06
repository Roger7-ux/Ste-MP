import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HOME } from '../components/RequireRole.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, SegmentedControl } from '../components/ui/forms.jsx';
import { Alert, Card, LoadingLabel, Skeleton } from '../components/ui/primitives.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { api } from '../services/api.js';
import { validateLogin, validateRegistration } from '../utils/validation.js';

const MODES = [
  { value: 'signin', label: 'Sign in' },
  { value: 'register', label: 'Create account' },
];

// Where to go after signing in: back to the page that asked for it, when that
// page belongs to this role, otherwise the role's home.
export function destinationAfterLogin(user, from) {
  const home = HOME[user.role];
  // A patient who scanned a QR code goes back to finish that booking.
  const patientPage = user.role === 'PATIENT' && (from?.startsWith('/doctors') || from?.startsWith('/book/'));
  if (from && (from.startsWith(home) || patientPage)) return from;
  return user.role === 'PATIENT' ? '/patient/appointments' : home;
}

export function AuthSkeleton() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <LoadingLabel />
      <Skeleton className="h-96 w-full rounded-card" />
    </div>
  );
}

// Patient sign-in and registration on one screen, switched by the control at
// the top. Each has its own address (/login and /register).
export default function AuthPage({ mode }) {
  const registering = mode === 'register';
  usePageMeta(registering ? 'Create account' : 'Sign in');

  const { user, loading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;

  const [form, setForm] = useState({ name: '', phone: '', email: location.state?.email || '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <AuthSkeleton />;
  // Signed-in users have no use for this page.
  if (user) return <Navigate to={destinationAfterLogin(user, from)} replace />;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  function switchMode(next) {
    setErrors({});
    setFormError('');
    // Carry the typed email across, since each mode is its own page.
    navigate(next === 'register' ? '/register' : '/login', {
      replace: true,
      state: { ...location.state, email: form.email },
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const found = registering ? validateRegistration(form) : validateLogin(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      if (registering) await api.post('/auth/register', form);
      // After registering, the new patient is signed straight in.
      await login(form.email.trim(), form.password, 'PATIENT');
    } catch (err) {
      const fieldErrors = err.errors || {};
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : err.message);
      setForm((current) => ({ ...current, password: '' }));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl">Welcome to the clinic</h1>
        <p className="mt-2 text-muted">
          {registering ? 'Create a patient account to book and track visits.' : 'Sign in to book and track your visits.'}
        </p>
      </div>

      <Card className="animate-rise mt-8 p-5 sm:p-6">
        <SegmentedControl label="Sign in or create an account" options={MODES} value={mode} onChange={switchMode} />

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {from && <Alert tone="info">Please sign in to continue with your booking.</Alert>}
          <Alert>{formError}</Alert>

          {registering && (
            <>
              <Field label="Full name" autoComplete="name" value={form.name} onChange={update('name')} error={errors.name} />
              <Field
                label="Phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={update('phone')}
                error={errors.phone}
                hint="10 to 15 digits, for example 9876543210."
              />
            </>
          )}
          <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={errors.email} />
          <Field
            label="Password"
            type="password"
            autoComplete={registering ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            hint={registering ? 'At least 6 characters.' : undefined}
          />
          <Button type="submit" loading={submitting} className="w-full">
            {registering ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-muted">
        Doctor or clinic staff?{' '}
        <Link to="/staff/login" className="font-semibold text-primary underline-offset-4 hover:underline dark:text-foreground">
          Doctor and staff sign in
        </Link>
      </p>
    </div>
  );
}
