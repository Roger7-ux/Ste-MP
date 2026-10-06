import { CalendarDays, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppointmentCard, { AppointmentCardSkeleton, isActive } from '../../components/AppointmentCard.jsx';
import { Page } from '../../components/Page.jsx';
import { LinkButton } from '../../components/ui/Button.jsx';
import { Card, EmptyState, ErrorState, Eyebrow, IconTile, LoadingLabel } from '../../components/ui/primitives.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useCancelAppointment } from '../../hooks/useCancelAppointment.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { firstName, greeting, plural } from '../../utils/format.js';

const SHORTCUTS = [
  { to: '/doctors', icon: Search, title: 'Find a doctor', text: 'Search by name or specialty.' },
  { to: '/patient/appointments', icon: CalendarDays, title: 'My appointments', text: 'Upcoming, past and cancelled.' },
  { to: '/patient/profile', icon: UserRound, title: 'Profile', text: 'Your name, phone and email.' },
];

export default function PatientDashboard() {
  usePageMeta('Dashboard');
  const { user } = useAuth();
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/appointments'), [], { pollMs: 10000 });

  const { askToCancel, dialog } = useCancelAppointment((updated) => {
    setData((current) => ({
      appointments: current.appointments.map((item) => (item.id === updated.id ? updated : item)),
    }));
  });

  const upcoming = (data?.appointments || [])
    .filter(isActive)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const next = upcoming[0];

  return (
    <Page width="md">
      <Eyebrow className="mb-2">Dashboard</Eyebrow>
      <h1 className="text-3xl leading-tight sm:text-4xl">
        {greeting()}, {firstName(user.name)}
      </h1>
      <p className="mt-2 text-muted">
        {!data
          ? ' '
          : next
            ? `You have ${plural(upcoming.length, 'upcoming appointment')}.`
            : 'You have no upcoming appointments.'}
      </p>

      <section className="mt-8" aria-labelledby="next-appointment">
        <h2 id="next-appointment" className="mb-3 font-sans text-sm font-semibold tracking-normal text-muted">
          Next appointment
        </h2>
        {loading && !data ? (
          <>
            <LoadingLabel />
            <AppointmentCardSkeleton />
          </>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : next ? (
          <>
            <AppointmentCard appointment={next} onCancel={askToCancel} />
            {upcoming.length > 1 && (
              <Link
                to="/patient/appointments"
                className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline dark:text-foreground"
              >
                See all {upcoming.length} upcoming appointments
              </Link>
            )}
          </>
        ) : (
          <EmptyState icon={CalendarDays} title="Nothing booked yet" action={<LinkButton to="/doctors">Find a doctor</LinkButton>}>
            Book a visit and it will appear here, with your place in the queue on the day.
          </EmptyState>
        )}
      </section>

      <ul className="stagger-rise mt-10 grid gap-4 sm:grid-cols-3">
        {SHORTCUTS.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="group block h-full rounded-card">
              <Card interactive className="h-full p-5 group-active:scale-[0.98]">
                <IconTile icon={item.icon} />
                <p className="mt-3 font-display text-lg">{item.title}</p>
                <p className="text-sm text-muted">{item.text}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      {dialog}
    </Page>
  );
}
