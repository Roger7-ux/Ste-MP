import { LinkIcon, SearchX } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Page } from '../components/Page.jsx';
import QueueTracker from '../components/QueueTracker.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { Card, DetailRow, EmptyState, ErrorState, Eyebrow, LoadingLabel, Skeleton, StatusPill } from '../components/ui/primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { useQueueAlerts } from '../hooks/useQueueAlerts.jsx';
import { api } from '../services/api.js';
import { ACTIVE_STATUSES } from '../utils/constants.js';
import { formatDateLong, formatTime, todayDate } from '../utils/format.js';

// The no-login tracking page behind a shared link. It shows the visit's live
// status and place in the queue, and nothing that identifies the patient.
export default function Track() {
  const { token } = useParams();
  const { data, error, loading, reload } = useFetch(() => api.get(`/track/${token}`), [token], { pollMs: 8000 });
  const appointment = data?.appointment;
  usePageMeta(appointment ? `Tracking ${appointment.appointmentId}` : 'Live tracking', 'Follow a clinic visit live: status, place in the queue and estimated wait.');
  const alert = useQueueAlerts(appointment ? [appointment] : []);

  if (loading && !data) {
    return (
      <Page width="md">
        <LoadingLabel />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-8 h-72 w-full rounded-card" />
      </Page>
    );
  }
  if (error) {
    return (
      <Page width="md">
        {error.status === 404 ? (
          <EmptyState icon={SearchX} title="This tracking link is not valid" action={<LinkButton to="/">Go to MediQ</LinkButton>}>
            Check that the whole link was copied, or ask the patient to share it again.
          </EmptyState>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </Page>
    );
  }

  const live = appointment.date === todayDate() && ACTIVE_STATUSES.includes(appointment.status);

  return (
    <Page width="md">
      <Eyebrow className="mb-2 flex items-center gap-1.5">
        <LinkIcon aria-hidden="true" className="h-3.5 w-3.5" />
        Live tracking
      </Eyebrow>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">{appointment.appointmentId}</h1>
        <StatusPill status={appointment.status} />
      </div>
      <p className="mt-2 text-muted">A visit with {appointment.doctorName}. This page updates by itself.</p>

      {live ? (
        <QueueTracker appointment={appointment} className="mt-6" />
      ) : (
        <Card className="mt-6 p-5 text-sm text-muted">
          {ACTIVE_STATUSES.includes(appointment.status)
            ? 'Live queue tracking starts on the day of the visit.'
            : 'This visit is no longer in the queue.'}
        </Card>
      )}

      <Card className="animate-rise mt-6 p-5 sm:p-6">
        <dl className="divide-y divide-border">
          <DetailRow label="Doctor">{appointment.doctorName}</DetailRow>
          <DetailRow label="Specialty">{appointment.specialization}</DetailRow>
          <DetailRow label="Date">{formatDateLong(appointment.date)}</DetailRow>
          <DetailRow label="Time">{formatTime(appointment.time)}</DetailRow>
          {appointment.room && <DetailRow label="Room">{appointment.room}</DetailRow>}
        </dl>
      </Card>

      <p className="mt-4 text-xs text-muted">
        For privacy, this page shows no name, contact details or reason for the visit. Anyone with the link can see it.
      </p>
      {alert}
    </Page>
  );
}
