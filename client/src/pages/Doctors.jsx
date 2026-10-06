import { Search, SearchX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DoctorCard, { DoctorCardSkeleton } from '../components/DoctorCard.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { EASE } from '../components/motion.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, FilterChips, SelectField, Switch } from '../components/ui/forms.jsx';
import { EmptyState, ErrorState, LoadingLabel } from '../components/ui/primitives.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { api } from '../services/api.js';
import { SPECIALTIES, specialtyBySlug } from '../utils/constants.js';
import { plural } from '../utils/format.js';

const SORTS = {
  next: {
    label: 'Next available',
    compare: (a, b) => {
      const key = (doctor) => (doctor.nextAvailable ? `${doctor.nextAvailable.date} ${doctor.nextAvailable.time}` : '9999');
      return key(a).localeCompare(key(b)) || a.name.localeCompare(b.name);
    },
  },
  fee: { label: 'Fee: low to high', compare: (a, b) => a.consultationFee - b.consultationFee || a.name.localeCompare(b.name) },
  name: { label: 'Name', compare: (a, b) => a.name.localeCompare(b.name) },
};

function matchesSearch(doctor, query) {
  if (!query) return true;
  const haystack = [doctor.name, doctor.specialization, doctor.description, doctor.bio, ...doctor.languages]
    .join(' ')
    .toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

export default function Doctors() {
  usePageMeta('Find a doctor', 'Search doctors by name or specialty, compare fees and see the next open appointment.');

  // Filters live in the URL so they survive a refresh, the back button and sharing.
  const [params, setParams] = useSearchParams();
  const specialty = specialtyBySlug(params.get('specialty'))?.slug || '';
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'next';
  const todayOnly = params.get('today') === '1';

  const [search, setSearch] = useState(params.get('q') || '');
  const query = useDebounce(search.trim().toLowerCase(), 250);

  function update(key, value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    update('q', query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const { data, error, loading, reload } = useFetch(() => api.get('/doctors'), []);

  // Search and "available today" apply first, so each chip shows how many
  // doctors it would give.
  const narrowed = useMemo(
    () => (data?.doctors || []).filter((doctor) => matchesSearch(doctor, query) && (!todayOnly || doctor.slotsToday > 0)),
    [data, query, todayOnly],
  );
  const selectedName = specialtyBySlug(specialty)?.name;
  const shown = useMemo(
    () => narrowed.filter((doctor) => !selectedName || doctor.specialization === selectedName).sort(SORTS[sort].compare),
    [narrowed, selectedName, sort],
  );

  const chips = [
    { value: '', label: 'All', count: narrowed.length },
    ...SPECIALTIES.map((item) => ({
      value: item.slug,
      label: item.name,
      count: narrowed.filter((doctor) => doctor.specialization === item.name).length,
    })),
  ];

  const filtered = Boolean(query || specialty || todayOnly);
  function clearFilters() {
    setSearch('');
    setParams({}, { replace: true });
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Doctors"
        title="Find a doctor"
        subtitle="Search by name or specialty, compare fees, and book the next open time."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <div className="relative">
          <Field
            label="Search"
            type="search"
            placeholder="Name, specialty or keyword"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            inputClassName="pl-10"
          />
          <Search aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3.5 h-5 w-5 text-muted" strokeWidth={1.75} />
        </div>
        <SelectField label="Sort by" value={sort} onChange={(event) => update('sort', event.target.value === 'next' ? '' : event.target.value)} className="lg:w-52">
          {Object.entries(SORTS).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </SelectField>
        <Switch label="Available today" checked={todayOnly} onChange={(checked) => update('today', checked ? '1' : '')} />
      </div>

      <FilterChips label="Specialty" options={chips} value={specialty} onChange={(value) => update('specialty', value)} className="mt-5" />

      <p aria-live="polite" className="mt-6 text-sm text-muted">
        {data ? `${plural(shown.length, 'doctor')}${filtered ? ' match your filters' : ''}` : ' '}
      </p>

      <div className="mt-4">
        {loading && !data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <LoadingLabel>Loading doctors…</LoadingLabel>
            {Array.from({ length: 6 }, (_, index) => (
              <DoctorCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={filtered ? 'No doctors match your filters' : 'No doctors have been added yet'}
            action={filtered && <Button onClick={clearFilters}>Clear filters</Button>}
          >
            {filtered ? 'Try a different name or specialty, or switch off “Available today”.' : 'Please check back soon.'}
          </EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((doctor) => (
                <motion.li
                  key={doctor.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  <DoctorCard doctor={doctor} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Page>
  );
}
