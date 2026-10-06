import { CircleCheck, Stethoscope } from 'lucide-react';
import { useParams } from 'react-router-dom';
import DoctorCard, { DoctorCardSkeleton } from '../components/DoctorCard.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { Card, EmptyState, ErrorState, IconTile, LoadingLabel } from '../components/ui/primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { api } from '../services/api.js';
import { specialtyBySlug } from '../utils/constants.js';
import NotFound from './NotFound.jsx';

export default function SpecialtyDetail() {
  const { slug } = useParams();
  const specialty = specialtyBySlug(slug);
  usePageMeta(specialty?.name || 'Specialty', specialty?.about);

  const { data, error, loading, reload } = useFetch(
    () => (specialty ? api.get(`/doctors?specialization=${encodeURIComponent(specialty.name)}`) : Promise.resolve({ doctors: [] })),
    [slug],
  );

  if (!specialty) return <NotFound />;

  return (
    <Page>
      <PageHeader backTo="/specialties" backLabel="All specialties" eyebrow="Specialty" title={specialty.name} subtitle={specialty.blurb} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <IconTile icon={specialty.icon} size="lg" />
          <h2 className="mt-4 text-2xl">About {specialty.name.toLowerCase() === 'ent' ? 'ENT' : specialty.name.toLowerCase()}</h2>
          <p className="mt-3 text-muted">{specialty.about}</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-2xl">Common reasons to visit</h2>
          <ul className="mt-4 space-y-2.5">
            {specialty.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2.5 text-sm">
                <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {reason}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="mt-12 mb-5 text-3xl">Doctors</h2>
      {loading && !data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <LoadingLabel>Loading doctors…</LoadingLabel>
          <DoctorCardSkeleton />
          <DoctorCardSkeleton />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data.doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title={`No ${specialty.name} doctors yet`} action={<LinkButton to="/doctors">See all doctors</LinkButton>}>
          We do not have a doctor for this specialty at the moment.
        </EmptyState>
      ) : (
        <ul className="stagger-rise grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.doctors.map((doctor) => (
            <li key={doctor.id}>
              <DoctorCard doctor={doctor} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
