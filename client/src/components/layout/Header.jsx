import {
  ArrowRight,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MonitorPlay,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { cn } from '../../utils/cn.js';
import { Button, LinkButton, buttonClass } from '../ui/Button.jsx';
import { Menu, MenuItem, MenuLabel, MenuSeparator, Sheet } from '../ui/overlays.jsx';
import { Avatar, Skeleton } from '../ui/primitives.jsx';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const PUBLIC_LINKS = [
  { to: '/doctors', label: 'Doctors' },
  { to: '/specialties', label: 'Specialties' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const ROLE_LINK = {
  PATIENT: { to: '/patient/appointments', label: 'My appointments' },
  DOCTOR: { to: '/doctor', label: 'My queue' },
  STAFF: { to: '/staff', label: 'Front desk' },
};

const ACCOUNT_LINKS = {
  PATIENT: [
    { to: '/patient', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patient/appointments', label: 'My appointments', icon: CalendarDays },
    { to: '/patient/profile', label: 'Profile', icon: UserRound },
  ],
  DOCTOR: [
    { to: '/doctor', label: 'My queue', icon: Stethoscope },
    { to: '/display', label: 'Waiting-room screen', icon: MonitorPlay },
  ],
  STAFF: [
    { to: '/staff', label: 'Front desk', icon: ClipboardList },
    { to: '/staff/patients', label: 'Patient records', icon: FolderOpen },
    { to: '/staff/analytics', label: 'Analytics', icon: ChartColumn },
    { to: '/staff/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/display', label: 'Waiting-room screen', icon: MonitorPlay },
  ],
};

const navClass = ({ isActive }) =>
  cn(
    'relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150',
    isActive ? 'text-foreground' : 'text-muted hover:text-foreground',
  );

const sheetLinkClass = ({ isActive }) =>
  cn(
    'flex min-h-12 items-center gap-3 rounded-button px-3 text-base font-medium',
    isActive ? 'bg-sunken text-foreground' : 'text-foreground hover:bg-sunken',
  );

function AccountMenu({ user, logout }) {
  const navigate = useNavigate();
  return (
    <Menu
      label="Account menu"
      trigger={
        <button type="button" className={buttonClass({ variant: 'ghost', size: 'sm', className: 'gap-1.5 px-1.5' })}>
          <Avatar name={user.name} size="sm" />
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted" />
        </button>
      }
    >
      <MenuLabel>
        <span className="block font-semibold text-foreground">{user.name}</span>
        {user.email}
      </MenuLabel>
      <MenuSeparator />
      {ACCOUNT_LINKS[user.role].map((link) => (
        <MenuItem key={link.to} icon={link.icon} onSelect={() => navigate(link.to)}>
          {link.label}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem icon={LogOut} onSelect={logout}>
        Sign out
      </MenuItem>
    </Menu>
  );
}

// Site header. Stays in place while pages transition beneath it. While the
// saved session is being checked, the account area shows a placeholder rather
// than flashing the signed-out state.
export default function Header() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  // Once the page has moved, the header gains a shadow and a firmer backdrop.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const links = user ? [...PUBLIC_LINKS, ROLE_LINK[user.role]] : PUBLIC_LINKS;
  const close = () => setMenuOpen(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-(--z-header) border-b backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300 ease-soft',
        scrolled ? 'border-border bg-background/95 shadow-soft' : 'border-transparent bg-background/80',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={navClass}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="header-nav-pill"
                      className="absolute inset-0 rounded-full bg-sunken"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {!loading && (!user || user.role === 'PATIENT') && (
            <LinkButton to="/doctors" size="sm" className="group hidden lg:inline-flex">
              Book appointment
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-150 ease-soft group-hover:translate-x-0.5" />
            </LinkButton>
          )}
          {loading ? (
            <Skeleton className="h-10 w-24" />
          ) : user ? (
            <AccountMenu user={user} logout={logout} />
          ) : (
            <LinkButton to="/login" variant="secondary" size="sm" className="hidden sm:inline-flex">
              Sign in
            </LinkButton>
          )}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className={buttonClass({ variant: 'ghost', size: 'icon', className: 'lg:hidden' })}
          >
            <MenuIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen} title="Menu">
        <nav aria-label="Mobile" className="stagger-rise flex flex-col gap-1">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={close} className={sheetLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-5 border-t border-border pt-5">
          {user ? (
            <>
              <p className="px-3 text-sm text-muted">Signed in as {user.email}</p>
              <nav aria-label="Account" className="mt-2 flex flex-col gap-1">
                {ACCOUNT_LINKS[user.role].map((link) => (
                  <NavLink key={link.to} to={link.to} end onClick={close} className={sheetLinkClass}>
                    <link.icon aria-hidden="true" className="h-5 w-5 text-muted" strokeWidth={1.75} />
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => {
                  close();
                  logout();
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            !loading && (
              <div className="flex flex-col gap-2">
                <LinkButton to="/login" onClick={close}>
                  Patient sign in
                </LinkButton>
                <LinkButton to="/register" variant="secondary" onClick={close}>
                  Create account
                </LinkButton>
                <LinkButton to="/staff/login" variant="ghost" onClick={close}>
                  Doctor and staff sign in
                </LinkButton>
              </div>
            )
          )}
        </div>
      </Sheet>
    </header>
  );
}
