import { Stethoscope, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { api } from '../services/api.js';
import { announceOnce, markAnnounced } from '../utils/announce.js';
import { REFRESH_MS, SITE_NAME, tokenLabel } from '../utils/constants.js';
import { formatDateLong, todayDate } from '../utils/format.js';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function RoomCard({ room }) {
  const serving = room.nowServing[0];
  return (
    // A size container: the "now serving" ID scales with the card's width.
    <section className="@container flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-border bg-surface p-5 sm:p-6 xl:p-8" aria-label={`Room ${room.room || room.doctorName}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-3xl xl:text-4xl">{room.room ? `Room ${room.room}` : room.doctorName}</h2>
        <p className="truncate text-lg text-muted">{room.room ? room.doctorName : room.specialization}</p>
      </div>

      <p className="mt-6 text-sm font-semibold tracking-[0.2em] text-muted uppercase">Now serving</p>
      <div className="relative mt-2 min-h-[5.5rem]">
        <AnimatePresence mode="popLayout" initial={false}>
          {serving ? (
            // A newly called number arrives with a gentle highlight.
            <motion.p
              key={serving.appointmentId}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative inline-block rounded-2xl bg-primary px-4 py-3 font-mono text-[clamp(1.25rem,8.5cqw,3.5rem)] font-bold whitespace-nowrap text-primary-foreground"
            >
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 1.25 }}
                transition={{ duration: 1.6, ease: 'easeOut' }}
                className="absolute inset-0 rounded-2xl bg-primary"
              />
              <span className="relative">{serving.appointmentId}</span>
              {serving.tokenNumber && (
                <span className="relative ml-3 border-l border-primary-foreground/40 pl-3 font-sans text-[0.55em] font-semibold">
                  {tokenLabel(serving.tokenNumber)}
                </span>
              )}
            </motion.p>
          ) : (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-3 text-3xl text-muted">
              Please wait
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-6 text-sm font-semibold tracking-[0.2em] text-muted uppercase">Next</p>
      {room.next.length > 0 ? (
        <ol className="mt-2 flex flex-wrap gap-3">
          {room.next.map((item) => (
            <li key={item.appointmentId} className="rounded-xl border border-border-strong px-4 py-2 font-mono text-2xl font-semibold xl:text-3xl">
              {item.appointmentId}
              {item.tokenNumber && <span className="ml-2 font-sans text-base font-medium text-muted">{tokenLabel(item.tokenNumber)}</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xl text-muted">Nobody waiting</p>
      )}
    </section>
  );
}

// Full-screen board for a waiting-room TV. High contrast, large type, and
// appointment IDs and queue numbers only, never patient names. It refreshes
// every few seconds and, once sound is switched on, announces each newly
// called patient in English and then Hindi.
export default function Display() {
  usePageMeta('Now serving');
  const clock = useClock();
  const { data, error } = useFetch(() => api.get('/display'), [], { pollMs: REFRESH_MS.display });
  const rooms = data?.rooms || [];
  const [sound, setSound] = useState(false);

  // Announce each call the first time it shows up. Calls made before the
  // screen opened, or while its sound was off, are not read out afterwards.
  const loaded = useRef(false);
  useEffect(() => {
    if (!data) return;
    for (const call of data.calls) {
      if (!loaded.current || !sound) markAnnounced(call);
      else announceOnce(call);
    }
    loaded.current = true;
  }, [data, sound]);

  return (
    <div data-theme="dark" className="flex min-h-dvh flex-col bg-background p-4 text-foreground sm:p-6 xl:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-3 font-display text-3xl font-semibold xl:text-4xl">
          <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Stethoscope className="h-7 w-7" strokeWidth={1.75} />
          </span>
          {SITE_NAME}
        </p>
        <div className="flex items-center gap-5">
          {/* Browsers only play sound after a click, so the screen asks once. */}
          <button
            type="button"
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-semibold transition-colors duration-150 hover:bg-sunken"
          >
            {sound ? <Volume2 aria-hidden="true" className="h-4 w-4" /> : <VolumeX aria-hidden="true" className="h-4 w-4" />}
            {sound ? 'Announcements on' : 'Turn on announcements'}
          </button>
          <p className="text-right">
            <span className="block font-display text-4xl tabular-nums xl:text-5xl">{clock}</span>
            <span className="text-lg text-muted">{formatDateLong(todayDate())}</span>
          </p>
        </div>
      </header>

      <h1 className="sr-only">Now serving</h1>

      <main aria-live="polite" className="mt-8 flex-1">
        {error && !data ? (
          <p className="pt-24 text-center text-2xl text-muted">The board cannot reach the clinic system. Retrying…</p>
        ) : rooms.length === 0 ? (
          <div className="grid h-full place-items-center pt-24 text-center">
            <div>
              <p className="font-display text-5xl xl:text-6xl">{data ? 'Welcome' : 'Loading…'}</p>
              {data && <p className="mt-4 text-2xl text-muted">Please check in at the front desk. Your number will appear here.</p>}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.doctorId} room={room} />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-8 text-center text-lg text-muted">Watch for your appointment ID. It starts with your doctor’s initials.</footer>
    </div>
  );
}
