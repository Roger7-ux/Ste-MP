import { Check, Gauge, Siren } from 'lucide-react';
import { TRACKER_STEPS, tokenLabel } from '../utils/constants.js';
import { cn } from '../utils/cn.js';
import { formatClock, formatWait, plural } from '../utils/format.js';
import { RollingNumber } from './motion.jsx';
import { Badge } from './ui/primitives.jsx';

function Timeline({ appointment }) {
  const currentIndex = TRACKER_STEPS.findIndex((step) => step.status === appointment.status);
  return (
    <ol className="flex" aria-label="Visit progress">
      {TRACKER_STEPS.map((step, index) => {
        const done = index < currentIndex || appointment.status === 'COMPLETED';
        const current = index === currentIndex && !done;
        const time = formatClock(appointment.timeline?.[step.timestamp]);
        return (
          <li key={step.status} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
            {index > 0 && (
              <span aria-hidden="true" className="absolute top-3.5 right-1/2 h-0.5 w-full bg-border-strong">
                <span
                  className={cn(
                    'absolute inset-0 origin-left bg-primary transition-transform duration-500 ease-soft',
                    done || current ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
            )}
            <span
              className={cn(
                'relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-semibold transition-colors duration-300',
                done && 'border-primary bg-primary text-primary-foreground',
                current && 'border-primary bg-surface text-primary dark:text-foreground',
                !done && !current && 'border-border-strong bg-surface text-muted',
              )}
            >
              {current && <span aria-hidden="true" className="absolute inset-0 animate-pulse-ring rounded-full bg-primary" />}
              {done ? <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="relative">{index + 1}</span>}
            </span>
            <span className={cn('mt-2 px-0.5 text-[11px] leading-tight font-medium sm:text-xs', done || current ? 'text-foreground' : 'text-muted')}>
              {step.label}
              <span className="sr-only">{done ? ' (done)' : current ? ' (current)' : ''}</span>
            </span>
            {time && (done || current) && <span className="text-[11px] text-muted tabular-nums">{time}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function message(appointment) {
  const { status, queue, room, appointmentId, live } = appointment;
  if (status === 'BOOKED') return `When you arrive, quote ${appointmentId} at the front desk to check in.`;
  if (status === 'WAITING' && queue?.isNext) return "You're next. Please stay close to the waiting area.";
  if (status === 'WAITING' && queue) {
    const expected = live ? ` You should be seen around ${live.expectedTime}.` : '';
    return `${plural(queue.ahead, 'person', 'people')} ahead of you. Estimated wait: ${formatWait(queue.estimatedWaitMinutes)}.${expected}`;
  }
  if (status === 'CALLED') return room ? `You have been called. Please go to room ${room}.` : 'You have been called. Please go to the doctor.';
  if (status === 'IN_CONSULTATION') return 'Your consultation is in progress.';
  if (status === 'COMPLETED') return 'Your visit is complete. Thank you for coming in.';
  return '';
}

// The doctor's pace today, for a patient who has not been seen yet.
function PaceNote({ appointment }) {
  const { live, status, doctorName } = appointment;
  if (!live) return null;
  const late = live.delayMinutes >= 5;
  return (
    <p className="mt-3 flex items-start gap-2 text-sm">
      <Gauge aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', late ? 'text-(--status-waiting-fg)' : 'text-primary')} />
      <span>
        {late ? (
          <>
            {doctorName} is running about <strong>{live.delayMinutes} min behind</strong> today.
          </>
        ) : (
          <>{doctorName} is running on time today.</>
        )}
        {status === 'BOOKED' && (
          <>
            {' '}
            Expect to be seen around <strong>{live.expectedTime}</strong>.
          </>
        )}
      </span>
    </p>
  );
}

// Shows where a patient is in today's visit: a progress line, their place in
// the queue, an estimated wait, the doctor's pace, and a note when an
// emergency has been put ahead. Updates are announced to screen readers.
export default function QueueTracker({ appointment, className }) {
  const { status, queue, priority, tokenNumber } = appointment;
  const next = status === 'WAITING' && queue?.isNext;

  return (
    <div className={cn('rounded-card border border-border bg-sunken/60 p-4 sm:p-5', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-sans text-sm font-semibold">
          Live queue
          {tokenNumber && <Badge tone="primary">{tokenLabel(tokenNumber)}</Badge>}
          {priority === 'EMERGENCY' && (
            <Badge tone="cancelled">
              <Siren aria-hidden="true" className="h-3.5 w-3.5" />
              Priority
            </Badge>
          )}
        </p>
        <p className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden="true" className="relative grid h-2 w-2 place-items-center">
            <span className="absolute h-2 w-2 animate-pulse-ring rounded-full bg-primary" />
            <span className="h-2 w-2 rounded-full bg-primary" />
          </span>
          Updates automatically
        </p>
      </div>

      <Timeline appointment={appointment} />

      <div
        className={cn(
          'mt-5 flex items-center gap-4 rounded-button border p-4 transition-colors duration-300',
          next ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
        )}
      >
        {status === 'WAITING' && queue && (
          <div className="shrink-0 text-center">
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Position</p>
            <p className="font-display text-4xl leading-none">
              <RollingNumber value={queue.position} />
            </p>
          </div>
        )}
        <p aria-live="polite" className={cn('text-sm', next ? 'font-semibold' : 'font-medium')}>
          {message(appointment)}
        </p>
      </div>

      {(status === 'BOOKED' || status === 'WAITING') && <PaceNote appointment={appointment} />}

      {status === 'WAITING' && queue?.emergencyAhead && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-button border border-(--status-cancelled-fg)/25 bg-(--status-cancelled-bg) px-3 py-2.5 text-sm text-(--status-cancelled-fg)">
          <Siren aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          An emergency case has been put ahead of the queue, so your wait is a little longer. The estimate above
          already includes it. Thank you for your patience.
        </p>
      )}
    </div>
  );
}
