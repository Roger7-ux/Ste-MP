import { LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn.js';

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-button font-semibold whitespace-nowrap ' +
  'transition-[background-color,border-color,color,translate,scale,box-shadow] duration-150 ease-soft ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55';

const VARIANTS = {
  primary: 'bg-primary text-primary-foreground shadow-soft hover:-translate-y-px hover:bg-primary-hover hover:shadow-lift',
  secondary: 'border border-border-strong bg-surface text-foreground hover:bg-sunken',
  ghost: 'text-foreground hover:bg-sunken',
  destructive: 'border border-danger/40 bg-surface text-danger hover:bg-danger-soft',
  // For use on a solid primary-coloured background.
  inverse: 'bg-primary-foreground text-primary hover:bg-primary-foreground/90',
  'inverse-outline': 'border border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10',
};

// Every size is at least 44px tall on touch screens.
const SIZES = {
  sm: 'min-h-11 px-3 text-sm md:min-h-9',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
  icon: 'h-11 w-11 md:h-10 md:w-10',
};

export function buttonClass({ variant = 'primary', size = 'md', className } = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

// `loading` shows a spinner and blocks repeat clicks while a request runs.
export function Button({
  variant,
  size,
  className,
  type = 'button',
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant, size, className, ...props }) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
