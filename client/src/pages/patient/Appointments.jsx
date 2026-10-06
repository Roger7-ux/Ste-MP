import { CalendarCheck2, CalendarX2, History } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AppointmentCard, { AppointmentCardSkeleton, isActive, showsTracker } from '../../components/AppointmentCard.jsx';
import { Page, PageHeader } from '../../components/Page.jsx';
import { LinkButton } from '../../components/ui/Button.jsx';
import { Tabs } from '../../components/ui/navigation.jsx';
import { EmptyState, ErrorState, LoadingLabel } from '../../components/ui/primitives.jsx';
import { useCancelAppointment } from '../../hooks/useCancelAppointment.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';

const soonestFirst = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

const GROUPS = {
  upcoming: {
    label: 'Upcoming',
    filter: isActive,
    sort: soonestFirst,
    empty: { icon: CalendarCheck2, title: 'No upcoming appointments', text: 'When you book a visit, it appears here with its live status.' },
  },
  past: {
    label: 'Past',
    filter: (a) => a.status === 'COMPLETED' || a.status === 'NO_SHOW',
    empty: { icon: History, title: 'No past appointments', text: 'Completed visits are kept here for your records.' },
  },
  cancelled: {
    label: 'Cancelled',
    filter: (a) => a.status === 'CANCELLED',
    empty: { icon: CalendarX2, title: 'No cancelled appointments', text: 'Appointments you or the clinic cancel are listed here.' },
  },
};

export default function Appointments() {
  usePageMeta('My appointments');
  const [params, setParams] = useSearchParams();
  const tab = GROUPS[params.get('tab')] ? params.get('tab') : 'upcoming';

  // Refreshes by itself so a status change at the front desk shows up here;
  // more often while a visit is in progress today.
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/appointments'), [], { pollMs: 10000 });
  const appointments = data?.appointments || [];

  const { askToCancel, dialog } = useCancelAppointment((updated) => {
    setData((current) => ({
      appointments: current.appointments.map((item) => (item.id === updated.id ? updated : item)),
    }));
  });

  const group = GROUPS[tab];
  const shown = appointments.filter(group.filter);
  if (group.sort) shown.sort(group.sort);
  const live = appointments.some(showsTracker);

  return (
    <Page width="md">
      <PageHeader
        title="My appointments"
        subtitle="Quote your appointment ID at the front desk."
        action={<LinkButton to="/doctors">Book another</LinkButton>}
      />

      <Tabs
        label="Appointments"
        value={tab}
        onChange={(value) => setParams(value === 'upcoming' ? {} : { tab: value }, { replace: true })}
        tabs={Object.entries(GROUPS).map(([value, item]) => ({
          value,
          label: item.label,
          count: data ? appointments.filter(item.filter).length : undefined,
        }))}
      />

      <div role="tabpanel" aria-label={group.label} className="mt-6">
        {live && <p className="sr-only">Your appointment for today updates automatically.</p>}
        {loading && !data ? (
          <div className="space-y-4">
            <LoadingLabel>Loading your appointments…</LoadingLabel>
            <AppointmentCardSkeleton />
            <AppointmentCardSkeleton />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={group.empty.icon}
            title={appointments.length === 0 ? 'You have no appointments yet' : group.empty.title}
            action={tab === 'upcoming' && <LinkButton to="/doctors">Find a doctor</LinkButton>}
          >
            {group.empty.text}
          </EmptyState>
        ) : (
          <ul key={tab} className="stagger-rise space-y-4">
            {shown.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentCard appointment={appointment} onCancel={askToCancel} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {dialog}
    </Page>
  );
}
