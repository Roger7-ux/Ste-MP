import { Check, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { cn } from '../../utils/cn.js';

// Tabs with a sliding underline. Left and right arrows move between tabs.
export function Tabs({ label, tabs, value, onChange, className }) {
  const id = useId();
  const refs = useRef({});

  function onKeyDown(event) {
    const index = tabs.findIndex((tab) => tab.value === value);
    const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    const target =
      event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : move ? (index + move + tabs.length) % tabs.length : null;
    if (target === null) return;
    event.preventDefault();
    onChange(tabs[target].value);
    refs.current[tabs[target].value]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('scrollbar-none flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[tab.value] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative min-h-11 shrink-0 px-3.5 text-sm font-semibold transition-colors duration-150',
              selected ? 'text-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 text-xs font-medium text-muted">{tab.count}</span>}
            {selected && (
              <motion.span
                layoutId={`tab-${id}`}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Numbered progress through a short flow.
export function Stepper({ steps, current, className }) {
  return (
    <ol className={cn('flex items-center gap-2', className)}>
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={cn('flex items-center gap-2', index < steps.length - 1 && 'flex-1')}
          >
            <span
              className={cn(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors duration-200',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary bg-primary-soft text-primary dark:text-foreground',
                !done && !active && 'border-border-strong text-muted',
              )}
            >
              {done ? <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
            </span>
            <span className={cn('text-sm font-medium', active ? 'text-foreground' : 'text-muted', !active && 'hidden sm:inline')}>
              {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="relative mx-1 h-px flex-1 bg-border-strong">
                <span
                  className={cn(
                    'absolute inset-0 origin-left bg-primary transition-transform duration-300 ease-soft',
                    done ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Questions that expand to show their answers, one at a time.
export function Accordion({ items, className }) {
  const id = useId();
  const [open, setOpen] = useState(0);
  return (
    <div className={cn('divide-y divide-border rounded-card border border-border bg-surface', className)}>
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.question}>
            <h3 className="font-sans text-base tracking-normal">
              <button
                type="button"
                id={`${id}-button-${index}`}
                aria-expanded={expanded}
                aria-controls={`${id}-panel-${index}`}
                onClick={() => setOpen(expanded ? -1 : index)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-left font-semibold"
              >
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className={cn('h-5 w-5 shrink-0 text-muted transition-transform duration-200 ease-soft', expanded && 'rotate-180')}
                />
              </button>
            </h3>
            <div
              id={`${id}-panel-${index}`}
              role="region"
              aria-labelledby={`${id}-button-${index}`}
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-soft',
                expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden" inert={!expanded}>
                <p className="px-5 pb-5 text-muted">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// A small label shown on hover or keyboard focus.
export function Tooltip({ label, children, className }) {
  const id = useId();
  return (
    <span className={cn('group/tooltip relative inline-flex', className)} aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-(--z-overlay) mb-2 -translate-x-1/2 rounded-[8px] bg-foreground px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-background opacity-0 translate-y-1 transition-[opacity,translate] duration-150 ease-soft group-focus-within/tooltip:translate-y-0 group-focus-within/tooltip:opacity-100 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
