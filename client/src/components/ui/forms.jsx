import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '../../utils/cn.js';

const CONTROL =
  'block w-full rounded-button border bg-surface px-3.5 text-base text-foreground placeholder:text-muted ' +
  'transition-[border-color,box-shadow] duration-150 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] focus-visible:outline-none disabled:bg-sunken disabled:text-muted';

function controlClass(error, extra) {
  return cn(CONTROL, error ? 'border-danger' : 'border-border-strong hover:border-muted/60', extra);
}

// Wraps a control with its label, hint and inline error, and wires the ARIA
// attributes that connect them.
function FieldShell({ id, label, error, hint, optional, className, children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="animate-rise mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ariaProps(id, error, hint) {
  return {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}

export function Field({ label, error, hint, optional, className, inputClassName, ...props }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <input className={controlClass(error, cn('min-h-11', inputClassName))} {...ariaProps(id, error, hint)} {...props} />
    </FieldShell>
  );
}

export function TextareaField({ label, error, hint, optional, className, rows = 3, ...props }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <textarea rows={rows} className={controlClass(error, 'resize-y py-2.5')} {...ariaProps(id, error, hint)} {...props} />
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, optional, className, children, ...props }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <select className={controlClass(error, 'min-h-11')} {...ariaProps(id, error, hint)} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

// Two or three options side by side; the highlight slides to the chosen one.
export function SegmentedControl({ label, options, value, onChange, className }) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid auto-cols-fr grid-flow-col rounded-button border border-border bg-sunken p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative min-h-10 rounded-[7px] px-3 text-sm font-semibold transition-colors duration-150',
              selected ? 'text-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segment-${id}`}
                className="absolute inset-0 rounded-[7px] border border-border bg-surface shadow-soft"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// A row of filter chips. The filled background slides between chips.
export function FilterChips({ label, options, value, onChange, className }) {
  const id = useId();
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-150 md:min-h-9',
              selected
                ? 'border-primary text-primary-foreground'
                : 'border-border-strong bg-surface text-foreground hover:bg-sunken',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`chip-${id}`}
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">
              {option.label}
              {option.count !== undefined && (
                <span className={cn('ml-1.5 text-xs', selected ? 'opacity-80' : 'text-muted')}>{option.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// An on/off switch with its label.
export function Switch({ label, checked, onChange, className }) {
  const id = useId();
  return (
    <div className={cn('flex min-h-11 items-center gap-2.5', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150',
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-sunken',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full bg-surface shadow-soft transition-transform duration-150 ease-soft',
            checked && 'translate-x-5',
          )}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {label}
      </label>
    </div>
  );
}
