import { SearchX, Siren, Undo2 } from 'lucide-react';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AppointmentId, Page, PageHeader } from '../../components/Page.jsx';
import QueueTracker from '../../components/QueueTracker.jsx';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import { Badge, Card, DetailRow, EmptyState, ErrorState, LoadingLabel, Skeleton, StatusPill } from '../../components/ui/primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { useStatusActions } from '../../hooks/useStatusActions.jsx';
import { api } from '../../services/api.js';
import { NEXT_ACTION, STATUS_META } from '../../utils/constants.js';
import { formatDateLong, formatFee, formatTime } from '../../utils/format.js';

const ACTION_LABELS = { NO_SHOW: 'Mark as not arrived', CANCELLED: 'Cancel appointment' };

export default function StaffAppointmentDetail() {
  const { id } = useParams();
  const { data, error, loading, reload, setData } = useFetch(() => api.get(`/staff/appointments/${id}`), [id], { pollMs: 10000 });
  const appointment = data?.appointment;
  usePageMeta(appointment ? `Appointment ${appointment.appointmentId}` : 'Appointment');

  const apply = useCallback((updated) => setData({ appointment: updated }), [setData]);
  const refresh = useCallback(() => {
    api.get(`/staff/appointments/${id}`).then(setData).catch(() => {});
  }, [id, setData]);
  const { changeStatus, undo, setPriority, pendingId } = useStatusActions({ apply, refresh });

  if (loading && !data) {
    return (
      <Page width="md">
        <LoadingLabel />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-8 h-80 w-full rounded-card" />
      </Page>
    );
  }
  if (error) {
    return (
      <Page width="md">
        {error.status === 404 ? (
          <EmptyState icon={SearchX} title="Appointment not found" action={<LinkButton to="/staff/appointments">All appointments</LinkButton>} />
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </Page>
    );
  }

  const next = NEXT_ACTION[appointment.status];
  const others = appointment.allowedNextStatuses.filter((status) => status !== next?.status);
  const busy = pendingId === appointment.id;
  const final = appointment.allowedNextStatuses.length === 0;
  const emergency = appointment.priority === 'EMERGENCY';
  const canPrioritise = ['BOOKED', 'WAITING', 'CALLED'].includes(appointment.status);

  return (
    <Page width="md">
      <PageHeader backTo="/staff/appointments" backLabel="All appointments" title="Appointment" className="mb-6" />

      <Card className="animate-rise p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AppointmentId value={appointment.appointmentId} />
          <span className="flex flex-wrap items-center gap-1.5">
            {emergency && (
              <Badge tone="cancelled">
                <Siren aria-hidden="true" className="h-3.5 w-3.5" />
                Emergency
              </Badge>
            )}
            {appointment.isWalkIn && <Badge>Walk-in</Badge>}
            <StatusPill status={appointment.status} />
          </span>
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

      {!['CANCELLED', 'NO_SHOW'].includes(appointment.status) && <QueueTracker appointment={appointment} className="mt-6" />}

      <Card className="animate-rise mt-6 p-5 [--rise-delay:70ms] sm:p-6">
        <h2 className="text-2xl">Update status</h2>
        {final && !appointment.canUndo ? (
          <p className="mt-2 text-muted">
            This appointment is {STATUS_META[appointment.status].label.toLowerCase()} and its status can no longer be changed.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {next && (
              <Button onClick={() => changeStatus(appointment, next.status)} loading={busy}>
                {next.label}
              </Button>
            )}
            {others.map((status) => (
              <Button
                key={status}
                variant={status === 'CANCELLED' ? 'destructive' : 'secondary'}
                onClick={() => changeStatus(appointment, status)}
                disabled={busy}
              >
                {ACTION_LABELS[status] || STATUS_META[status].label}
              </Button>
            ))}
            {canPrioritise && (
              <Button variant="secondary" onClick={() => setPriority(appointment, emergency ? 'NORMAL' : 'EMERGENCY')} disabled={busy}>
                <Siren aria-hidden="true" className="h-4 w-4" />
                {emergency ? 'Remove emergency mark' : 'Mark as emergency'}
              </Button>
            )}
            {appointment.canUndo && (
              <Button variant="ghost" onClick={() => undo(appointment)} disabled={busy}>
                <Undo2 aria-hidden="true" className="h-4 w-4" />
                Undo last change
              </Button>
            )}
          </div>
        )}
      </Card>
    </Page>
  );
}
