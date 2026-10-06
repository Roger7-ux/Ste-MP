import { AtSign, Globe, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { summariseHours, useClinic } from '../../hooks/useClinic.jsx';
import { SITE_NAME, SPECIALTIES } from '../../utils/constants.js';
import { Skeleton } from '../ui/primitives.jsx';
import Logo from './Logo.jsx';

const QUICK_LINKS = [
  { to: '/doctors', label: 'Find a doctor' },
  { to: '/specialties', label: 'Specialties' },
  { to: '/about', label: 'About the clinic' },
  { to: '/contact', label: 'Contact' },
  { to: '/login', label: 'Patient sign in' },
  { to: '/staff/login', label: 'Doctor and staff sign in' },
];

// TODO: replace with the clinic's real social profiles.
const SOCIAL_PLACEHOLDERS = [
  { label: 'Website', icon: Globe },
  { label: 'Email newsletter', icon: AtSign },
  { label: 'Messaging', icon: MessageCircle },
];

const linkClass = 'text-sm text-muted transition-colors hover:text-foreground';

function Column({ title, children }) {
  return (
    <div>
      <h2 className="font-sans text-sm font-semibold tracking-normal">{title}</h2>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function Footer() {
  const { clinic } = useClinic();

  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Find a doctor, pick a time and follow your place in the queue, without the wait at the front desk.
          </p>
          <ul className="mt-5 flex gap-2" aria-label="Social links (placeholders)">
            {SOCIAL_PLACEHOLDERS.map((item) => (
              <li key={item.label}>
                <span
                  title={`${item.label} (link to be added)`}
                  className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted"
                >
                  <item.icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  <span className="sr-only">{item.label} (link to be added)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Column title="Quick links">
          {QUICK_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </Column>

        <Column title="Specialties">
          {SPECIALTIES.map((specialty) => (
            <Link key={specialty.slug} to={`/specialties/${specialty.slug}`} className={linkClass}>
              {specialty.name}
            </Link>
          ))}
        </Column>

        <Column title="Visit us">
          {clinic ? (
            <>
              <dl className="text-sm">
                {summariseHours(clinic.hours).map((group) => (
                  <div key={group.days} className="flex justify-between gap-4 py-0.5">
                    <dt className="text-muted">{group.days}</dt>
                    <dd className={group.closed ? 'text-muted' : 'font-medium'}>{group.text}</dd>
                  </div>
                ))}
              </dl>
              <address className="mt-2 text-sm text-muted not-italic">
                {clinic.address.line1}
                <br />
                {clinic.address.city} {clinic.address.postcode}
                <br />
                {clinic.phone}
                <br />
                {clinic.email}
              </address>
            </>
          ) : (
            <>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-36" />
            </>
          )}
        </Column>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. Demonstration system; the address and contact details shown are
            placeholders.
          </p>
          <p>Privacy · Terms · Accessibility (pages to be added)</p>
        </div>
      </div>
    </footer>
  );
}
