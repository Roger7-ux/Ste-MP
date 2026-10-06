import { Briefcase, CalendarDays, DoorOpen, Languages, UserRoundX } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { availabilityText, bookingPath } from '../components/DoctorCard.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { Avatar, Card, DetailRow, EmptyState, ErrorState, Eyebrow, IconTile, LoadingLabel, Skeleton } from '../components/ui/primitives.jsx';
import { useClinic } from '../hooks/useClinic.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { api } from '../services/api.js';
import { specialtyByName } from '../utils/constants.js';
import { cn } from '../utils/cn.js';
import { addDays, dateParts, formatFee, plural, todayDate } from '../utils/format.js';

function Fact({ icon, label, children }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={icon} />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-medium">{children}</p>
      </div>
    </div>
  );
}

// The next seven days at a glance: open slots per day, or closed.
function WeekPreview({ slots, from }) {
  const { hoursOn, clinic } = useClinic();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(from, index);
    return {
      date,
      closed: clinic ? !hoursOn(date) : false,
      open: slots.filter((slot) => slot.date === date && slot.status === 'AVAILABLE' && !slot.isPast).length,
    };
  });

  return (
    <ul className="grid grid-cols-7 gap-1.5 text-center">
      {days.map((day) => {
        const parts = dateParts(day.date);
        return (
          <li
            key={day.date}
            className={cn(
              'rounded-button border px-1 py-2',
              day.open > 0 ? 'border-primary/40 bg-primary-soft' : 'border-border bg-sunken text-muted',
            )}
          >
            <p className="text-[11px] font-medium">{day.date === todayDate() ? 'Today' : parts.weekday}</p>
            <p className="font-display text-lg leading-tight">{parts.day}</p>
            <p className="text-[11px]">
              {day.closed ? 'Closed' : day.open > 0 ? day.open : 'Full'}
              <span className="sr-only">{!day.closed && day.open > 0 ? ' open slots' : ''}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export default function DoctorProfile() {
  const { id } = useParams();
  const { data, error, loading, reload } = useFetch(() => api.get(`/doctors/${id}/slots`), [id]);
  const doctor = data?.doctor;
  usePageMeta(doctor ? doctor.name : 'Doctor', doctor?.description || undefined);

  if (loading && !data) {
    return (
      <Page>
        <LoadingLabel />
        <Skeleton className="h-28 w-28 rounded-full" />
        <Skeleton className="mt-6 h-10 w-72" />
        <Skeleton className="mt-8 h-56 w-full rounded-card" />
      </Page>
    );
  }
  if (error) {
    return (
      <Page width="md">
        {error.status === 404 ? (
          <EmptyState icon={UserRoundX} title="Doctor not found" action={<LinkButton to="/doctors">See all doctors</LinkButton>}>
            This doctor’s page does not exist or has been removed.
          </EmptyState>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </Page>
    );
  }

  const specialty = specialtyByName(doctor.specialization);
  const bookButton = (
    <LinkButton to={bookingPath(doctor.id)} size="lg" className="w-full" aria-disabled={!doctor.hasAvailableSlots || undefined}>
      Book appointment
    </LinkButton>
  );

  return (
    <Page className="pb-28 lg:pb-12">
      <PageHeader backTo="/doctors" backLabel="All doctors" title={doctor.name} eyebrow={doctor.specialization} className="mb-6" />

      <div className="stagger-rise grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={doctor.name} src={doctor.photoUrl} size="xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              {doctor.yearsExperience !== null && (
                <Fact icon={Briefcase} label="Experience">
                  {plural(doctor.yearsExperience, 'year')}
                </Fact>
              )}
              {doctor.room && (
                <Fact icon={DoorOpen} label="Room">
                  {doctor.room}
                </Fact>
              )}
              {doctor.languages.length > 0 && (
                <Fact icon={Languages} label="Languages">
                  {doctor.languages.join(', ')}
                </Fact>
              )}
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-2xl">About</h2>
            <p className="mt-3 text-muted">
              {doctor.bio || doctor.description || 'A profile for this doctor has not been written yet.'}
            </p>
          </section>

          {specialty && (
            <section className="mt-8">
              <h2 className="text-2xl">Common reasons to visit</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {specialty.reasons.map((reason) => (
                  <li key={reason} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm">
                    {reason}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-2xl">This week</h2>
            <p className="mt-1 mb-4 text-sm text-muted">Open slots for each of the next seven days.</p>
            <WeekPreview slots={data.slots} from={data.from} />
          </section>
        </div>

        {/* Booking summary: a sticky card on large screens. */}
        <aside className="hidden lg:block">
          <Card className="sticky top-24 p-6">
            <Eyebrow>Book a visit</Eyebrow>
            <dl className="mt-2 divide-y divide-border">
              <DetailRow label="Consultation fee">{formatFee(doctor.consultationFee)}</DetailRow>
              {doctor.room && <DetailRow label="Room">{doctor.room}</DetailRow>}
            </dl>
            <p className="mt-3 mb-5 flex items-start gap-2 text-sm">
              <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium">{availabilityText(doctor)}</span>
            </p>
            {bookButton}
          </Card>
        </aside>
      </div>

      {/* The same call to action as a bar fixed to the bottom on small screens. */}
      <div className="fixed inset-x-0 bottom-0 z-(--z-header) border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{formatFee(doctor.consultationFee)}</p>
            <p className="truncate text-xs text-muted">{availabilityText(doctor)}</p>
          </div>
          <div className="w-44 shrink-0">{bookButton}</div>
        </div>
      </div>
    </Page>
  );
}
