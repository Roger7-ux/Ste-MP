import { ArrowLeft, Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn.js';
import { Tooltip } from './ui/navigation.jsx';
import { Eyebrow } from './ui/primitives.jsx';

const WIDTHS = { md: 'max-w-3xl', lg: 'max-w-6xl' };

// Standard page width and padding.
export function Page({ width = 'lg', className, children }) {
  return <div className={cn('mx-auto px-4 py-8 sm:px-6 sm:py-12', WIDTHS[width], className)}>{children}</div>;
}

export function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      className="group mb-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
      {children}
    </Link>
  );
}

export function PageHeader({ eyebrow, title, subtitle, backTo, backLabel, action, className }) {
  return (
    <div className={cn('mb-8', className)}>
      {backTo && <BackLink to={backTo}>{backLabel}</BackLink>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
          <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

// An appointment ID in monospace with a button that copies it.
export function AppointmentId({ value, className }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked; the ID stays visible to copy by hand.
    }
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="font-mono text-sm font-semibold tracking-tight">{value}</span>
      <Tooltip label={copied ? 'Copied' : 'Copy ID'}>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Appointment ID copied' : `Copy appointment ID ${value}`}
          className="grid h-9 w-9 place-items-center rounded-button text-muted transition-colors hover:bg-sunken hover:text-foreground"
        >
          {copied ? (
            <Check aria-hidden="true" className="h-4 w-4 text-primary" />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </Tooltip>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </span>
  );
}
