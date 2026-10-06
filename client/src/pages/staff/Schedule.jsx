import { ChevronLeft, ChevronRight, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, PageHeader } from '../../components/Page.jsx';
import { Button, LinkButton, buttonClass } from '../../components/ui/Button.jsx';
import { Card, EmptyState, ErrorState, LoadingLabel, Skeleton } from '../../components/ui/primitives.jsx';
import { useClinic } from '../../hooks/useClinic.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { cn } from '../../utils/cn.js';
import { addDays, dateParts, formatDate, todayDate } from '../../utils/format.js';

// One doctor's day: how many slots are booked out of how many exist.
function DayCell({ doctorId, date, slots, closed }) {
  if (closed) {
    return <td className="border-l border-border bg-sunken/60 px-2 py-3 text-center text-xs text-muted">Closed</td>;
  }
  const booked = slots.filter((slot) => slot.status === 'BOOKED').length;
  const total = slots.length;
  if (total === 0) {
    return (
      <td className="border-l border-border px-2 py-3 text-center text-xs text-muted">
        <span aria-hidden="true">–</span>
        <span className="sr-only">No slots</span>
      </td>
    );
  }
  const open = total - booked;
  return (
    <td className="border-l border-border p-1.5">
      <Link
        to={`/staff/availability?doctor=${doctorId}`}
        aria-label={`${formatDate(date)}: ${booked} booked, ${open} open`}
        className="block rounded-button px-2 py-2 transition-colors hover:bg-sunken"
      >
        <span className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-semibold">{booked} booked</span>
          <span className={cn(open === 0 ? 'text-danger' : 'text-muted')}>{open} open</span>
        </span>
        <span aria-hidden="true" className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-primary-soft">
          <span className="block h-full origin-left bg-primary" style={{ transform: `scaleX(${booked / total})` }} />
        </span>
      </Link>
    </td>
  );
}

// A week of every doctor's slots, booked against open, at a glance.
export default function Schedule() {
  usePageMeta('Schedule');
  const { hoursOn, clinic } = useClinic();
  const [start, setStart] = useState(todayDate());
  const { data, error, loading, reload } = useFetch(() => api.get(`/staff/schedule?start=${start}`), [start]);

  const days = data?.days || Array.from({ length: 7 }, (_, index) => addDays(start, index));

  return (
    <Page>
      <PageHeader
        eyebrow="Front desk"
        title="Schedule"
        subtitle={`${formatDate(days[0])} to ${formatDate(days[6])}. Select a day to manage that doctor’s slots.`}
        action={
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous week" onClick={() => setStart(addDays(start, -7))} className={buttonClass({ variant: 'secondary', size: 'icon' })}>
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <Button variant="secondary" onClick={() => setStart(todayDate())} disabled={start === todayDate()}>
              This week
            </Button>
            <button type="button" aria-label="Next week" onClick={() => setStart(addDays(start, 7))} className={buttonClass({ variant: 'secondary', size: 'icon' })}>
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        }
      />

      {loading && !data ? (
        <>
          <LoadingLabel>Loading the schedule…</LoadingLabel>
          <Skeleton className="h-80 w-full rounded-card" />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data.doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No doctors added yet" action={<LinkButton to="/staff/doctors">Go to Doctors</LinkButton>} />
      ) : (
        // The table scrolls sideways inside its own frame on narrow screens.
        <Card className={cn('overflow-x-auto', loading && 'opacity-60')} tabIndex={0} role="region" aria-label="Weekly schedule">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="sticky left-0 z-10 bg-surface px-4 py-3 text-sm font-semibold">
                  Doctor
                </th>
                {days.map((date) => {
                  const parts = dateParts(date);
                  return (
                    <th key={date} scope="col" className={cn('border-l border-border px-2 py-3 text-center text-xs font-semibold', date === todayDate() && 'bg-primary-soft')}>
                      <span className="block text-muted">{date === todayDate() ? 'Today' : parts.weekday}</span>
                      <span className="font-display text-lg">{parts.day}</span> {parts.month}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.doctors.map((doctor) => (
                <tr key={doctor.id} className="border-b border-border last:border-0">
                  <th scope="row" className="sticky left-0 z-10 w-52 bg-surface px-4 py-3 text-left font-normal">
                    <span className="block font-semibold">{doctor.name}</span>
                    <span className="text-xs text-muted">
                      {doctor.specialization}
                      {doctor.room && ` · Room ${doctor.room}`}
                    </span>
                  </th>
                  {days.map((date) => (
                    <DayCell
                      key={date}
                      doctorId={doctor.id}
                      date={date}
                      closed={clinic ? !hoursOn(date) : false}
                      slots={data.slots.filter((slot) => slot.doctorId === doctor.id && slot.date === date)}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
  );
}
