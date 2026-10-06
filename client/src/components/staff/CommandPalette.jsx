import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce.js';
import { api } from '../../services/api.js';
import { cn } from '../../utils/cn.js';
import { formatDateTime } from '../../utils/format.js';
import { StatusPill } from '../ui/primitives.jsx';

// Look an appointment up by its ID or the patient's name. Opens with
// Ctrl+K (⌘K on a Mac); arrow keys move through results, Enter opens one.
export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 200);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }
    let cancelled = false;
    setStatus('loading');
    api
      .get(`/staff/appointments?q=${encodeURIComponent(query)}`)
      .then((data) => {
        if (cancelled) return;
        setResults(data.appointments);
        setActive(0);
        setStatus('done');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  function go(appointment) {
    onOpenChange(false);
    navigate(`/staff/appointments/${appointment.id}`);
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      go(results[active]);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-overlay) bg-overlay data-[state=open]:animate-[overlay-in_200ms_ease-out]" />
        <DialogPrimitive.Content className="fixed top-[12vh] left-1/2 z-(--z-overlay) w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-card border border-border bg-surface shadow-lift data-[state=open]:animate-[dialog-in_200ms_var(--ease-soft)]">
          <DialogPrimitive.Title className="sr-only">Find an appointment</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search by appointment ID or patient name. Use the arrow keys to choose a result and Enter to open it.
          </DialogPrimitive.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-muted" />
            <input
              type="search"
              role="combobox"
              aria-label="Appointment ID or patient name"
              aria-expanded={results.length > 0}
              aria-controls="palette-results"
              aria-activedescendant={results[active] ? `palette-result-${results[active].id}` : undefined}
              placeholder="Appointment ID or patient name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={onKeyDown}
              className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            />
          </div>

          <div aria-live="polite" className="max-h-[50vh] overflow-y-auto p-2">
            {status === 'idle' && <p className="px-3 py-6 text-center text-sm text-muted">Type at least two characters.</p>}
            {status === 'loading' && <p className="px-3 py-6 text-center text-sm text-muted">Searching…</p>}
            {status === 'error' && <p className="px-3 py-6 text-center text-sm text-danger">The search failed. Please try again.</p>}
            {status === 'done' && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted">No appointment matches “{query}”.</p>
            )}
            {results.length > 0 && (
              <ul id="palette-results" role="listbox" aria-label="Appointments">
                {results.map((appointment, index) => (
                  <li
                    key={appointment.id}
                    id={`palette-result-${appointment.id}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(appointment)}
                    className={cn(
                      'flex cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-button px-3 py-2.5',
                      index === active && 'bg-sunken',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-sm font-semibold">{appointment.appointmentId}</span>
                      <span className="block truncate text-sm text-muted">
                        {appointment.patientName} · {appointment.doctorName} · {formatDateTime(appointment.date, appointment.time)}
                      </span>
                    </span>
                    <StatusPill status={appointment.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
