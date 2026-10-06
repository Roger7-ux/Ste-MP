import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { useClinic } from '../hooks/useClinic.jsx';
import { cn } from '../utils/cn.js';
import { addDays, dateParts, formatDate, plural, todayDate } from '../utils/format.js';

const isOpenSlot = (slot) => slot.status === 'AVAILABLE' && !slot.isPast;

// Moves keyboard focus between the enabled buttons of a group with the arrow
// keys. Up and Down jump to the nearest button in the row above or below.
function onArrowKeys(event) {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
  const index = buttons.indexOf(document.activeElement);
  if (index === -1) return;
  event.preventDefault();

  let target;
  if (event.key === 'Home') target = buttons[0];
  else if (event.key === 'End') target = buttons[buttons.length - 1];
  else if (event.key === 'ArrowLeft') target = buttons[index - 1];
  else if (event.key === 'ArrowRight') target = buttons[index + 1];
  else {
    const current = buttons[index].getBoundingClientRect();
    const below = event.key === 'ArrowDown';
    const candidates = buttons
      .map((button) => ({ button, rect: button.getBoundingClientRect() }))
      .filter(({ rect }) => (below ? rect.top > current.top + 4 : rect.top < current.top - 4));
    const rowTop = below
      ? Math.min(...candidates.map(({ rect }) => rect.top))
      : Math.max(...candidates.map(({ rect }) => rect.top));
    target = candidates
      .filter(({ rect }) => Math.abs(rect.top - rowTop) < 4)
      .sort((a, b) => Math.abs(a.rect.left - current.left) - Math.abs(b.rect.left - current.left))[0]?.button;
  }
  target?.focus();
}

function TimeGroup({ title, slots, selectedSlotId, onSelect }) {
  if (slots.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 font-sans text-sm font-semibold tracking-normal text-muted">{title}</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot) => {
          const open = isOpenSlot(slot);
          const selected = slot.id === selectedSlotId;
          return (
            <button
              key={slot.id}
              type="button"
              disabled={!open}
              aria-pressed={selected}
              aria-label={`${slot.startTime}${open ? '' : slot.isPast ? ', passed' : ', taken'}`}
              onClick={() => onSelect(slot)}
              className={cn(
                'relative min-h-11 rounded-button border text-sm font-semibold tabular-nums transition-colors duration-150',
                selected && 'border-primary text-primary-foreground',
                !selected && open && 'border-border-strong bg-surface hover:border-primary hover:bg-primary-soft',
                !open && 'border-border bg-sunken text-muted/60 line-through',
              )}
            >
              {selected && (
                <motion.span
                  layoutId="slot-selected"
                  className="absolute inset-0 rounded-button bg-primary"
                  transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                />
              )}
              <span className="relative">{slot.startTime}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Date strip plus time grid. `slots` covers the booking window and includes
// taken and passed slots, which are shown disabled. Days the clinic is closed
// come from the shared clinic hours and cannot be chosen.
export default function SlotPicker({ slots, from, selectedDate, onSelectDate, selectedSlotId, onSelectSlot }) {
  const { hoursOn, bookingWindowDays, clinic } = useClinic();
  const stripRef = useRef(null);

  const days = useMemo(
    () =>
      Array.from({ length: bookingWindowDays }, (_, index) => {
        const date = addDays(from, index);
        const daySlots = slots.filter((slot) => slot.date === date);
        return {
          date,
          closed: clinic ? !hoursOn(date) : false,
          open: daySlots.filter(isOpenSlot).length,
          slots: daySlots,
        };
      }),
    [slots, from, bookingWindowDays, clinic, hoursOn],
  );

  const firstBookable = days.find((day) => !day.closed && day.open > 0)?.date;
  const activeDate = selectedDate || firstBookable || days[0].date;
  const activeDay = days.find((day) => day.date === activeDate) || days[0];

  // Keep the chosen day in view when the strip scrolls sideways.
  useEffect(() => {
    stripRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [activeDate]);

  const morning = activeDay.slots.filter((slot) => slot.startTime < '12:00');
  const afternoon = activeDay.slots.filter((slot) => slot.startTime >= '12:00');

  return (
    <div>
      <h2 className="font-sans text-base font-semibold tracking-normal">Choose a day</h2>
      <div
        ref={stripRef}
        role="group"
        aria-label="Day"
        onKeyDown={onArrowKeys}
        className="scrollbar-none -mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 py-1"
      >
        {days.map((day) => {
          const parts = dateParts(day.date);
          const disabled = day.closed || day.open === 0;
          const selected = day.date === activeDate;
          const note = day.closed ? 'Closed' : day.open === 0 ? 'Full' : plural(day.open, 'slot');
          return (
            <button
              key={day.date}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${formatDate(day.date)}, ${day.closed ? 'clinic closed' : day.open === 0 ? 'no open slots' : `${plural(day.open, 'open slot')}`}`}
              onClick={() => onSelectDate(day.date)}
              className={cn(
                'flex w-[4.5rem] shrink-0 snap-start flex-col items-center rounded-card border px-2 py-2.5 transition-colors duration-150',
                selected && 'border-primary bg-primary text-primary-foreground',
                !selected && !disabled && 'border-border-strong bg-surface hover:border-primary hover:bg-primary-soft',
                disabled && 'border-border bg-sunken text-muted/70',
              )}
            >
              <span className="text-xs font-medium">{day.date === todayDate() ? 'Today' : parts.weekday}</span>
              <span className="font-display text-2xl leading-tight">{parts.day}</span>
              <span className="text-xs">{parts.month}</span>
              <span className={cn('mt-1 text-[11px] font-medium', selected ? 'opacity-90' : 'text-muted')}>{note}</span>
            </button>
          );
        })}
      </div>

      <h2 className="mt-7 font-sans text-base font-semibold tracking-normal">
        Choose a time <span className="font-normal text-muted">· {formatDate(activeDate)}</span>
      </h2>
      {activeDay.slots.length === 0 ? (
        <p className="mt-3 rounded-card border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted">
          {activeDay.closed ? 'The clinic is closed on this day.' : 'No slots on this day. Try another day.'}
        </p>
      ) : (
        <div role="group" aria-label="Time" onKeyDown={onArrowKeys} className="mt-3 space-y-5">
          <TimeGroup title="Morning" slots={morning} selectedSlotId={selectedSlotId} onSelect={onSelectSlot} />
          <TimeGroup title="Afternoon" slots={afternoon} selectedSlotId={selectedSlotId} onSelect={onSelectSlot} />
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Struck-through times are already taken or have passed.</p>
    </div>
  );
}
