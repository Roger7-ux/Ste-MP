import { ChartColumn } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Page, PageHeader } from '../../components/Page.jsx';
import { EASE } from '../../components/motion.jsx';
import { FilterChips, SelectField } from '../../components/ui/forms.jsx';
import { Avatar, Card, EmptyState, ErrorState, LoadingLabel, Skeleton } from '../../components/ui/primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { cn } from '../../utils/cn.js';
import { formatDate, plural } from '../../utils/format.js';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const SORTS = {
  total: { label: 'Most appointments', compare: (a, b) => b.total - a.total },
  cancellation: { label: 'Highest cancellation rate', compare: (a, b) => b.cancellationRate - a.cancellationRate },
  noShow: { label: 'Highest not-arrived rate', compare: (a, b) => b.noShowRate - a.noShowRate },
  wait: { label: 'Longest average wait', compare: (a, b) => (b.averageWaitMinutes ?? -1) - (a.averageWaitMinutes ?? -1) },
};

// The parts of a doctor's appointments, in the order they are drawn.
const SEGMENTS = [
  { key: 'completed', label: 'Completed', className: 'bg-primary' },
  { key: 'other', label: 'Booked or in progress', className: 'bg-(--status-booked-fg)' },
  { key: 'noShows', label: 'Not arrived', className: 'bg-(--status-noshow-fg)' },
  { key: 'cancelled', label: 'Cancelled', className: 'bg-(--status-cancelled-fg)' },
];

const percent = (value) => `${value}%`;

function Total({ label, value, note }) {
  return (
    <Card className="p-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl leading-none">{value}</dd>
      {note && <p className="mt-1.5 text-xs text-muted">{note}</p>}
    </Card>
  );
}

// Appointments per day, with the cancelled share marked at the base of each bar.
function DailyChart({ daily }) {
  const max = Math.max(...daily.map((day) => day.total), 1);
  const busiest = daily.reduce((best, day) => (day.total > best.total ? day : best), daily[0]);
  return (
    <Card className="p-5">
      <h2 className="text-xl">Appointments per day</h2>
      <p className="mt-1 text-sm text-muted">
        Busiest day: {formatDate(busiest.date)} with {busiest.total}. The darker base of each bar is the cancelled share.
      </p>
      <div
        role="img"
        aria-label={`Bar chart of appointments per day from ${formatDate(daily[0].date)} to ${formatDate(daily[daily.length - 1].date)}. The busiest day had ${busiest.total}.`}
        className="mt-5 flex h-40 items-end gap-[3px]"
      >
        {daily.map((day, index) => (
          <div key={day.date} title={`${formatDate(day.date)}: ${day.total} appointments, ${day.cancelled} cancelled`} className="flex h-full flex-1 items-end">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * 0.012, 0.5) }}
              style={{ height: `${(day.total / max) * 100}%` }}
              className="flex w-full origin-bottom flex-col justify-end overflow-hidden rounded-t-[3px] bg-primary"
            >
              <div style={{ height: day.total ? `${(day.cancelled / day.total) * 100}%` : 0 }} className="bg-(--status-cancelled-fg)" />
            </motion.div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{formatDate(daily[0].date)}</span>
        <span>{formatDate(daily[daily.length - 1].date)}</span>
      </div>
    </Card>
  );
}

function DoctorRow({ doctor, max }) {
  const other = doctor.total - doctor.completed - doctor.cancelled - doctor.noShows;
  const counts = { ...doctor, other };
  return (
    <Card as="article" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={doctor.doctorName} size="sm" />
          <div className="min-w-0">
            <h3 className="truncate text-lg leading-tight">{doctor.doctorName}</h3>
            <p className="text-xs text-muted">{doctor.specialization}</p>
          </div>
        </div>
        <p className="text-right">
          <span className="font-display text-2xl leading-none">{doctor.total}</span>
          <span className="ml-1.5 text-sm text-muted">appointments</span>
        </p>
      </div>

      {/* One bar per doctor, scaled to the busiest doctor and split by outcome. */}
      <div aria-hidden="true" className="mt-4 h-3 rounded-full bg-sunken">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ width: `${max ? (doctor.total / max) * 100 : 0}%` }}
          className="flex h-full origin-left overflow-hidden rounded-full"
        >
          {SEGMENTS.map((segment) =>
            counts[segment.key] > 0 ? (
              <span key={segment.key} style={{ flexGrow: counts[segment.key] }} className={cn('h-full', segment.className)} />
            ) : null,
          )}
        </motion.div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">Completed</dt>
          <dd className="font-semibold">
            {doctor.completed} <span className="font-normal text-muted">({percent(doctor.completionRate)})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Cancelled</dt>
          <dd className="font-semibold">
            {doctor.cancelled} <span className="font-normal text-muted">({percent(doctor.cancellationRate)})</span>
          </dd>
          <dd className="text-xs text-muted">
            {doctor.cancelledByPatient} by patients · {doctor.cancelledByStaff} by clinic
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Not arrived</dt>
          <dd className="font-semibold">
            {doctor.noShows} <span className="font-normal text-muted">({percent(doctor.noShowRate)})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Average wait</dt>
          <dd className="font-semibold">{doctor.averageWaitMinutes === null ? 'No data' : `${doctor.averageWaitMinutes} min`}</dd>
          {doctor.emergencies > 0 && <dd className="text-xs text-muted">{plural(doctor.emergencies, 'emergency', 'emergencies')}</dd>}
        </div>
      </dl>
    </Card>
  );
}

// Doctor-wise appointment and cancellation figures for a chosen period.
export default function Analytics() {
  usePageMeta('Analytics');
  const [days, setDays] = useState('30');
  const [sort, setSort] = useState('total');
  const { data, error, loading, reload } = useFetch(() => api.get(`/staff/analytics?days=${days}`), [days]);

  const doctors = data ? [...data.doctors].sort((a, b) => SORTS[sort].compare(a, b) || a.doctorName.localeCompare(b.doctorName)) : [];
  const max = Math.max(...doctors.map((doctor) => doctor.total), 0);
  const totals = data?.totals;

  return (
    <Page>
      <PageHeader
        eyebrow="Front desk"
        title="Analytics"
        subtitle={
          data
            ? `Appointments dated ${formatDate(data.from)} to ${formatDate(data.to)}, by doctor.`
            : 'Appointments and cancellations by doctor.'
        }
      />

      <FilterChips label="Period" options={RANGES} value={days} onChange={setDays} />

      {loading && !data ? (
        <div className="mt-6">
          <LoadingLabel>Loading analytics…</LoadingLabel>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-card" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 rounded-card" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} className="mt-6" />
      ) : totals.total === 0 ? (
        <EmptyState icon={ChartColumn} title="No appointments in this period" className="mt-6">
          Figures appear here once appointments have been booked for these dates.
        </EmptyState>
      ) : (
        <div className={cn('mt-6 transition-opacity duration-200', loading && 'opacity-60')}>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Total label="Appointments" value={totals.total} />
            <Total label="Completed" value={totals.completed} />
            <Total
              label="Cancelled"
              value={totals.cancelled}
              note={`${percent(totals.cancellationRate)} · ${totals.cancelledByPatient} by patients, ${totals.cancelledByStaff} by clinic`}
            />
            <Total label="Not arrived" value={totals.noShows} note={percent(totals.noShowRate)} />
            <Total label="Emergencies" value={totals.emergencies} />
            <Total label="Average wait" value={totals.averageWaitMinutes === null ? '–' : `${totals.averageWaitMinutes} min`} note="From check-in to being called" />
          </dl>

          <div className="mt-6">
            <DailyChart daily={data.daily} />
          </div>

          <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl">By doctor</h2>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Bar colours">
                {SEGMENTS.map((segment) => (
                  <li key={segment.key} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', segment.className)} />
                    {segment.label}
                  </li>
                ))}
              </ul>
            </div>
            <SelectField label="Sort by" value={sort} onChange={(event) => setSort(event.target.value)} className="w-full sm:w-64">
              {Object.entries(SORTS).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </SelectField>
          </div>

          <ul className="mt-4 space-y-3">
            {doctors.map((doctor) => (
              <li key={doctor.doctorId}>
                <DoctorRow doctor={doctor} max={max} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
}
