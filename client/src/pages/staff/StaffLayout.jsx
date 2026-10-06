import { MonitorPlay } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../utils/cn.js';

const LINKS = [
  { to: '/staff', label: 'Dashboard', end: true },
  { to: '/staff/appointments', label: 'Appointments' },
  { to: '/staff/patients', label: 'Patient records' },
  { to: '/staff/analytics', label: 'Analytics' },
  { to: '/staff/schedule', label: 'Schedule' },
  { to: '/staff/doctors', label: 'Doctors' },
  { to: '/staff/availability', label: 'Availability' },
];

const linkClass = ({ isActive }) =>
  cn(
    'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-150 md:min-h-9',
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted hover:bg-sunken hover:text-foreground',
  );

// Front desk section: its own row of navigation above each staff page.
export default function StaffLayout() {
  return (
    <>
      <div className="border-b border-border bg-surface">
        {/* `relative` keeps the visually hidden label inside this scroll area. */}
        <nav aria-label="Front desk" className="scrollbar-none relative mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          <a
            href="/display"
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted hover:bg-sunken hover:text-foreground md:min-h-9"
          >
            <MonitorPlay aria-hidden="true" className="h-4 w-4" />
            Waiting-room screen
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </nav>
      </div>
      <Outlet />
    </>
  );
}
