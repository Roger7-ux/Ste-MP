import { ArrowRight, CalendarDays, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatFee, formatRelativeDate, paceText, plural, todayDate } from '../utils/format.js';
import { LinkButton } from './ui/Button.jsx';
import { Avatar, Card, Eyebrow, Skeleton } from './ui/primitives.jsx';

// 'Next: Today 09:00 · 6 slots today', 'Next: Mon, 5 Oct 09:00 · 42 open this week',
// or a note that nothing is open. "This week" is today and the six days after.
export function availabilityText(doctor) {
  if (!doctor.nextAvailable) return 'No open slots in the next two weeks';
  const { date, time } = doctor.nextAvailable;
  const week = doctor.openSlotsThisWeek;
  const tail = date === todayDate() ? `${plural(doctor.slotsToday, 'slot')} today` : week > 0 ? `${week} open this week` : 'next week';
  return `Next: ${formatRelativeDate(date)} ${time} · ${tail}`;
}

export const bookingPath = (doctorId) => `/patient/doctors/${doctorId}/book`;

export default function DoctorCard({ doctor }) {
  return (
    <Card as="article" interactive className="group flex h-full flex-col p-5">
      <div className="flex items-start gap-3.5">
        <Avatar name={doctor.name} src={doctor.photoUrl} />
        <div className="min-w-0">
          <Eyebrow>{doctor.specialization}</Eyebrow>
          <h3 className="mt-0.5 text-xl leading-snug">
            <Link to={`/doctors/${doctor.id}`} className="rounded-sm underline-offset-4 hover:underline">
              {doctor.name}
            </Link>
          </h3>
        </div>
      </div>

      {doctor.description && <p className="mt-3 text-sm text-muted">{doctor.description}</p>}

      <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-muted">Consultation fee</dt>
          <dd className="font-semibold">{formatFee(doctor.consultationFee)}</dd>
        </div>
        {doctor.room && (
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-muted">Room</dt>
            <dd className="font-semibold">{doctor.room}</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 flex items-start gap-2 text-sm">
        <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
        <span className={doctor.nextAvailable ? 'font-medium' : 'text-muted'}>{availabilityText(doctor)}</span>
      </p>
      {/* Today's live pace, shown only while the doctor has a queue. */}
      {(doctor.waiting > 0 || doctor.delayMinutes >= 5) && (
        <p className="mt-2 flex items-start gap-2 text-sm">
          <Gauge aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
          <span className="text-muted">
            Today: <span className="font-medium text-foreground">{paceText(doctor.delayMinutes).toLowerCase()}</span> ·{' '}
            {doctor.waiting} waiting
          </span>
        </p>
      )}

      <div className="mt-auto pt-5">
        {doctor.hasAvailableSlots ? (
          <LinkButton to={bookingPath(doctor.id)} className="w-full">
            Book appointment
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-150 ease-soft group-hover:translate-x-1" />
          </LinkButton>
        ) : (
          <LinkButton to={`/doctors/${doctor.id}`} variant="secondary" className="w-full">
            View profile
          </LinkButton>
        )}
      </div>
    </Card>
  );
}

export function DoctorCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-6 w-40" />
        </div>
      </div>
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-5 h-16 w-full" />
      <Skeleton className="mt-4 h-4 w-48" />
      <Skeleton className="mt-5 h-11 w-full" />
    </Card>
  );
}
