import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DoctorCard, { DoctorCardSkeleton } from '../../components/DoctorCard.jsx';
import QueueTracker from '../../components/QueueTracker.jsx';
import { CountUp, EASE, Reveal, Stagger, StaggerItem } from '../../components/motion.jsx';
import { LinkButton, buttonClass } from '../../components/ui/Button.jsx';
import { Badge, Card, IconTile, SectionHeading, Skeleton } from '../../components/ui/primitives.jsx';
import { useClinic } from '../../hooks/useClinic.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { SAMPLE_TESTIMONIALS } from '../../mocks/content.js';
import { api } from '../../services/api.js';
import { SPECIALTIES } from '../../utils/constants.js';
import { HOW_IT_WORKS } from '../../utils/content.js';

export function Section({ className = '', children, ...props }) {
  return (
    <section className={`mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 ${className}`} {...props}>
      {children}
    </section>
  );
}

// Headline figures, counted up as the strip scrolls into view. All four are
// real numbers from the clinic's own data.
export function TrustStrip() {
  const { data } = useFetch(() => api.get('/stats'), []);
  const { clinic } = useClinic();
  const stats = data?.stats;
  const openDays = clinic?.hours.filter((entry) => entry.open).length;

  const items = stats
    ? [
        { value: stats.doctors, label: 'Doctors' },
        { value: stats.specialties, label: 'Specialties' },
        { value: stats.openSlotsThisWeek, label: 'Open slots this week' },
        stats.averageWaitMinutes !== null
          ? { value: stats.averageWaitMinutes, suffix: ' min', label: 'Average wait after check-in' }
          : { value: openDays ?? 0, label: 'Days open each week' },
      ]
    : null;

  return (
    <div id="figures" className="scroll-mt-16 border-y border-border bg-surface">
      <Stagger as="dl" className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {(items || Array.from({ length: 4 })).map((item, index) => (
          <StaggerItem key={item?.label || index} className="flex flex-col-reverse">
            <dt className="mt-1 text-sm text-muted">{item ? item.label : <Skeleton className="h-4 w-28" />}</dt>
            <dd className="font-display text-4xl leading-none sm:text-5xl">
              {item ? <CountUp value={item.value} suffix={item.suffix} /> : <Skeleton className="h-11 w-20" />}
            </dd>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function SpecialtiesGrid() {
  return (
    <Section>
      <Reveal>
        <SectionHeading eyebrow="Specialties" title="Care for the whole family" subtitle="Choose a specialty to see its doctors and open times." />
      </Reveal>
      <Stagger as="ul" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SPECIALTIES.map((specialty) => (
          <StaggerItem as="li" key={specialty.slug}>
            <Link to={`/doctors?specialty=${specialty.slug}`} className="group block h-full rounded-card">
              <Card interactive className="flex h-full items-center gap-4 p-5 group-active:scale-[0.98]">
                <IconTile icon={specialty.icon} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl">{specialty.name}</h3>
                  <p className="text-sm text-muted">{specialty.blurb}</p>
                </div>
                <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted transition-transform duration-150 ease-soft group-hover:translate-x-1 group-hover:text-primary" />
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

// A sideways-scrolling row of doctor cards with previous and next buttons.
export function FeaturedDoctors() {
  const { data, error } = useFetch(() => api.get('/doctors'), []);
  const trackRef = useRef(null);
  const doctors = (data?.doctors || []).filter((doctor) => doctor.hasAvailableSlots).slice(0, 8);

  if (error || (data && doctors.length === 0)) return null;

  const scroll = (direction) =>
    trackRef.current?.scrollBy({ left: direction * (trackRef.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <Section className="pt-0 sm:pt-0">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Our doctors" title="Meet the team" subtitle="Doctors with open appointments in the next two weeks." />
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous doctors" onClick={() => scroll(-1)} className={buttonClass({ variant: 'secondary', size: 'icon' })}>
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Next doctors" onClick={() => scroll(1)} className={buttonClass({ variant: 'secondary', size: 'icon' })}>
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </Reveal>
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label="Featured doctors"
        className="scrollbar-none -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6"
      >
        {doctors.length === 0
          ? Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="w-[19rem] shrink-0">
                <DoctorCardSkeleton />
              </li>
            ))
          : doctors.map((doctor) => (
              <li key={doctor.id} className="w-[19rem] shrink-0 snap-start">
                <DoctorCard doctor={doctor} />
              </li>
            ))}
      </ul>
      <div className="mt-4">
        <LinkButton to="/doctors" variant="secondary">
          See all doctors
        </LinkButton>
      </div>
    </Section>
  );
}

// Four steps joined by a line that draws itself as the section appears.
export function HowItWorks() {
  return (
    <div className="border-y border-border bg-surface">
      <Section>
        <Reveal>
          <SectionHeading align="center" eyebrow="How it works" title="From search to seen, in four steps" />
        </Reveal>
        <div className="relative mt-12">
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '0px 0px -15% 0px' }}
            transition={{ duration: 0.9, ease: EASE }}
            className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-0.5 origin-left bg-border-strong lg:block"
          />
          <Stagger as="ol" className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, index) => (
              <StaggerItem as="li" key={step.title} className="flex gap-4 lg:flex-col lg:items-center lg:text-center">
                <span className="relative shrink-0 rounded-[14px] bg-surface p-0 lg:px-3">
                  <IconTile icon={step.icon} size="lg" />
                  <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground lg:right-1">
                    {index + 1}
                  </span>
                </span>
                <div>
                  <h3 className="text-xl">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted">{step.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>
    </div>
  );
}

// The stages the sample appointment steps through, on a loop.
const PREVIEW_STAGES = [
  { status: 'BOOKED' },
  { status: 'WAITING', queue: { position: 3, ahead: 2, isNext: false, estimatedWaitMinutes: 30 } },
  { status: 'WAITING', queue: { position: 2, ahead: 1, isNext: false, estimatedWaitMinutes: 15 } },
  { status: 'WAITING', queue: { position: 1, ahead: 0, isNext: true, estimatedWaitMinutes: 0 } },
  { status: 'CALLED' },
  { status: 'IN_CONSULTATION' },
  { status: 'COMPLETED' },
];

// The real tracker component, driven by sample data, so visitors can see what
// patients get after checking in.
export function QueuePreview() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(2);

  useEffect(() => {
    if (reduced) return undefined;
    const timer = setInterval(() => setStage((current) => (current + 1) % PREVIEW_STAGES.length), 2600);
    return () => clearInterval(timer);
  }, [reduced]);

  const appointment = { appointmentId: 'RS-261001-0042', room: '101', timeline: {}, ...PREVIEW_STAGES[stage] };

  return (
    <Section>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            eyebrow="Live queue"
            title="Know when it is your turn"
            subtitle="After the front desk checks you in, your appointment shows your place in line and an estimated wait. It updates by itself and tells you when you are next and when you are called."
          />
          <LinkButton to="/doctors" className="mt-6">
            Book a visit
          </LinkButton>
        </Reveal>
        <Reveal delay={0.1}>
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-semibold">{appointment.appointmentId}</span>
              <Badge>Preview with sample data</Badge>
            </div>
            {/* The live region inside the tracker is silenced here: this is a looping demo. */}
            <div aria-hidden="true">
              <QueueTracker appointment={appointment} />
            </div>
            <p className="sr-only">
              An animated example of the queue tracker, stepping from booked, to waiting in third place, to being called.
            </p>
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}

export function Testimonials() {
  return (
    <div className="border-y border-border bg-surface">
      <Section>
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Patient feedback" title="What patients say" />
          <Badge tone="waiting">Sample content, not real reviews</Badge>
        </Reveal>
        <Stagger as="ul" className="mt-8 grid gap-4 md:grid-cols-3">
          {SAMPLE_TESTIMONIALS.map((item, index) => (
            <StaggerItem as="li" key={index}>
              <Card as="figure" className="flex h-full flex-col border-dashed p-6">
                <blockquote className="flex-1 font-display text-lg leading-snug text-muted">“{item.quote}”</blockquote>
                <figcaption className="mt-4 text-sm text-muted">{item.attribution} (placeholder)</figcaption>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </div>
  );
}

export function CtaBand() {
  return (
    <Section className="pb-0 sm:pb-0">
      <Reveal className="relative overflow-hidden rounded-[28px] bg-primary px-6 py-12 text-center text-primary-foreground sm:px-10 sm:py-16">
        <div aria-hidden="true" className="dot-grid absolute inset-0 animate-drift opacity-15" />
        <div className="relative">
          <h2 className="text-3xl sm:text-5xl">Book your visit</h2>
          <p className="mx-auto mt-3 max-w-md opacity-90">Choose a doctor and a time. It takes about a minute.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton to="/doctors" size="lg" variant="inverse">
              Find a doctor
            </LinkButton>
            <LinkButton to="/login" size="lg" variant="inverse-outline">
              Patient sign in
            </LinkButton>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
