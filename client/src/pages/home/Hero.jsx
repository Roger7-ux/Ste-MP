import { ArrowRight, ChevronDown, ClipboardList, Radio, Stethoscope, Ticket, UserRound } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { WaitingRoomArt } from '../../components/Illustrations.jsx';
import { EASE } from '../../components/motion.jsx';
import { LinkButton } from '../../components/ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { SITE_NAME } from '../../utils/constants.js';
import { cn } from '../../utils/cn.js';
import { plural } from '../../utils/format.js';

// The last line is set in the italic display face, in the brand colour.
const HEADLINE = [
  { text: 'Book smarter.' },
  { text: 'Wait less.' },
  { text: 'Know your turn.', accent: true },
];

const SECONDARY = {
  PATIENT: { to: '/patient/appointments', label: 'My appointments' },
  DOCTOR: { to: '/doctor', label: 'My queue' },
  STAFF: { to: '/staff', label: 'Front desk' },
};

// The three screens that share one queue, placed around it. `at` is the
// centre of each tile in the connector drawing's own units (100 wide, 80 tall).
const SCREENS = [
  { label: 'Patient', icon: UserRound, className: 'top-[12%] left-[10%]', delay: 0, at: [20, 18] },
  { label: 'Doctor', icon: Stethoscope, className: 'top-[36%] right-[6%]', delay: 1.1, at: [84, 37] },
  { label: 'Front desk', icon: ClipboardList, className: 'bottom-[10%] left-[18%]', delay: 2.2, at: [29, 63] },
];
const CENTRE = [50, 40];

// Lines from each screen to the queue. They draw in once, then a small signal
// travels along each in turn, showing that the screens stay in touch.
function Connectors() {
  return (
    <svg viewBox="0 0 100 80" className="absolute inset-0 h-full w-full text-primary" fill="none">
      {SCREENS.map((screen, index) => (
        <g key={screen.label}>
          <motion.line
            x1={screen.at[0]}
            y1={screen.at[1]}
            x2={CENTRE[0]}
            y2={CENTRE[1]}
            stroke="currentColor"
            strokeWidth="0.35"
            strokeOpacity="0.35"
            strokeDasharray="1.2 1.6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.8 + index * 0.12 }}
          />
          <motion.circle
            r="0.9"
            fill="currentColor"
            initial={{ cx: screen.at[0], cy: screen.at[1], opacity: 0 }}
            animate={{ cx: [screen.at[0], CENTRE[0]], cy: [screen.at[1], CENTRE[1]], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.6, ease: 'easeInOut', delay: 1.8 + index * 1.5, repeat: Infinity, repeatDelay: 3 }}
          />
        </g>
      ))}
    </svg>
  );
}

// A slow up-and-down drift for the floating tiles.
const float = (delay = 0) => ({
  animate: { y: [0, -7, 0] },
  transition: { duration: 5, ease: 'easeInOut', repeat: Infinity, delay },
});

// The glass panel beside the headline: the live queue at the centre, with the
// three screens that read from it around it.
function QueuePanel() {
  const { data } = useFetch(() => api.get('/stats'), []);
  const stats = data?.stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.25 }}
      className="rounded-[28px] border border-foreground/10 bg-surface/55 p-5 shadow-lift backdrop-blur-md sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Radio aria-hidden="true" className="h-4 w-4 text-primary" />
          {SITE_NAME} live queue
        </p>
        <p className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">
          <span aria-hidden="true" className="relative grid h-1.5 w-1.5 place-items-center">
            <span className="absolute h-1.5 w-1.5 animate-pulse-ring rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Screens connected
        </p>
      </div>

      {/* Decorative: the same idea is stated in the text beside it. */}
      <div aria-hidden="true" className="relative mx-auto mt-4 aspect-[5/4] w-full max-w-sm">
        <span className="absolute top-1/2 left-1/2 h-[92%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/10" />
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 48, ease: 'linear', repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -mt-[28%] -ml-[28%] h-[70%] w-[56%] rounded-full border border-dashed border-foreground/15"
        />

        <Connectors />

        <span className="absolute top-1/2 left-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift sm:h-24 sm:w-24">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary" />
          <span className="relative text-center leading-tight">
            <Ticket className="mx-auto h-5 w-5" strokeWidth={1.75} />
            <span className="mt-0.5 block text-xs font-semibold">Queue</span>
          </span>
        </span>

        {SCREENS.map((screen, index) => (
          <motion.span
            key={screen.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.55 + index * 0.12 }}
            className={cn('absolute', screen.className)}
          >
            <motion.span
              {...float(screen.delay)}
              className="grid min-w-[4.75rem] place-items-center gap-1 rounded-2xl border border-foreground/10 bg-surface/80 px-3 py-2.5 shadow-soft backdrop-blur-sm"
            >
              <screen.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              <span className="text-[11px] font-semibold">{screen.label}</span>
            </motion.span>
          </motion.span>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        {stats
          ? `${plural(stats.doctors, 'doctor')} · ${plural(stats.openSlotsThisWeek, 'open slot')} this week · one shared queue`
          : 'One shared queue · updates by itself'}
      </p>
    </motion.div>
  );
}

// The opening band of the landing page. It keeps the dark palette in both
// themes, so the headline always sits on a deep teal scene.
export default function Hero() {
  const { user, loading } = useAuth();
  const { scrollY } = useScroll();
  // The backdrop drifts slightly slower than the page.
  const sceneY = useTransform(scrollY, [0, 600], [0, 70]);
  // The scroll cue fades away as soon as the page starts to move.
  const cueOpacity = useTransform(scrollY, [0, 120], [1, 0]);
  const secondary = user ? SECONDARY[user.role] : { to: '/login', label: 'Track my appointment' };

  return (
    <section data-theme="dark" className="relative isolate overflow-hidden bg-background text-foreground">
      {/* Backdrop: the waiting-room scene, dimmed, under a wash that keeps the text readable. */}
      <motion.div aria-hidden="true" style={{ y: sceneY }} className="absolute inset-x-0 -top-16 -z-10 h-[125%] opacity-35">
        <WaitingRoomArt />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-background via-background/90 to-background/55" />
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_70%_at_78%_40%,color-mix(in_srgb,var(--primary)_22%,transparent),transparent_70%)]"
      />
      <div aria-hidden="true" className="dot-grid absolute inset-0 -z-10 opacity-25" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-linear-to-b from-transparent to-background/80" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase"
          >
            <Radio aria-hidden="true" className="h-3.5 w-3.5" />
            Smart queue management
          </motion.p>

          <h1 className="mt-6 font-sans text-[2.7rem] leading-[1.04] font-bold tracking-tight sm:text-6xl lg:text-[4.1rem]">
            {HEADLINE.map((line, index) => (
              <span key={line.text} className="block overflow-hidden pb-1.5">
                <motion.span
                  className={cn('block', line.accent && 'font-display font-normal text-primary italic')}
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.08 + index * 0.09 }}
                >
                  {line.text}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.4 }}
          >
            <p className="mt-5 max-w-lg text-lg text-muted">
              {SITE_NAME} turns your appointment into a live ticket: your token, your place in line, and a call in
              English and Hindi when the doctor is ready for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/doctors" size="lg" className="group">
                Book an appointment
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-150 ease-soft group-hover:translate-x-1" />
              </LinkButton>
              {!loading && (
                <LinkButton to={secondary.to} variant="secondary" size="lg" className="bg-surface/70 backdrop-blur-sm">
                  <Ticket aria-hidden="true" className="h-4 w-4" />
                  {secondary.label}
                </LinkButton>
              )}
            </div>
          </motion.div>
        </div>

        <QueuePanel />
      </div>

      <motion.a
        href="#figures"
        aria-label="Scroll to the clinic's figures"
        style={{ opacity: cueOpacity }}
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 text-muted hover:text-foreground lg:block"
      >
        <motion.span className="block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.2 }}>
          <motion.span
            className="block"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
          >
            <ChevronDown aria-hidden="true" className="h-5 w-5" />
          </motion.span>
        </motion.span>
      </motion.a>
    </section>
  );
}
