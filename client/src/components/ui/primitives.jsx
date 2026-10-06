import { CircleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { STATUS_META } from '../../utils/constants.js';
import { cn } from '../../utils/cn.js';
import { initials } from '../../utils/format.js';
import { Button } from './Button.jsx';

export function Card({ as: Tag = 'div', interactive = false, className, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-card border border-border bg-surface shadow-soft',
        interactive &&
          'transition-[translate,box-shadow,border-color] duration-200 ease-soft hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift',
        className,
      )}
      {...props}
    />
  );
}

// Small uppercase label above a title.
export function Eyebrow({ className, ...props }) {
  return (
    <p
      className={cn('text-[11px] font-semibold uppercase tracking-[0.14em] text-accent sm:text-xs', className)}
      {...props}
    />
  );
}

export function SectionHeading({ eyebrow, title, subtitle, as: Tag = 'h2', align = 'left', className }) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', className)}>
      {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
      <Tag className="text-3xl leading-tight sm:text-4xl">{title}</Tag>
      {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
    </div>
  );
}

// An icon on a pale rounded tile.
export function IconTile({ icon: Icon, size = 'md', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-[10px] bg-icon-chip text-primary dark:text-foreground',
        size === 'lg' ? 'h-12 w-12' : 'h-9 w-9',
        className,
      )}
    >
      <Icon className={size === 'lg' ? 'h-6 w-6' : 'h-[18px] w-[18px]'} strokeWidth={1.75} />
    </span>
  );
}

const AVATAR_SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
  xl: 'h-28 w-28 text-3xl',
};

// A photo when there is one, otherwise the person's initials.
export function Avatar({ name, src, size = 'md', className }) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-icon-chip font-display font-semibold text-primary dark:text-foreground',
        AVATAR_SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

const PILL = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

const TONES = {
  booked: 'bg-(--status-booked-bg) text-(--status-booked-fg)',
  waiting: 'bg-(--status-waiting-bg) text-(--status-waiting-fg)',
  called: 'bg-(--status-called-bg) text-(--status-called-fg)',
  consult: 'bg-(--status-consult-bg) text-(--status-consult-fg)',
  completed: 'bg-(--status-completed-bg) text-(--status-completed-fg)',
  cancelled: 'bg-(--status-cancelled-bg) text-(--status-cancelled-fg)',
  noshow: 'bg-(--status-noshow-bg) text-(--status-noshow-fg)',
  neutral: 'bg-sunken text-muted',
  primary: 'bg-primary-soft text-primary dark:text-foreground',
};

export function Badge({ tone = 'neutral', className, ...props }) {
  return <span className={cn(PILL, TONES[tone], className)} {...props} />;
}

// An appointment status. When the status changes, the pill cross-fades.
export function StatusPill({ status, className }) {
  const meta = STATUS_META[status];
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(PILL, TONES[meta.tone], className)}
      >
        <span aria-hidden="true">{meta.symbol}</span>
        {meta.label}
      </motion.span>
    </AnimatePresence>
  );
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('shimmer rounded-lg', className)} />;
}

// Tells assistive technology that content is loading, alongside skeletons.
export function LoadingLabel({ children = 'Loading…' }) {
  return (
    <span role="status" className="sr-only">
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div
      className={cn(
        'animate-rise flex flex-col items-center rounded-card border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && (
        <span aria-hidden="true" className="relative mb-4 grid h-16 w-16 place-items-center rounded-full bg-icon-chip text-primary dark:text-foreground">
          <Icon className="h-7 w-7" strokeWidth={1.5} />
        </span>
      )}
      <p className="font-display text-xl">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// A failed load, with a way to try again.
export function ErrorState({ error, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'animate-rise flex flex-col items-center rounded-card border border-danger/30 bg-danger-soft px-6 py-10 text-center',
        className,
      )}
    >
      <CircleAlert aria-hidden="true" className="mb-3 h-7 w-7 text-danger" strokeWidth={1.5} />
      <p className="font-semibold text-foreground">Something went wrong</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{error?.message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

const ALERT_TONES = {
  error: 'border-danger/30 bg-danger-soft text-foreground',
  success: 'border-primary/30 bg-primary-soft text-foreground',
  info: 'border-border-strong bg-sunken text-foreground',
};

// An inline message inside a form or page.
export function Alert({ tone = 'error', children, className }) {
  if (!children) return null;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('animate-rise rounded-button border px-4 py-3 text-sm', ALERT_TONES[tone], className)}
    >
      {children}
    </div>
  );
}

// Label/value pairs, as used on cards and summaries.
export function DetailRow({ label, children, className }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2', className)}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
