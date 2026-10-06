import { CalendarClock, CalendarX2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ACTIVE_STATUSES } from '../utils/constants.js';
import { cn } from '../utils/cn.js';
import { formatDateTime, formatFee, todayDate } from '../utils/format.js';
import { AppointmentId } from './Page.jsx';
import QueueTracker from './QueueTracker.jsx';
import ShareTrackingLink from './ShareTrackingLink.jsx';
import { Button, LinkButton } from './ui/Button.jsx';
import { Card, Skeleton, StatusPill } from './ui/primitives.jsx';

export const isActive = (appointment) => ACTIVE_STATUSES.includes(appointment.status);
export const isToday = (appointment) => appointment.date === todayDate();
// The live tracker is shown for a visit that is happening today.
export const showsTracker = (appointment) => isToday(appointment) && isActive(appointment);

export const reschedulePath = (appointment) =>
  `/patient/doctors/${appointment.doctorId}/book?reschedule=${appointment.id}`;

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

// One of the patient's appointments. Booked ones can be rescheduled or
// cancelled; today's active one carries the live queue tracker.
export default function AppointmentCard({ appointment, onCancel, className }) {
  const cancelled = appointment.status === 'CANCELLED';
  const canChange = appointment.status === 'BOOKED';

  return (
    <Card as="article" className={cn('p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AppointmentId value={appointment.appointmentId} />
        <StatusPill status={appointment.status} />
      </div>

      <div className="mt-3">
        <h3 className="text-xl leading-snug">{appointment.doctorName}</h3>
        <p className="text-sm text-muted">{appointment.specialization}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Fact label="When">
            <span className={cn(cancelled && 'line-through')}>
              {formatDateTime(appointment.date, appointment.time, { relative: true })}
            </span>
          </Fact>
          <Fact label="Fee">{formatFee(appointment.consultationFee)}</Fact>
          {appointment.room && <Fact label="Room">{appointment.room}</Fact>}
        </dl>

        {appointment.reason && (
          <p className="mt-4 border-l-2 border-border-strong pl-3 text-sm text-muted italic">“{appointment.reason}”</p>
        )}
      </div>

      {showsTracker(appointment) && <QueueTracker appointment={appointment} className="mt-5" />}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {canChange && (
          <>
            <LinkButton to={reschedulePath(appointment)} variant="secondary" size="sm">
              <CalendarClock aria-hidden="true" className="h-4 w-4" />
              Reschedule
            </LinkButton>
            <Button variant="destructive" size="sm" onClick={() => onCancel(appointment)}>
              <CalendarX2 aria-hidden="true" className="h-4 w-4" />
              Cancel appointment
            </Button>
          </>
        )}
        {isActive(appointment) && <ShareTrackingLink token={appointment.trackToken} />}
        <Link
          to={`/patient/appointments/${appointment.id}`}
          className="ml-auto inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline dark:text-foreground"
        >
          Details
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-6 w-48" />
      <Skeleton className="mt-2 h-4 w-28" />
      <Skeleton className="mt-5 h-10 w-full" />
    </Card>
  );
}
