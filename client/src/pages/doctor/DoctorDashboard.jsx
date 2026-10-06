import { CircleCheck, Coffee, Megaphone, Siren, UserX, UsersRound } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Page, PageHeader } from '../../components/Page.jsx';
import { EASE, RollingNumber } from '../../components/motion.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge, Card, EmptyState, ErrorState, LoadingLabel, Skeleton, StatusPill } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { REFRESH_MS, tokenLabel } from '../../utils/constants.js';
import { cn } from '../../utils/cn.js';
import { formatClock, formatDate, formatWait, greeting, paceText, plural, todayDate } from '../../utils/format.js';

const STATS = [
  { key: 'booked', label: 'Still to arrive' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'completed', label: 'Completed today' },
  { key: 'notArrived', label: 'Not arrived' },
  { key: 'averageWaitMinutes', label: 'Average wait', suffix: ' min' },
  { key: 'averageVisitMinutes', label: 'Average visit', suffix: ' min' },
];

function StatStrip({ stats }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {STATS.map((item) => (
        <Card key={item.key} className="p-4">
          <dt className="text-xs font-medium text-muted">{item.label}</dt>
          <dd className="mt-1 font-display text-3xl leading-none whitespace-nowrap">
            {!stats ? (
              <Skeleton className="h-8 w-full" />
            ) : stats[item.key] === null ? (
              '–'
            ) : (
              <>
                <RollingNumber value={stats[item.key]} />
                {item.suffix && <span className="font-sans text-sm text-muted">{item.suffix}</span>}
              </>
            )}
          </dd>
        </Card>
      ))}
    </dl>
  );
}

function Flags({ appointment }) {
  return (
    <>
      {appointment.priority === 'EMERGENCY' && (
        <Badge tone="cancelled">
          <Siren aria-hidden="true" className="h-3.5 w-3.5" />
          Emergency
        </Badge>
      )}
      {appointment.isWalkIn && <Badge>Walk-in</Badge>}
    </>
  );
}

// The patient who has been called. The doctor's main button is in the page
// header; here they can finish without calling anyone, or skip a patient who
// did not come in.
function CurrentPatient({ appointment, onSkip, onComplete, busy }) {
  const called = appointment?.status === 'CALLED';
  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">With you now</p>
      <div className="relative mt-3 min-h-[9rem] flex-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {appointment ? (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <p className="relative inline-block rounded-2xl bg-primary px-5 py-3 font-display text-4xl font-semibold whitespace-nowrap text-primary-foreground sm:text-5xl">
                <motion.span
                  aria-hidden="true"
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.25 }}
                  transition={{ duration: 1.6, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-2xl bg-primary"
                />
                <span className="relative">{tokenLabel(appointment.tokenNumber) || appointment.appointmentId}</span>
              </p>
              <p className="mt-4 font-display text-2xl">{appointment.patientName}</p>
              <p className="mt-1 font-mono text-xs font-semibold text-muted">{appointment.appointmentId}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                <StatusPill status={appointment.status} />
                <Flags appointment={appointment} />
                Called at {formatClock(appointment.timeline.calledAt)}
              </p>
              {appointment.reason && (
                <p className="mt-4 border-l-2 border-border-strong pl-3 text-sm text-muted italic">“{appointment.reason}”</p>
              )}
            </motion.div>
          ) : (
            <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-3 pt-2">
              <Coffee aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-muted" strokeWidth={1.5} />
              <div>
                <p className="font-display text-2xl">No patient with you</p>
                <p className="mt-1 text-sm text-muted">Press “Call next patient” when you are ready.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {appointment && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {called && (
            <Button variant="destructive" className="flex-1" disabled={busy} onClick={onSkip}>
              <UserX aria-hidden="true" className="h-4 w-4" />
              Skip: did not come
            </Button>
          )}
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={onComplete}>
            <CircleCheck aria-hidden="true" className="h-4 w-4" />
            Mark treatment complete
          </Button>
        </div>
      )}
    </Card>
  );
}

function WaitingList({ waiting }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Next patients</p>
        <span className="rounded-full bg-sunken px-2 py-0.5 text-xs text-muted tabular-nums">{waiting.length}</span>
      </div>
      {waiting.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nobody is waiting.</p>
      ) : (
        <LayoutGroup>
          <ol className="mt-4 space-y-2.5">
            {waiting.map((appointment) => {
              const { queue } = appointment;
              return (
                <motion.li
                  key={appointment.id}
                  layout
                  layoutId={`waiting-${appointment.id}`}
                  transition={{ duration: 0.3, ease: EASE }}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-card border p-3.5',
                    queue.isNext ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                  )}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="primary">{tokenLabel(appointment.tokenNumber)}</Badge>
                      <Flags appointment={appointment} />
                    </p>
                    <p className="mt-1 truncate font-medium">{appointment.patientName}</p>
                    <p className="font-mono text-xs text-muted">{appointment.appointmentId}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={queue.isNext ? 'called' : 'waiting'}>{queue.isNext ? 'Next' : `No. ${queue.position} in line`}</Badge>
                    <p className="mt-1 text-xs text-muted">{formatWait(queue.estimatedWaitMinutes)}</p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </LayoutGroup>
      )}
    </Card>
  );
}

// The consulting-room dashboard. The doctor decides when to call: one button
// finishes the patient with them and calls the next. It also shows who is
// waiting and the day's numbers, and refreshes by itself.
export default function DoctorDashboard() {
  usePageMeta('My queue');
  const { user } = useAuth();
  const toast = useToast();
  const queue = useFetch(() => api.get('/doctor/next-token'), [], { pollMs: REFRESH_MS.doctor });
  const stats = useFetch(() => api.get('/doctor/stats'), [], { pollMs: REFRESH_MS.doctor });
  const [busy, setBusy] = useState(false);

  const current = queue.data?.current || null;
  const waiting = queue.data?.waiting || [];
  const doctor = queue.data?.doctor;
  const figures = stats.data?.stats;

  // Tell the doctor if the front desk calls a patient in on their behalf.
  const lastCurrentId = useRef(undefined);
  // True while the doctor's own button press is being applied, so their own
  // call is not reported back to them a second time.
  const ownAction = useRef(false);
  useEffect(() => {
    if (!queue.data) return;
    const id = current?.id ?? null;
    if (lastCurrentId.current !== undefined && id && id !== lastCurrentId.current && !ownAction.current) {
      toast.success(`${tokenLabel(current.tokenNumber)} · ${current.patientName} has been called in.`);
    }
    lastCurrentId.current = id;
    ownAction.current = false;
  }, [queue.data, current, toast]);

  // Runs one of the doctor's actions, reports it and reloads both panels.
  async function act(path, describe) {
    setBusy(true);
    ownAction.current = true;
    try {
      toast.success(describe(await api.post(path, current ? { appointmentId: current.id } : {})));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      queue.reload();
      stats.reload();
    }
  }

  const who = (a) => `${tokenLabel(a.tokenNumber) || a.appointmentId} · ${a.patientName}`;

  // One button: the patient with the doctor is marked complete and the next
  // one is called. The front desk and the waiting-room screen announce it.
  const callNext = () =>
    act('/doctor/call-next-token', ({ completed, appointment }) =>
      [completed && `${who(completed)} is complete.`, appointment ? `Calling ${who(appointment)}.` : 'Nobody else is waiting.']
        .filter(Boolean)
        .join(' '),
    );
  const skip = () => act('/doctor/skip-token', ({ appointment }) => `${who(appointment)} was marked as not arrived.`);
  const complete = () => act('/doctor/release-token', ({ appointment }) => `${who(appointment)} is complete.`);

  const canCall = waiting.length > 0 || Boolean(current);
  const callLabel = !current ? 'Call next patient' : waiting.length > 0 ? 'Complete and call next' : 'Complete this patient';

  return (
    <Page>
      <PageHeader
        eyebrow={doctor ? `${doctor.specialization}${doctor.room ? ` · Room ${doctor.room}` : ''}` : 'Doctor'}
        title={`${greeting()}, ${user.name}`}
        subtitle={`${formatDate(todayDate())} · ${plural(waiting.length, 'patient')} waiting`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {figures && <Badge tone={figures.delayMinutes >= 5 ? 'waiting' : 'called'}>{paceText(figures.delayMinutes)}</Badge>}
            <Button size="lg" onClick={callNext} loading={busy} disabled={!canCall}>
              <Megaphone aria-hidden="true" className="h-5 w-5" />
              {callLabel}
            </Button>
          </div>
        }
      />

      <StatStrip stats={figures} />

      <div className="mt-8">
        {queue.loading && !queue.data ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <LoadingLabel>Loading your queue…</LoadingLabel>
            <Skeleton className="h-72 rounded-card" />
            <Skeleton className="h-72 rounded-card" />
          </div>
        ) : queue.error ? (
          <ErrorState error={queue.error} onRetry={queue.reload} />
        ) : !current && waiting.length === 0 && figures?.total === 0 ? (
          <EmptyState icon={UsersRound} title="No patients yet today">
            Patients appear here once the front desk checks them in, issues a walk-in token or they scan a QR code.
            You call them in from this page.
          </EmptyState>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <CurrentPatient appointment={current} onSkip={skip} onComplete={complete} busy={busy} />
            <WaitingList waiting={waiting} />
          </div>
        )}
      </div>
    </Page>
  );
}
