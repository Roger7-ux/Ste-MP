// Shared motion building blocks. Everything animates only opacity and
// transform. MotionConfig (see main.jsx) switches movement off for visitors who
// prefer reduced motion, leaving simple fades.
import { AnimatePresence, animate, motion, useInView, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn.js';

export const EASE = [0.22, 1, 0.36, 1];

const IN_VIEW = { once: true, margin: '0px 0px -10% 0px' };

// A thin line under the header that fills as the page is scrolled.
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });
  return <motion.div aria-hidden="true" style={{ scaleX }} className="fixed inset-x-0 top-16 z-(--z-header) h-0.5 origin-left bg-primary" />;
}

// Fades and lifts its content in the first time it scrolls into view.
export function Reveal({ as = 'div', delay = 0, className, children, ...props }) {
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={IN_VIEW}
      transition={{ duration: 0.45, ease: EASE, delay }}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
}

const staggerParent = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.05 } },
};

const staggerChild = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

// A group whose children appear one after another as it enters the viewport.
export function Stagger({ as = 'div', className, children, ...props }) {
  const Tag = motion[as];
  return (
    <Tag variants={staggerParent} initial="hidden" whileInView="shown" viewport={IN_VIEW} className={className} {...props}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ as = 'div', className, children, ...props }) {
  const Tag = motion[as];
  return (
    <Tag variants={staggerChild} className={className} {...props}>
      {children}
    </Tag>
  );
}

// Counts up to `value` once, when it first becomes visible.
export function CountUp({ value, suffix = '', className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduced) {
      setShown(value);
      return undefined;
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {shown}
      {suffix}
    </span>
  );
}

// A number that rolls to its new value: up when it rises, down when it falls.
export function RollingNumber({ value, className }) {
  const previous = useRef(value);
  const direction = value >= previous.current ? 1 : -1;
  useEffect(() => {
    previous.current = value;
  }, [value]);

  return (
    <span className={cn('relative inline-flex overflow-hidden tabular-nums', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: `${direction * 60}%`, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: `${direction * -60}%`, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const CONFETTI_COLOURS = ['var(--primary)', 'var(--primary-hover)', 'var(--icon-chip)', 'var(--accent)'];

// A single light burst of confetti in the brand colours. Rendered once; not
// shown at all when reduced motion is on.
export function Confetti({ pieces = 28 }) {
  const reduced = useReducedMotion();
  const [parts] = useState(() =>
    Array.from({ length: pieces }, (_, index) => {
      const angle = (index / pieces) * Math.PI * 2 + Math.random() * 0.4;
      const distance = 90 + Math.random() * 110;
      return {
        id: index,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 40,
        rotate: Math.random() * 540 - 270,
        colour: CONFETTI_COLOURS[index % CONFETTI_COLOURS.length],
        round: index % 3 === 0,
        delay: Math.random() * 0.08,
      };
    }),
  );
  if (reduced) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-10 left-1/2 h-0 w-0">
      {parts.map((part) => (
        <motion.span
          key={part.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: part.x, y: [0, part.y, part.y + 120], opacity: [1, 1, 0], rotate: part.rotate, scale: 1 }}
          transition={{ duration: 1.3, ease: 'easeOut', delay: part.delay }}
          style={{ backgroundColor: part.colour }}
          className={cn('absolute h-2.5 w-1.5', part.round ? 'rounded-full' : 'rounded-[2px]')}
        />
      ))}
    </div>
  );
}

// A tick that draws itself inside a circle.
export function AnimatedCheck({ className }) {
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className={cn('grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground', className)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
        />
      </svg>
    </motion.span>
  );
}
