import { Check, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Reveal, Stagger, StaggerItem } from '../../components/motion.jsx';
import { Avatar, Badge, Card, IconTile, SectionHeading, Skeleton } from '../../components/ui/primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { COMPARISON, USP_POINTS } from '../../utils/content.js';
import { paceText } from '../../utils/format.js';
import { Section } from './sections.jsx';

// The product's unique selling point: what happens after the booking.
export function WhyDifferent() {
  return (
    <Section>
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Why MediQ"
          title="Booking is the easy part. Waiting is the problem."
          subtitle="Most systems stop once the slot is booked. MediQ starts there."
        />
      </Reveal>

      <Stagger as="ul" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {USP_POINTS.map((point) => (
          <StaggerItem as="li" key={point.title}>
            <Card interactive className="h-full p-5">
              <IconTile icon={point.icon} size="lg" />
              <h3 className="mt-4 text-xl leading-snug">{point.title}</h3>
              <p className="mt-2 text-sm text-muted">{point.text}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mt-10">
        <Card className="overflow-hidden">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">A visit booked through a booking-only system compared with MediQ</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="hidden px-5 py-4 font-semibold text-muted sm:table-cell">
                  The moment
                </th>
                <th scope="col" className="px-4 py-4 font-semibold text-muted sm:px-5">
                  Booking-only systems
                </th>
                <th scope="col" className="bg-primary-soft px-4 py-4 font-semibold sm:px-5">
                  MediQ
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, index) => (
                <motion.tr
                  key={row.moment}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                  transition={{ duration: 0.45, delay: 0.1 + index * 0.08 }}
                  className="border-b border-border align-top last:border-0"
                >
                  <th scope="row" className="hidden px-5 py-4 font-display text-base font-normal sm:table-cell">
                    {row.moment}
                  </th>
                  <td className="px-4 py-4 text-muted sm:px-5">
                    <span className="mb-1 block font-display text-base text-foreground sm:hidden">{row.moment}</span>
                    <span className="flex gap-2">
                      <Minus aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                      {row.usual}
                    </span>
                  </td>
                  <td className="bg-primary-soft px-4 py-4 font-medium sm:px-5">
                    <span className="mb-1 block font-display text-base sm:hidden" aria-hidden="true">
                      {' '}
                    </span>
                    <span className="flex gap-2">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                      {row.here}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Reveal>
    </Section>
  );
}

// Each doctor's real pace today, straight from the front desk. Refreshes by
// itself. This is live data, not a mock-up.
export function LivePace() {
  const { data } = useFetch(() => api.get('/doctors'), [], { pollMs: 15000 });
  const doctors = data?.doctors;
  if (doctors && doctors.length === 0) return null;

  return (
    <div className="border-y border-border bg-surface">
      <Section>
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Honest pace"
            title="The clinic, right now"
            subtitle="How each doctor is running today and how many patients are waiting. Nothing here is hidden until you arrive."
          />
          <Badge tone="primary">
            <span aria-hidden="true" className="relative grid h-2 w-2 place-items-center">
              <span className="absolute h-2 w-2 animate-pulse-ring rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full bg-primary" />
            </span>
            Live from the front desk
          </Badge>
        </Reveal>

        <Stagger as="ul" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(doctors || Array.from({ length: 6 })).map((doctor, index) => (
            <StaggerItem as="li" key={doctor?.id ?? index} className="min-w-0">
              {doctor ? (
                <Link to={`/doctors/${doctor.id}`} className="group block rounded-card">
                  <Card interactive className="flex items-center gap-3.5 p-4 group-active:scale-[0.98]">
                    <Avatar name={doctor.name} src={doctor.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg leading-tight">{doctor.name}</p>
                      <p className="text-xs text-muted">{doctor.specialization}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={doctor.delayMinutes >= 5 ? 'waiting' : 'called'}>{paceText(doctor.delayMinutes)}</Badge>
                      <p className="mt-1 text-xs text-muted">{doctor.waiting} waiting</p>
                    </div>
                  </Card>
                </Link>
              ) : (
                <Skeleton className="h-20 rounded-card" />
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </div>
  );
}
