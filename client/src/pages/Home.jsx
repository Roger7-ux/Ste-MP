import ClinicInfo from '../components/ClinicInfo.jsx';
import { Reveal, ScrollProgress } from '../components/motion.jsx';
import { Accordion } from '../components/ui/navigation.jsx';
import { SectionHeading } from '../components/ui/primitives.jsx';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { FAQ } from '../utils/content.js';
import Hero from './home/Hero.jsx';
import {
  CtaBand,
  FeaturedDoctors,
  HowItWorks,
  QueuePreview,
  Section,
  SpecialtiesGrid,
  Testimonials,
  TrustStrip,
} from './home/sections.jsx';
import { LivePace, WhyDifferent } from './home/usp.jsx';

export default function Home() {
  usePageMeta(
    null,
    'Wait at home, not in the waiting room. Book a doctor, then follow your place in the queue and the doctor’s real pace on a live ticket.',
  );

  return (
    <>
      <ScrollProgress />
      <Hero />
      <TrustStrip />
      <WhyDifferent />
      <LivePace />
      <QueuePreview />
      <HowItWorks />
      <SpecialtiesGrid />
      <FeaturedDoctors />
      <Testimonials />

      <Section id="visit">
        <Reveal>
          <SectionHeading eyebrow="Visit us" title="Hours and location" subtitle="Appointments can be booked for any day the clinic is open." />
        </Reveal>
        <Reveal delay={0.05}>
          <ClinicInfo className="mt-8" />
        </Reveal>
      </Section>

      <Section className="pt-0 sm:pt-0">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <SectionHeading eyebrow="Questions" title="Good to know before you come" />
          </Reveal>
          <Reveal delay={0.05}>
            <Accordion items={FAQ} />
          </Reveal>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
