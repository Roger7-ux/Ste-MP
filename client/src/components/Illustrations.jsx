// Drawn placeholders used until the clinic supplies photographs. They use the
// theme colours, so they follow light and dark mode.
//
// TODO: replace with real photographs (WebP or AVIF, with srcset).
import { cn } from '../utils/cn.js';

// A sunlit waiting room with plants.
export function WaitingRoomArt({ className }) {
  return (
    <svg
      viewBox="0 0 520 440"
      role="img"
      aria-label="Illustration of a sunlit waiting room with plants"
      className={cn('h-full w-full', className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="520" height="440" fill="var(--icon-chip)" />
      <rect y="330" width="520" height="110" fill="var(--border)" />
      <rect y="326" width="520" height="6" fill="var(--border-strong)" opacity="0.6" />

      {/* Arched window with the sun */}
      <path d="M150 300V150a90 90 0 0 1 180 0v150z" fill="var(--surface)" />
      <circle cx="268" cy="170" r="44" fill="var(--accent)" opacity="0.28" />
      <circle cx="268" cy="170" r="26" fill="var(--accent)" opacity="0.45" />
      <path d="M240 300V60M150 190h180" stroke="var(--border-strong)" strokeWidth="5" />
      <path d="M150 300V150a90 90 0 0 1 180 0v150" fill="none" stroke="var(--border-strong)" strokeWidth="6" />
      <path d="M120 430 L150 300 H330 L400 430z" fill="var(--surface)" opacity="0.35" />

      {/* Tall plant on the left */}
      <g>
        <path d="M78 330c-2-60 4-110 10-150" stroke="var(--primary)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M86 210c-34-10-52-36-54-66 30 4 52 26 54 66z" fill="var(--primary)" />
        <path d="M88 190c30-18 42-48 38-78-28 12-42 40-38 78z" fill="var(--primary-hover)" />
        <path d="M82 262c-36 2-58-18-68-44 30-4 56 12 68 44z" fill="var(--primary-hover)" />
        <path d="M84 250c32-4 52-26 58-52-30 2-52 22-58 52z" fill="var(--primary)" />
        <path d="M56 330h46l-6 62H62z" fill="var(--accent)" opacity="0.85" />
      </g>

      {/* Bench */}
      <g>
        <rect x="350" y="268" width="140" height="46" rx="12" fill="var(--primary)" opacity="0.9" />
        <rect x="342" y="306" width="156" height="26" rx="10" fill="var(--primary-hover)" />
        <path d="M358 332v40M482 332v40" stroke="var(--foreground)" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
        <rect x="372" y="278" width="40" height="30" rx="8" fill="var(--surface)" opacity="0.9" />
      </g>

      {/* Small plant and frame */}
      <g>
        <rect x="392" y="120" width="76" height="92" rx="6" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="4" />
        <path d="M408 190c10-30 22-40 30-30s4 20 14 12" stroke="var(--primary)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M228 330c-10-26-4-44 10-54 8 18 4 38-10 54z" fill="var(--primary)" />
        <path d="M232 330c14-20 30-24 44-18-8 16-24 22-44 18z" fill="var(--primary-hover)" />
        <path d="M214 330h40l-5 34h-30z" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="3" />
      </g>
    </svg>
  );
}

// A stylised street map with a pin. Not a real map of any place.
export function MapArt({ className }) {
  return (
    <svg
      viewBox="0 0 480 300"
      role="img"
      aria-label="Placeholder map; the clinic's real location is to be added"
      className={cn('h-full w-full', className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="480" height="300" fill="var(--surface-sunken)" />
      <path d="M-10 90h500M-10 210h500M110-10v320M330-10v320" stroke="var(--surface)" strokeWidth="26" />
      <path d="M-10 250 200 20M260 310 500 60" stroke="var(--surface)" strokeWidth="16" />
      <rect x="140" y="112" width="160" height="76" rx="10" fill="var(--icon-chip)" />
      <rect x="352" y="232" width="110" height="52" rx="10" fill="var(--icon-chip)" opacity="0.7" />
      <circle cx="240" cy="134" r="46" fill="var(--primary)" opacity="0.14" />
      <path d="M240 96c-19 0-34 15-34 33 0 24 34 55 34 55s34-31 34-55c0-18-15-33-34-33z" fill="var(--primary)" />
      <circle cx="240" cy="129" r="12" fill="var(--surface)" />
    </svg>
  );
}

// A neutral tile standing in for a photograph.
export function PhotoPlaceholder({ label, className }) {
  return (
    <div
      className={cn(
        'dot-grid grid place-items-center rounded-card border border-dashed border-border-strong bg-sunken text-center text-sm text-muted',
        className,
      )}
    >
      <span className="rounded-full bg-surface px-3 py-1.5">Photo to be added: {label}</span>
    </div>
  );
}
