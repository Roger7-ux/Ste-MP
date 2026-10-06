import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Page, PageHeader } from '../components/Page.jsx';
import { Stagger, StaggerItem } from '../components/motion.jsx';
import { Card, IconTile } from '../components/ui/primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { api } from '../services/api.js';
import { SPECIALTIES } from '../utils/constants.js';
import { plural } from '../utils/format.js';

export default function Specialties() {
  usePageMeta('Specialties', 'The specialties at MediQ, what each one treats and the doctors you can book.');
  const { data } = useFetch(() => api.get('/doctors'), []);
  const countFor = (name) => data?.doctors.filter((doctor) => doctor.specialization === name).length;

  return (
    <Page>
      <PageHeader
        eyebrow="Specialties"
        title="What we treat"
        subtitle="Six specialties under one roof. Choose one to read what it covers and book with its doctors."
      />
      <Stagger as="ul" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SPECIALTIES.map((specialty) => {
          const count = countFor(specialty.name);
          return (
            <StaggerItem as="li" key={specialty.slug}>
              <Link to={`/specialties/${specialty.slug}`} className="group block h-full rounded-card">
                <Card interactive className="flex h-full flex-col p-6 group-active:scale-[0.98]">
                  <IconTile icon={specialty.icon} size="lg" />
                  <h2 className="mt-4 text-2xl">{specialty.name}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted">{specialty.about}</p>
                  <p className="mt-5 flex items-center justify-between text-sm font-semibold">
                    <span className="text-muted">{count === undefined ? ' ' : plural(count, 'doctor')}</span>
                    <span className="flex items-center gap-1 text-primary dark:text-foreground">
                      Learn more
                      <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-150 ease-soft group-hover:translate-x-1" />
                    </span>
                  </p>
                </Card>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Page>
  );
}
