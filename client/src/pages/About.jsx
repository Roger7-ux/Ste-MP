import { Link } from 'react-router-dom';
import { PhotoPlaceholder } from '../components/Illustrations.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { Reveal, Stagger, StaggerItem } from '../components/motion.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { Avatar, Badge, Card, Eyebrow, SectionHeading, Skeleton } from '../components/ui/primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { ABOUT_PHOTOS, ABOUT_STORY, ABOUT_VALUES } from '../mocks/content.js';
import { api } from '../services/api.js';

export default function About() {
  usePageMeta('About', 'About MediQ: our approach to care and the doctors you will meet.');
  const { data } = useFetch(() => api.get('/doctors'), []);

  return (
    <Page>
      <PageHeader eyebrow="About" title="A calmer way to see a doctor" subtitle="Less time in the waiting room, more time with the person looking after you." />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Reveal>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-2xl">Our story</h2>
            <Badge tone="waiting">Sample text</Badge>
          </div>
          <div className="space-y-4 text-muted">
            {ABOUT_STORY.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <PhotoPlaceholder label="Clinic exterior" className="aspect-[4/3]" />
        </Reveal>
      </div>

      <Stagger as="ul" className="mt-12 grid gap-4 md:grid-cols-3">
        {ABOUT_VALUES.map((value) => (
          <StaggerItem as="li" key={value.title}>
            <Card className="h-full p-6">
              <Eyebrow>What matters to us</Eyebrow>
              <h3 className="mt-1 text-xl">{value.title}</h3>
              <p className="mt-2 text-sm text-muted">{value.text}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <section className="mt-16">
        <Reveal>
          <SectionHeading eyebrow="The team" title="Doctors you will meet" />
        </Reveal>
        <Stagger as="ul" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(data?.doctors || Array.from({ length: 6 })).map((doctor, index) => (
            <StaggerItem as="li" key={doctor?.id ?? index}>
              {doctor ? (
                <Link to={`/doctors/${doctor.id}`} className="group block rounded-card">
                  <Card interactive className="flex h-full flex-col items-center p-4 text-center">
                    <Avatar name={doctor.name} src={doctor.photoUrl} size="lg" />
                    <p className="mt-3 font-display leading-tight">{doctor.name}</p>
                    <p className="mt-1 text-xs text-muted">{doctor.specialization}</p>
                  </Card>
                </Link>
              ) : (
                <Skeleton className="h-44 rounded-card" />
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="mt-16">
        <Reveal>
          <SectionHeading eyebrow="The clinic" title="Take a look around" />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {ABOUT_PHOTOS.map((label) => (
            <PhotoPlaceholder key={label} label={label} className="aspect-[4/3]" />
          ))}
        </div>
      </section>

      <div className="mt-14 flex flex-wrap gap-3">
        <LinkButton to="/doctors">Find a doctor</LinkButton>
        <LinkButton to="/contact" variant="secondary">
          Contact us
        </LinkButton>
      </div>
    </Page>
  );
}
