import { CalendarClock, CalendarPlus, CalendarX2, SearchX } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { isActive, reschedulePath, showsTracker } from '../../components/AppointmentCard.jsx';
import { AppointmentId, Page, PageHeader } from '../../components/Page.jsx';
import QueueTracker from '../../components/QueueTracker.jsx';
import ShareTrackingLink from '../../components/ShareTrackingLink.jsx';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import { Card, DetailRow, EmptyState, ErrorState, LoadingLabel, Skeleton, StatusPill } from '../../components/ui/primitives.jsx';
import { useCancelAppointment } from '../../hooks/useCancelAppointment.jsx';
import { useClinic } from '../../hooks/useClinic.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { formatDateLong, formatFee, formatTime } from '../../utils/format.js';
import { downloadAppointmentIcs } from '../../utils/ics.js';

export default function AppointmentDetail() {
  const { id } = useParams();
  const { clinic } = useClinic();
  const { data, error, loading, reload, setData } = useFetch(() => api.get(`/appointments/${id}`), [id], { pollMs: 10000 });
  const appointment = data?.appointment;
  usePageMeta(appointment ? `Appointment ${appointment.appointmentId}` : 'Appointment');

  const { askToCancel, dialog } = useCancelAppointment((updated) => setData({ appointment: updated }));

  return (
    <Page width="md">
      <PageHeader backTo="/patient/appointments" backLabel="My appointments" title="Appointment details" className="mb-6" />

      {loading && !data ? (
        <>
          <LoadingLabel />
          <Skeleton className="h-80 w-full rounded-card" />
        </>
      ) : error?.status === 404 ? (
        // Shown for a missing appointment and for one that belongs to someone else.
        <EmptyState icon={SearchX} title="Appointment not found" action={<LinkButton to="/patient/appointments">My appointments</LinkButton>}>
          We could not find this appointment under your account.
        </EmptyState>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          {showsTracker(appointment) && <QueueTracker appointment={appointment} className="mb-6" />}

          <Card className="animate-rise p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AppointmentId value={appointment.appointmentId} />
              <StatusPill status={appointment.status} />
            </div>
            <dl className="mt-3 divide-y divide-border">
              <DetailRow label="Patient">{appointment.patientName}</DetailRow>
              <DetailRow label="Doctor">{appointment.doctorName}</DetailRow>
              <DetailRow label="Specialty">{appointment.specialization}</DetailRow>
              <DetailRow label="Date">{formatDateLong(appointment.date)}</DetailRow>
              <DetailRow label="Time">{formatTime(appointment.time)}</DetailRow>
              {appointment.room && <DetailRow label="Room">{appointment.room}</DetailRow>}
              <DetailRow label="Consultation fee">{formatFee(appointment.consultationFee)}</DetailRow>
              {appointment.reason && <DetailRow label="Reason for visit">{appointment.reason}</DetailRow>}
            </dl>
          </Card>

          <div className="mt-6 flex flex-wrap gap-2">
            {isActive(appointment) && <ShareTrackingLink token={appointment.trackToken} variant="secondary" size="md" />}
            {appointment.status === 'BOOKED' && (
              <>
                <LinkButton to={reschedulePath(appointment)} variant="secondary">
                  <CalendarClock aria-hidden="true" className="h-4 w-4" />
                  Reschedule
                </LinkButton>
                <Button variant="destructive" onClick={() => askToCancel(appointment)}>
                  <CalendarX2 aria-hidden="true" className="h-4 w-4" />
                  Cancel appointment
                </Button>
                <Button variant="ghost" onClick={() => downloadAppointmentIcs(appointment, clinic)}>
                  <CalendarPlus aria-hidden="true" className="h-4 w-4" />
                  Add to calendar
                </Button>
              </>
            )}
          </div>
        </>
      )}
      {dialog}
    </Page>
  );
}
