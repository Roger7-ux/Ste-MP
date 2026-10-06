import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Field, SegmentedControl, SelectField } from '../components/ui/forms.jsx';
import { Alert, Card, IconTile } from '../components/ui/primitives.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useClinic } from '../hooks/useClinic.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { api } from '../services/api.js';
import { SPECIALTY_NAMES } from '../utils/constants.js';
import { validateLogin, validateStaffRegistration } from '../utils/validation.js';
import { AuthSkeleton, destinationAfterLogin } from './AuthPage.jsx';

const MODES = [
  { value: 'signin', label: 'Sign in' },
  { value: 'register', label: 'Create account' },
];

const ROLES = [
  { value: 'STAFF', label: 'Staff' },
  { value: 'DOCTOR', label: 'Doctor' },
];

// Doctors and staff sign in on their own screen. A new team member can create
// an account only with the clinic code, which the clinic administrator hands
// out; the option is hidden when the clinic has switched sign-up off. A doctor
// links the account to their profile in the directory, or starts a new one.
export default function StaffLogin({ mode = 'signin' }) {
  const { staffSignupEnabled, clinic } = useClinic();
  const registering = mode === 'register';
  usePageMeta(registering ? 'Create doctor or staff account' : 'Doctor and staff sign in');

  const { user, loading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: location.state?.email || '',
    password: '',
    role: 'STAFF',
    doctorId: '',
    specialization: '',
    clinicCode: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Profiles staff have added that no doctor has claimed yet.
  const doctors = useFetch(() => (registering ? api.get('/doctors') : Promise.resolve({ doctors: [] })), [registering]);
  const unclaimed = (doctors.data?.doctors || []).filter((doctor) => !doctor.hasAccount);

  if (loading) return <AuthSkeleton />;
  if (user) return <Navigate to={destinationAfterLogin(user, location.state?.from)} replace />;
  // Once the clinic's settings have loaded, a switched-off sign-up goes back to sign in.
  if (registering && clinic && !staffSignupEnabled) return <Navigate to="/staff/login" replace />;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  // Choosing an existing profile fills in its name.
  function chooseProfile(event) {
    const doctor = unclaimed.find((item) => String(item.id) === event.target.value);
    setForm({ ...form, doctorId: event.target.value, name: doctor ? doctor.name : form.name });
  }

  function switchMode(next) {
    setErrors({});
    setFormError('');
    navigate(next === 'register' ? '/staff/register' : '/staff/login', {
      replace: true,
      state: { ...location.state, email: form.email },
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const found = registering ? validateStaffRegistration(form) : validateLogin(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      if (registering) await api.post('/auth/register-staff', { ...form, doctorId: form.doctorId ? Number(form.doctorId) : null });
      await login(form.email.trim(), form.password, 'STAFF');
    } catch (err) {
      const fieldErrors = err.errors || {};
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : err.message);
      setForm((current) => ({ ...current, password: '' }));
      setSubmitting(false);
    }
  }

  const asDoctor = registering && form.role === 'DOCTOR';

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <Card className="animate-rise p-5 sm:p-6">
        <IconTile icon={ShieldCheck} size="lg" />
        <h1 className="mt-4 text-3xl">{registering ? 'Create a team account' : 'Doctor and staff sign in'}</h1>
        <p className="mt-1 text-sm text-muted">
          {registering
            ? 'For doctors and clinic staff. You need the clinic code from your administrator.'
            : 'For doctors and clinic staff. Opens your dashboard.'}
        </p>

        {staffSignupEnabled && (
          <SegmentedControl label="Sign in or create a team account" options={MODES} value={mode} onChange={switchMode} className="mt-5" />
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <Alert>{formError}</Alert>
          {registering && (
            <SegmentedControl label="Account type" options={ROLES} value={form.role} onChange={(role) => setForm({ ...form, role })} />
          )}
          {asDoctor && unclaimed.length > 0 && (
            <SelectField
              label="Your profile"
              value={form.doctorId}
              onChange={chooseProfile}
              error={errors.doctorId}
              hint="Choose yours if the front desk has already added you."
            >
              <option value="">I am not in the list</option>
              {unclaimed.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} ({doctor.specialization})
                </option>
              ))}
            </SelectField>
          )}
          {registering && (
            <Field
              label="Full name"
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
              error={errors.name}
              hint={asDoctor && !form.doctorId ? 'As patients will see it, for example Dr. Rahul Sharma.' : undefined}
            />
          )}
          {asDoctor && !form.doctorId && (
            <SelectField label="Specialization" value={form.specialization} onChange={update('specialization')} error={errors.specialization}>
              <option value="">Select a specialization…</option>
              {SPECIALTY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectField>
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
          {registering && (
            <Field
              label="Clinic code"
              type="password"
              autoComplete="off"
              value={form.clinicCode}
              onChange={update('clinicCode')}
              error={errors.clinicCode}
              hint="Doctors and staff only."
            />
          )}
          <Button type="submit" loading={submitting} className="w-full">
            {registering ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </Card>
      <p className="mt-5 text-center text-sm text-muted">
        Are you a patient?{' '}
        <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline dark:text-foreground">
          Patient sign in
        </Link>
      </p>
    </div>
  );
}
