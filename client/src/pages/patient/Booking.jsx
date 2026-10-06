import { CalendarOff, UserRoundX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Page, PageHeader } from '../../components/Page.jsx';
import SlotPicker from '../../components/SlotPicker.jsx';
import { EASE } from '../../components/motion.jsx';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import { TextareaField } from '../../components/ui/forms.jsx';
import { Stepper } from '../../components/ui/navigation.jsx';
import { Alert, Avatar, Card, DetailRow, EmptyState, ErrorState, Eyebrow, LoadingLabel, Skeleton } from '../../components/ui/primitives.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { REASON_MAX_LENGTH } from '../../utils/constants.js';
import { formatDate, formatDateTime, formatFee } from '../../utils/format.js';
import { validateReason } from '../../utils/validation.js';
import BookingSuccess from './BookingSuccess.jsx';

const BOOKING_STEPS = ['Choose a time', 'Your details', 'Review'];
const RESCHEDULE_STEPS = ['Choose a new time', 'Review'];

// A value in the summary that slides in when it changes.
function Changing({ value, children }) {
  return (
    // The new value shows at once; the old one fades out behind it.
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className="inline-block"
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

export default function Booking() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');
  const rescheduling = Boolean(rescheduleId);
  const { user } = useAuth();
  usePageMeta(rescheduling ? 'Reschedule appointment' : 'Book appointment');

  const { data, error, loading, reload } = useFetch(
    async () => {
      const [doctorData, current] = await Promise.all([
        api.get(`/doctors/${id}/slots`),
        rescheduling ? api.get(`/appointments/${rescheduleId}`) : null,
      ]);
      return { ...doctorData, current: current?.appointment || null };
    },
    [id, rescheduleId],
  );

  const steps = rescheduling ? RESCHEDULE_STEPS : BOOKING_STEPS;
  const lastStep = steps.length - 1;
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmed, setConfirmed] = useState(null);

  if (confirmed) return <BookingSuccess appointment={confirmed} rescheduled={rescheduling} />;

  if (loading && !data) {
    return (
      <Page>
        <LoadingLabel />
        <Skeleton className="h-9 w-72" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
        </div>
      </Page>
    );
  }
  if (error) {
    return (
      <Page width="md">
        {error.status === 404 ? (
          <EmptyState
            icon={UserRoundX}
            title={rescheduling ? 'Appointment or doctor not found' : 'Doctor not found'}
            action={<LinkButton to="/doctors">See all doctors</LinkButton>}
          />
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </Page>
    );
  }

  const { doctor, slots, from, current } = data;
  const backTo = rescheduling ? '/patient/appointments' : `/doctors/${doctor.id}`;

  if (rescheduling && (current.status !== 'BOOKED' || current.doctorId !== doctor.id)) {
    return (
      <Page width="md">
        <EmptyState icon={CalendarOff} title="This appointment can no longer be rescheduled" action={<LinkButton to="/patient/appointments">My appointments</LinkButton>}>
          Only an appointment that is still Booked can be moved. Please speak to the front desk.
        </EmptyState>
      </Page>
    );
  }

  const hasOpenSlots = slots.some((item) => item.status === 'AVAILABLE' && !item.isPast);

  function next() {
    if (!rescheduling && step === 1) {
      const found = validateReason(reason).reason || '';
      setReasonError(found);
      if (found) return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  }

  // The server checks the slot again inside a transaction; this only reports
  // the outcome. If the slot has gone, the patient is sent back to choose again.
  async function confirm() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = rescheduling
        ? await api.post(`/appointments/${rescheduleId}/reschedule`, { slotId: slot.id })
        : await api.post('/appointments', { doctorId: doctor.id, slotId: slot.id, reason });
      setConfirmed(result.appointment);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(err.message);
      if (err.status === 409 || err.status === 404) {
        setSlot(null);
        setStep(0);
        reload();
      }
      setSubmitting(false);
    }
  }

  const action =
    step < lastStep ? (
      <Button onClick={next} disabled={!slot} size="lg" className="w-full">
        Continue
      </Button>
    ) : (
      <Button onClick={confirm} loading={submitting} size="lg" className="w-full">
        {rescheduling ? 'Confirm new time' : 'Confirm appointment'}
      </Button>
    );

  const whenText = slot ? formatDateTime(slot.date, slot.startTime) : 'Not chosen yet';

  return (
    <Page className="pb-32 lg:pb-12">
      <PageHeader
        backTo={backTo}
        backLabel={rescheduling ? 'My appointments' : doctor.name}
        title={rescheduling ? 'Reschedule appointment' : 'Book appointment'}
        className="mb-6"
      />
      <Stepper steps={steps} current={step} className="mb-8 max-w-xl" />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <Alert className="mb-5">{submitError}</Alert>

          {step === 0 &&
            (hasOpenSlots ? (
              <Card className="p-5 sm:p-6">
                {rescheduling && (
                  <Alert tone="info" className="mb-5">
                    Currently booked for {formatDateTime(current.date, current.time)}. Choose the new time below.
                  </Alert>
                )}
                <SlotPicker
                  slots={slots}
                  from={from}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setSlot(null);
                  }}
                  selectedSlotId={slot?.id}
                  onSelectSlot={(chosen) => {
                    setSlot(chosen);
                    setSelectedDate(chosen.date);
                  }}
                />
              </Card>
            ) : (
              <EmptyState icon={CalendarOff} title="No open slots for this doctor" action={<LinkButton to="/doctors">Choose another doctor</LinkButton>}>
                {doctor.name} has no open times in the next two weeks.
              </EmptyState>
            ))}

          {!rescheduling && step === 1 && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-2xl">Your details</h2>
              <dl className="mt-3 divide-y divide-border">
                <DetailRow label="Name">{user.name}</DetailRow>
                <DetailRow label="Phone">{user.phone}</DetailRow>
                <DetailRow label="Email">{user.email}</DetailRow>
              </dl>
              <p className="mt-2 text-sm text-muted">
                Not right?{' '}
                <Link to="/patient/profile" className="font-semibold text-primary underline-offset-4 hover:underline dark:text-foreground">
                  Update your profile
                </Link>
              </p>
              <TextareaField
                className="mt-6"
                label="Reason for visit"
                optional
                rows={4}
                maxLength={REASON_MAX_LENGTH}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                error={reasonError}
                hint={`A few words help the doctor prepare. ${reason.length}/${REASON_MAX_LENGTH}`}
              />
            </Card>
          )}

          {step === lastStep && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-2xl">Review and confirm</h2>
              <dl className="mt-3 divide-y divide-border">
                <DetailRow label="Doctor">{doctor.name}</DetailRow>
                <DetailRow label="Specialty">{doctor.specialization}</DetailRow>
                <DetailRow label="Date">{formatDate(slot.date)}</DetailRow>
                <DetailRow label="Time">{slot.startTime}</DetailRow>
                {doctor.room && <DetailRow label="Room">{doctor.room}</DetailRow>}
                <DetailRow label="Consultation fee">{formatFee(rescheduling ? current.consultationFee : doctor.consultationFee)}</DetailRow>
                {!rescheduling && reason.trim() && <DetailRow label="Reason">{reason.trim()}</DetailRow>}
              </dl>
              <p className="mt-4 text-sm text-muted">
                The fee is shown for your information; no payment is taken here.
                {rescheduling && ' Your appointment ID stays the same.'}
              </p>
            </Card>
          )}

          {step > 0 && (
            <Button variant="ghost" className="mt-4" onClick={() => setStep(step - 1)} disabled={submitting}>
              Back
            </Button>
          )}
        </div>

        {/* Summary: a sticky card on large screens. */}
        <aside className="hidden lg:block">
          <Card className="sticky top-24 p-6">
            <div className="flex items-center gap-3">
              <Avatar name={doctor.name} src={doctor.photoUrl} />
              <div className="min-w-0">
                <Eyebrow>{doctor.specialization}</Eyebrow>
                <p className="font-display text-lg leading-tight">{doctor.name}</p>
              </div>
            </div>
            <dl className="mt-4 divide-y divide-border">
              <DetailRow label="When">
                <Changing value={whenText}>{whenText}</Changing>
              </DetailRow>
              {doctor.room && <DetailRow label="Room">{doctor.room}</DetailRow>}
              <DetailRow label="Fee">{formatFee(rescheduling ? current.consultationFee : doctor.consultationFee)}</DetailRow>
            </dl>
            <div className="mt-5">{action}</div>
          </Card>
        </aside>
      </div>

      {/* The same summary as a sheet fixed to the bottom on small screens. */}
      <div className="fixed inset-x-0 bottom-0 z-(--z-header) rounded-t-card border-t border-border bg-surface/95 px-4 pt-3 pb-4 shadow-lift backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-xl">
          <p className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{doctor.name}</span>
            <span aria-live="polite" className="shrink-0 text-muted">
              <Changing value={whenText}>{whenText}</Changing>
            </span>
          </p>
          {action}
        </div>
      </div>
    </Page>
  );
}
