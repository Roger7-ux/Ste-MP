import { CalendarPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { AppointmentId } from '../../components/Page.jsx';
import { AnimatedCheck, Confetti, EASE } from '../../components/motion.jsx';
import ShareTrackingLink from '../../components/ShareTrackingLink.jsx';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import { DetailRow, StatusPill } from '../../components/ui/primitives.jsx';
import { useClinic } from '../../hooks/useClinic.jsx';
import { formatDateLong, formatFee, formatTime } from '../../utils/format.js';
import { downloadAppointmentIcs } from '../../utils/ics.js';

// Shown after a booking or a reschedule: the appointment as a ticket, with
// ways to keep hold of it.
export default function BookingSuccess({ appointment, rescheduled }) {
  const { clinic } = useClinic();

  return (
    <div className="relative mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center sm:py-16">
      {!rescheduled && <Confetti />}
      <AnimatedCheck />
      <h1 className="mt-5 text-3xl sm:text-4xl" role="status">
        {rescheduled ? 'Appointment moved' : 'Appointment confirmed'}
      </h1>
      <p className="mt-2 text-muted">Quote your appointment ID at the front desk when you arrive.</p>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.25 }}
        className="relative mt-8 w-full rounded-card border border-border bg-surface text-left shadow-lift"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <div>
            <p className="text-xs text-muted">Appointment ID</p>
            <AppointmentId value={appointment.appointmentId} className="[&>span:first-child]:text-lg" />
          </div>
          <StatusPill status={appointment.status} />
        </div>

        {/* The perforated edge of a ticket. */}
        <div aria-hidden="true" className="relative my-4 border-t border-dashed border-border-strong">
          <span className="absolute -top-2.5 -left-2.5 h-5 w-5 rounded-full border border-border bg-background" />
          <span className="absolute -top-2.5 -right-2.5 h-5 w-5 rounded-full border border-border bg-background" />
        </div>

        <dl className="divide-y divide-border px-5 pb-4">
          <DetailRow label="Patient">{appointment.patientName}</DetailRow>
          <DetailRow label="Doctor">{appointment.doctorName}</DetailRow>
          <DetailRow label="Specialty">{appointment.specialization}</DetailRow>
          <DetailRow label="Date">{formatDateLong(appointment.date)}</DetailRow>
          <DetailRow label="Time">{formatTime(appointment.time)}</DetailRow>
          {appointment.room && <DetailRow label="Room">{appointment.room}</DetailRow>}
          <DetailRow label="Consultation fee">{formatFee(appointment.consultationFee)}</DetailRow>
        </dl>
      </motion.div>

      <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="secondary" onClick={() => downloadAppointmentIcs(appointment, clinic)}>
          <CalendarPlus aria-hidden="true" className="h-4 w-4" />
          Add to calendar
        </Button>
        <ShareTrackingLink token={appointment.trackToken} variant="secondary" size="md" />
        <LinkButton to="/patient/appointments">View my appointments</LinkButton>
        <LinkButton to="/doctors" variant="ghost">
          Book another
        </LinkButton>
      </div>
    </div>
  );
}
