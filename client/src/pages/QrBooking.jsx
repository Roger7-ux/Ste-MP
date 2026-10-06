import { QrCode, SearchX, TimerOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Page } from '../components/Page.jsx';
import { EASE } from '../components/motion.jsx';
import { Button, LinkButton } from '../components/ui/Button.jsx';
import { Field } from '../components/ui/forms.jsx';
import { Alert, Avatar, Badge, Card, DetailRow, EmptyState, ErrorState, IconTile, LoadingLabel, Skeleton } from '../components/ui/primitives.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { api } from '../services/api.js';
import { SITE_NAME } from '../utils/constants.js';
import { formatDateLong, formatFee, paceText, plural } from '../utils/format.js';

// Where a QR code shown at the front desk leads: a page that books the
// patient into one doctor's queue for today. A signed-in patient gets the
// visit on their account; anyone else only gives a name. Once booked, the
// page hands over to the live tracker.
export default function QrBooking() {
  const { code } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch(() => api.get(`/qr/${code}`), [code]);
  usePageMeta(data ? `Join the queue for ${data.doctor.name}` : 'Join the queue');

  const isPatient = user?.role === 'PATIENT';
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [booking, setBooking] = useState(false);
  const [trackToken, setTrackToken] = useState(null);

  if (loading && !data) {
    return (
      <Page width="md">
        <LoadingLabel />
        <Skeleton className="mx-auto h-96 w-full max-w-md rounded-card" />
      </Page>
    );
  }
  if (error) {
    return (
      <Page width="md">
        {error.status === 404 ? (
          <EmptyState icon={SearchX} title="This QR code is not valid" action={<LinkButton to="/">Go to {SITE_NAME}</LinkButton>}>
            Please ask the front desk to show a new code.
          </EmptyState>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </Page>
    );
  }

  // Booked just now, or the code was already used on this phone: carry on to
  // the live tracker.
  const token = trackToken || data.trackToken;
  if (token) return <Navigate to={`/track/${token}`} replace />;
  if (data.used) {
    return (
      <Page width="md">
        <EmptyState icon={TimerOff} title="This QR code has expired" action={<LinkButton to="/">Go to {SITE_NAME}</LinkButton>}>
          Each code works once, on the day it was made. Please ask the front desk to show a new one.
        </EmptyState>
      </Page>
    );
  }

  const { doctor } = data;

  async function book(event) {
    event.preventDefault();
    setFormError('');
    if (!isPatient && !name.trim()) {
      setNameError('Your name is required.');
      return;
    }
    setBooking(true);
    try {
      const result = await api.post(`/qr/${code}/book`, { name });
      setTrackToken(result.trackToken);
    } catch (err) {
      setNameError(err.errors?.name || '');
      setFormError(err.errors?.name ? '' : err.message);
      setBooking(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
        <Card className="animate-rise p-5 sm:p-6">
          <IconTile icon={QrCode} size="lg" />
          <h1 className="mt-4 text-3xl">Join the queue</h1>
          <p className="mt-1 text-sm text-muted">Confirm below and you get the next queue number for today.</p>

          <div className="mt-5 flex items-center gap-3.5 rounded-card border border-border bg-sunken/60 p-4">
            <Avatar name={doctor.name} src={doctor.photoUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg leading-tight">{doctor.name}</p>
              <p className="text-xs text-muted">{doctor.specialization}</p>
            </div>
            <Badge tone={doctor.delayMinutes >= 5 ? 'waiting' : 'called'}>{paceText(doctor.delayMinutes)}</Badge>
          </div>
          <dl className="mt-2 divide-y divide-border">
            <DetailRow label="Date">{formatDateLong(data.date)}</DetailRow>
            {doctor.room && <DetailRow label="Room">{doctor.room}</DetailRow>}
            <DetailRow label="Waiting now">{plural(doctor.waiting, 'patient')}</DetailRow>
            <DetailRow label="Consultation fee">{formatFee(doctor.consultationFee)}</DetailRow>
          </dl>

          <form onSubmit={book} noValidate className="mt-5 space-y-4">
            <Alert>{formError}</Alert>
            {isPatient ? (
              <Alert tone="info">Booking as {user.name}. The visit will appear in your appointments.</Alert>
            ) : (
              <Field
                label="Your name"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError('');
                }}
                error={nameError}
                hint="Shown to the front desk and the doctor."
              />
            )}
            <Button type="submit" size="lg" loading={booking} className="w-full">
              Join the queue
            </Button>
          </form>
        </Card>
      </motion.div>

      {!user && (
        <p className="mt-5 text-center text-sm text-muted">
          Have a patient account?{' '}
          <Link
            to="/login"
            state={{ from: location.pathname }}
            className="font-semibold text-primary underline-offset-4 hover:underline dark:text-foreground"
          >
            Sign in first
          </Link>{' '}
          to keep this visit in your appointments.
        </p>
      )}
    </div>
  );
}
