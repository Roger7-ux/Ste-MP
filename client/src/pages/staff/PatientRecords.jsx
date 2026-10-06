import { ChevronDown, FolderOpen, Search, SearchX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, PageHeader } from '../../components/Page.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, FilterChips } from '../../components/ui/forms.jsx';
import { Avatar, Badge, Card, EmptyState, ErrorState, LoadingLabel, Skeleton, StatusPill } from '../../components/ui/primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { tokenLabel } from '../../utils/constants.js';
import { cn } from '../../utils/cn.js';
import { formatDate, formatDateTime, plural } from '../../utils/format.js';

const FILTERS = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'seen', label: 'Seen', match: (patient) => patient.completedVisits > 0 },
  { value: 'missed', label: 'Not arrived', match: (patient) => patient.notArrivedVisits > 0 },
  { value: 'walkIn', label: 'Walk-ins', match: (patient) => patient.isWalkIn },
];

function Visit({ visit }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <Link to={`/staff/appointments/${visit.id}`} className="font-mono text-xs font-semibold underline-offset-4 hover:underline">
            {visit.appointmentId}
          </Link>
          {visit.tokenNumber && <Badge tone="primary">{tokenLabel(visit.tokenNumber)}</Badge>}
          {visit.priority === 'EMERGENCY' && <Badge tone="cancelled">Emergency</Badge>}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium">{formatDateTime(visit.date, visit.time)}</span>
          <span className="text-muted">
            {' '}
            · {visit.doctorName} · {visit.specialization}
          </span>
        </p>
        {visit.reason && <p className="mt-1 text-sm text-muted italic">“{visit.reason}”</p>}
        {(visit.waitMinutes !== null || visit.visitMinutes !== null) && (
          <p className="mt-1 text-xs text-muted">
            {visit.waitMinutes !== null && `Waited ${visit.waitMinutes} min`}
            {visit.waitMinutes !== null && visit.visitMinutes !== null && ' · '}
            {visit.visitMinutes !== null && `Consultation ${visit.visitMinutes} min`}
          </p>
        )}
      </div>
      <StatusPill status={visit.status} />
    </li>
  );
}

function PatientRecord({ patient, open, onToggle }) {
  return (
    <Card as="article">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-3.5 rounded-card p-4 text-left sm:p-5"
      >
        <Avatar name={patient.name} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-display text-lg leading-tight">{patient.name}</span>
            {patient.isWalkIn && <Badge>Walk-in</Badge>}
          </span>
          <span className="block truncate text-sm text-muted">
            {patient.isWalkIn ? 'No account: name given at the desk' : [patient.phone, patient.email].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="hidden shrink-0 text-right text-sm sm:block">
          <span className="block font-medium">
            {plural(patient.completedVisits, 'visit')} completed
            {patient.notArrivedVisits > 0 && ` · ${patient.notArrivedVisits} not arrived`}
          </span>
          <span className="block text-muted">{patient.lastVisit ? `Last seen ${formatDate(patient.lastVisit)}` : 'Not seen yet'}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn('h-5 w-5 shrink-0 text-muted transition-transform duration-200 ease-soft', open && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-200 ease-soft', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" inert={!open}>
          <ul className="divide-y divide-border border-t border-border px-4 sm:px-5">
            {patient.visits.map((visit) => (
              <Visit key={visit.id} visit={visit} />
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

// Every patient the clinic has booked or seen, with their visit history. Each
// visit is kept with how it ended: completed, not arrived or cancelled.
export default function PatientRecords() {
  usePageMeta('Patient records');
  const { data, error, loading, reload } = useFetch(() => api.get('/staff/patients'), []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [openKey, setOpenKey] = useState(null);

  const all = data?.patients || [];
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searched = all.filter((patient) => {
    const haystack = `${patient.name} ${patient.phone || ''} ${patient.email || ''} ${patient.visits.map((visit) => visit.appointmentId).join(' ')}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  const shown = searched.filter(FILTERS.find((item) => item.value === filter).match);

  return (
    <Page>
      <PageHeader
        eyebrow="Front desk"
        title="Patient records"
        subtitle="Every patient and their visits, kept for future reference. Open a patient to see their history."
      />

      <div className="relative max-w-xl">
        <Field
          label="Search"
          type="search"
          placeholder="Name, phone, email or appointment ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          inputClassName="pl-10"
        />
        <Search aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3.5 h-5 w-5 text-muted" strokeWidth={1.75} />
      </div>
      <FilterChips
        label="Show"
        className="mt-4"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((item) => ({ value: item.value, label: item.label, count: searched.filter(item.match).length }))}
      />
      <p aria-live="polite" className="mt-4 text-sm text-muted">
        {data ? plural(shown.length, 'patient') : ' '}
      </p>

      <div className="mt-3">
        {loading && !data ? (
          <div className="space-y-3">
            <LoadingLabel>Loading patient records…</LoadingLabel>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-card" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : all.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No patient records yet">
            A record is kept for each patient as soon as they book, take a token or are seen.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No patients match"
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
            {shown.map((patient) => (
              <li key={patient.key}>
                <PatientRecord patient={patient} open={openKey === patient.key} onToggle={() => setOpenKey(openKey === patient.key ? null : patient.key)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
