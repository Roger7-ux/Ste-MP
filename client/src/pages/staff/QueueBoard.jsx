import { CalendarOff, EllipsisVertical, FileText, Megaphone, QrCode, RotateCcw, Search, Siren, Ticket, Undo2, UserX, XCircle } from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader } from '../../components/Page.jsx';
import { EASE } from '../../components/motion.jsx';
import CommandPalette from '../../components/staff/CommandPalette.jsx';
import KpiStrip from '../../components/staff/KpiStrip.jsx';
import QrDialog from '../../components/staff/QrDialog.jsx';
import WalkInDialog from '../../components/staff/WalkInDialog.jsx';
import { Button, buttonClass } from '../../components/ui/Button.jsx';
import { SelectField, Switch } from '../../components/ui/forms.jsx';
import { ConfirmDialog, Menu, MenuItem, MenuSeparator } from '../../components/ui/overlays.jsx';
import { Badge, EmptyState, ErrorState, LoadingLabel, Skeleton, StatusPill } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { useStatusActions } from '../../hooks/useStatusActions.jsx';
import { api } from '../../services/api.js';
import { announceCall, announceEnabled, setAnnounceEnabled } from '../../utils/announce.js';
import { NEXT_ACTION, tokenLabel } from '../../utils/constants.js';
import { cn } from '../../utils/cn.js';
import { formatDate, paceText, plural } from '../../utils/format.js';

const COLUMNS = [
  { key: 'booked', title: 'Booked', statuses: ['BOOKED'], empty: 'Nobody left to check in.' },
  { key: 'waiting', title: 'Waiting', statuses: ['WAITING'], empty: 'Nobody is waiting.' },
  { key: 'consult', title: 'In consultation', statuses: ['CALLED', 'IN_CONSULTATION'], empty: 'No visit in progress.' },
  { key: 'completed', title: 'Completed', statuses: ['COMPLETED'], empty: 'No completed visits yet.' },
];
const CLOSED = ['NO_SHOW', 'CANCELLED'];
// Priority can be changed until the consultation starts.
const CAN_PRIORITISE = ['BOOKED', 'WAITING', 'CALLED'];

const isEmergency = (appointment) => appointment.priority === 'EMERGENCY';

// Emergencies first, then waiting patients by their place in the queue, then
// everything else by appointment time.
function order(a, b) {
  if (isEmergency(a) !== isEmergency(b)) return isEmergency(a) ? -1 : 1;
  if (a.queue && b.queue && a.doctorId === b.doctorId) return a.queue.position - b.queue.position;
  return a.time.localeCompare(b.time) || a.id - b.id;
}

function QueueCard({ appointment, onAction, onPriority, onRestore, busy }) {
  const navigate = useNavigate();
  // Calling is the doctor's job, from their own dashboard, so a waiting
  // patient has no one-click button here; the menu lets the desk call on the
  // doctor's behalf.
  const waiting = appointment.status === 'WAITING';
  const next = waiting ? null : NEXT_ACTION[appointment.status];
  const extra = appointment.allowedNextStatuses.filter((status) => status !== next?.status);
  const emergency = isEmergency(appointment);

  return (
    <motion.li
      layout
      layoutId={`queue-${appointment.id}`}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn(
        'rounded-card border bg-surface p-3.5 shadow-soft',
        emergency ? 'border-(--status-cancelled-fg)/50' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold">{appointment.appointmentId}</p>
          <p className="truncate font-semibold">{appointment.patientName}</p>
        </div>
        <Menu
          label={`More actions for ${appointment.appointmentId}`}
          trigger={
            <button type="button" className={buttonClass({ variant: 'ghost', size: 'icon', className: '-mt-1 -mr-1.5 shrink-0' })}>
              <EllipsisVertical aria-hidden="true" className="h-4 w-4" />
            </button>
          }
        >
          <MenuItem icon={FileText} onSelect={() => navigate(`/staff/appointments/${appointment.id}`)}>
            Open details
          </MenuItem>
          {waiting && (
            <MenuItem icon={Megaphone} onSelect={() => onAction(appointment, 'CALLED')}>
              Call for the doctor
            </MenuItem>
          )}
          {appointment.status === 'CALLED' && (
            <MenuItem icon={Megaphone} onSelect={() => announceCall(appointment)}>
              Announce again
            </MenuItem>
          )}
          {CAN_PRIORITISE.includes(appointment.status) && (
            <MenuItem icon={Siren} onSelect={() => onPriority(appointment, emergency ? 'NORMAL' : 'EMERGENCY')}>
              {emergency ? 'Remove emergency mark' : 'Mark as emergency'}
            </MenuItem>
          )}
          {extra.length > 0 && <MenuSeparator />}
          {extra.includes('NO_SHOW') && (
            <MenuItem icon={UserX} onSelect={() => onAction(appointment, 'NO_SHOW')}>
              Mark as not arrived
            </MenuItem>
          )}
          {extra.includes('CANCELLED') && (
            <MenuItem icon={XCircle} destructive onSelect={() => onAction(appointment, 'CANCELLED')}>
              Cancel appointment
            </MenuItem>
          )}
        </Menu>
      </div>

      <p className="mt-1 text-sm text-muted">
        <span className="font-medium text-foreground tabular-nums">{appointment.time}</span> · {appointment.doctorName}
        {appointment.room && ` · Room ${appointment.room}`}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          {emergency && (
            <Badge tone="cancelled">
              <Siren aria-hidden="true" className="h-3.5 w-3.5" />
              Emergency
            </Badge>
          )}
          {appointment.tokenNumber && <Badge tone="primary">{tokenLabel(appointment.tokenNumber)}</Badge>}
          {appointment.isWalkIn && <Badge>Walk-in</Badge>}
          {appointment.status === 'WAITING' && appointment.queue && (
            <Badge tone={appointment.queue.isNext ? 'called' : 'waiting'}>
              {appointment.queue.isNext ? 'Next' : `No. ${appointment.queue.position} in line`}
            </Badge>
          )}
          {(appointment.status === 'CALLED' || appointment.status === 'IN_CONSULTATION' || CLOSED.includes(appointment.status)) && (
            <StatusPill status={appointment.status} />
          )}
        </span>
        {next && (
          <Button size="sm" onClick={() => onAction(appointment, next.status)} disabled={busy}>
            {next.label}
          </Button>
        )}
        {appointment.canRestore && (
          <Button size="sm" variant="secondary" onClick={() => onRestore(appointment)} disabled={busy}>
            <Undo2 aria-hidden="true" className="h-4 w-4" />
            Restore to queue
          </Button>
        )}
      </div>
    </motion.li>
  );
}

function Column({ title, count, empty, children }) {
  return (
    <section aria-label={`${title}, ${count}`} className="flex min-w-0 flex-col rounded-card border border-border bg-sunken/60 p-3">
      <h2 className="mb-3 flex items-center justify-between px-1 font-sans text-sm font-semibold tracking-normal">
        {title}
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted tabular-nums">{count}</span>
      </h2>
      {count === 0 ? <p className="px-1 py-6 text-center text-sm text-muted">{empty}</p> : <ul className="space-y-2.5">{children}</ul>}
    </section>
  );
}

// The front desk dashboard: today's appointments and waiting patients as a
// board. One click moves a patient to the next stage; the change shows at
// once and can be undone from the toast. Emergencies sit at the top of their
// column. The board refreshes itself every few seconds.
export default function QueueBoard() {
  usePageMeta('Dashboard');
  const [doctorId, setDoctorId] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [announce, setAnnounce] = useState(announceEnabled);
  const toast = useToast();
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/staff/queue'), [], { pollMs: 8000 });
  const doctorList = useFetch(() => api.get('/staff/doctors'), []);

  const apply = useCallback(
    (updated) =>
      setData((current) =>
        current
          ? { ...current, appointments: current.appointments.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) }
          : current,
      ),
    [setData],
  );
  const refresh = useCallback(() => {
    api.get('/staff/queue').then(setData).catch(() => {});
  }, [setData]);
  const { changeStatus, setPriority, restore, pendingId } = useStatusActions({ apply, refresh });

  // End of day: everyone not seen is marked as not arrived.
  async function resetQueue() {
    setResetting(true);
    setResetError('');
    try {
      const result = await api.post('/staff/reset-tokens');
      toast.success(`Today’s queue is closed. ${plural(result.closed, 'open visit')} cleared; queue numbers start again at 1 tomorrow.`);
      setResetOpen(false);
      refresh();
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetting(false);
    }
  }

  const all = data?.appointments || [];

  const doctors = [...new Map(all.map((a) => [a.doctorId, a.doctorName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const shown = all.filter((a) => !doctorId || String(a.doctorId) === doctorId).sort(order);
  const closed = shown.filter((a) => CLOSED.includes(a.status));
  const cardProps = (appointment) => ({
    appointment,
    onAction: changeStatus,
    onPriority: setPriority,
    onRestore: restore,
    busy: pendingId === appointment.id,
  });

  return (
    <Page>
      <PageHeader
        eyebrow="Front desk"
        title="Today’s dashboard"
        subtitle={data ? `${formatDate(data.date)} · ${plural(all.length, 'appointment')}` : ' '}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setWalkInOpen(true)}>
              <Ticket aria-hidden="true" className="h-4 w-4" />
              Walk-in token
            </Button>
            <Button variant="secondary" onClick={() => setQrOpen(true)}>
              <QrCode aria-hidden="true" className="h-4 w-4" />
              QR code
            </Button>
            <Button variant="secondary" onClick={() => setPaletteOpen(true)}>
              <Search aria-hidden="true" className="h-4 w-4" />
              Find appointment
              <kbd className="hidden rounded border border-border bg-sunken px-1.5 py-0.5 font-sans text-[11px] text-muted md:inline">Ctrl K</kbd>
            </Button>
            <Button variant="destructive" onClick={() => setResetOpen(true)}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              End-of-day reset
            </Button>
          </div>
        }
      />

      <KpiStrip kpis={data?.kpis} />

      {/* Each doctor's pace, the same figure patients see. */}
      {doctors.length > 0 && (
        <ul aria-label="Doctor pace today" className="mt-4 flex flex-wrap gap-2">
          {doctors.map(([id, name]) => {
            const delay = data.delays?.[id] ?? 0;
            return (
              <li key={id}>
                <Badge tone={delay >= 5 ? 'waiting' : 'called'}>
                  {name}: {paceText(delay).toLowerCase()}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <SelectField label="Doctor" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="w-full sm:w-72">
          <option value="">All doctors</option>
          {doctors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Switch
            label="Announce calls aloud (English, then Hindi)"
            checked={announce}
            onChange={(on) => {
              setAnnounce(on);
              setAnnounceEnabled(on);
            }}
          />
          <p aria-live="polite" className="text-sm text-muted">
            {data && `${plural(shown.filter((a) => a.status === 'WAITING').length, 'patient')} waiting`}
          </p>
        </div>
      </div>

      <div className="mt-5">
        {loading && !data ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LoadingLabel>Loading today’s dashboard…</LoadingLabel>
            {COLUMNS.map((column) => (
              <Skeleton key={column.key} className="h-64 rounded-card" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : all.length === 0 ? (
          <EmptyState icon={CalendarOff} title="No appointments today">
            Bookings for today will appear here as patients make them. Use “Walk-in token” or “QR code” for a patient
            at the desk.
          </EmptyState>
        ) : (
          <LayoutGroup>
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((column) => {
                const items = shown.filter((a) => column.statuses.includes(a.status));
                return (
                  <Column key={column.key} title={column.title} count={items.length} empty={column.empty}>
                    {items.map((appointment) => (
                      <QueueCard key={appointment.id} {...cardProps(appointment)} />
                    ))}
                  </Column>
                );
              })}
            </div>

            <details className="mt-4 rounded-card border border-border bg-sunken/60 p-3">
              <summary className="flex min-h-9 cursor-pointer items-center gap-2 px-1 text-sm font-semibold">
                Not arrived and cancelled
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted tabular-nums">{closed.length}</span>
              </summary>
              {closed.length === 0 ? (
                <p className="px-1 pt-3 text-sm text-muted">None today.</p>
              ) : (
                <ul className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  {closed.map((appointment) => (
                    <QueueCard key={appointment.id} {...cardProps(appointment)} />
                  ))}
                </ul>
              )}
            </details>
          </LayoutGroup>
        )}
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <WalkInDialog
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        doctors={doctorList.data?.doctors || []}
        defaultDoctorId={doctorId}
        onAdded={refresh}
      />
      <QrDialog open={qrOpen} onOpenChange={setQrOpen} doctors={doctorList.data?.doctors || []} defaultDoctorId={doctorId} />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={(open) => {
          if (!resetting) {
            setResetOpen(open);
            setResetError('');
          }
        }}
        title="Close today’s queue?"
        description="Every patient still booked or waiting is marked as not arrived, the visit of anyone with a doctor is completed, and unused QR codes stop working. Use this at the end of the day."
        confirmLabel="Close the queue"
        cancelLabel="Keep the queue"
        destructive
        loading={resetting}
        error={resetError}
        onConfirm={resetQueue}
      />
    </Page>
  );
}
