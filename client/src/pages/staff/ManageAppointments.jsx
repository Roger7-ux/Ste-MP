import { CalendarOff, ChevronRight, Search, SearchX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, PageHeader } from '../../components/Page.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, FilterChips } from '../../components/ui/forms.jsx';
import { Card, EmptyState, ErrorState, LoadingLabel, Skeleton, StatusPill } from '../../components/ui/primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { ACTIVE_STATUSES } from '../../utils/constants.js';
import { formatDateTime, plural } from '../../utils/format.js';

const FILTERS = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'active', label: 'Active', match: (a) => ACTIVE_STATUSES.includes(a.status) },
  { value: 'completed', label: 'Completed', match: (a) => a.status === 'COMPLETED' },
  { value: 'closed', label: 'Cancelled or not arrived', match: (a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW' },
];

// Every appointment, most recent first, with a search and a status filter.
export default function ManageAppointments() {
  usePageMeta('Appointments');
  const { data, error, loading, reload } = useFetch(() => api.get('/staff/appointments'), []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const all = data?.appointments || [];
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searched = all.filter((a) => {
    const haystack = `${a.appointmentId} ${a.patientName} ${a.doctorName}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  const shown = searched.filter(FILTERS.find((item) => item.value === filter).match);

  return (
    <Page>
      <PageHeader eyebrow="Front desk" title="Appointments" subtitle="Every appointment, most recent first. Open one to update its status." />

      <div className="relative max-w-md">
        <Field
          label="Search"
          type="search"
          placeholder="Appointment ID, patient or doctor"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          inputClassName="pl-10"
        />
        <Search aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3.5 h-5 w-5 text-muted" strokeWidth={1.75} />
      </div>
      <FilterChips
        label="Status"
        className="mt-4"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((item) => ({ value: item.value, label: item.label, count: searched.filter(item.match).length }))}
      />
      <p aria-live="polite" className="mt-5 text-sm text-muted">
        {data ? plural(shown.length, 'appointment') : ' '}
      </p>

      <div className="mt-3">
        {loading && !data ? (
          <div className="space-y-3">
            <LoadingLabel>Loading appointments…</LoadingLabel>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-card" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : all.length === 0 ? (
          <EmptyState icon={CalendarOff} title="No appointments yet">
            Appointments appear here as soon as patients book.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No appointments match"
            action={
              <Button
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="stagger-rise space-y-3">
            {shown.map((a) => (
              <li key={a.id}>
                <Link to={`/staff/appointments/${a.id}`} className="group block rounded-card">
                  <Card interactive className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="font-mono text-xs font-semibold">{a.appointmentId}</p>
                      <p className="truncate font-semibold">{a.patientName}</p>
                    </div>
                    <p className="min-w-0 flex-1 basis-48 text-sm text-muted">
                      <span className="block truncate text-foreground">{a.doctorName}</span>
                      {formatDateTime(a.date, a.time)}
                    </p>
                    <StatusPill status={a.status} />
                    <ChevronRight aria-hidden="true" className="h-5 w-5 text-muted transition-transform duration-150 group-hover:translate-x-1" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
