import { Stethoscope } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { SITE_NAME } from '../utils/constants.js';
import { EASE } from './motion.jsx';

const SEEN_KEY = 'clinic_intro_seen';
const TAGLINE = 'Wait at home, not in the waiting room.';

function alreadySeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

// The opening animation: the logo draws in, the name rises letter by letter,
// then the curtain lifts to reveal the page. It plays once per browser
// session, takes under two seconds, and is skipped for visitors who prefer
// reduced motion. The page underneath is already loaded and usable.
export default function Splash() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(() => !alreadySeen());

  useEffect(() => {
    if (!visible) return undefined;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Without storage it simply plays again on the next visit.
    }
    const timer = setTimeout(() => setVisible(false), reduced ? 0 : 1700);
    return () => clearTimeout(timer);
  }, [visible, reduced]);

  if (reduced) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          aria-hidden="true"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-(--z-toast) grid place-items-center bg-primary text-primary-foreground"
        >
          <div className="dot-grid absolute inset-0 opacity-15" />
          <div className="relative flex flex-col items-center px-6 text-center">
            <motion.span
              initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="relative grid h-20 w-20 place-items-center rounded-[22px] bg-primary-foreground text-primary"
            >
              <motion.span
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.25 }}
                className="absolute inset-0 rounded-[22px] bg-primary-foreground"
              />
              <Stethoscope className="relative h-10 w-10" strokeWidth={1.75} />
            </motion.span>

            <p className="mt-6 flex overflow-hidden font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              {SITE_NAME.split('').map((letter, index) => (
                <motion.span
                  key={index}
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.3 + index * 0.035 }}
                  className="inline-block whitespace-pre"
                >
                  {letter}
                </motion.span>
              ))}
            </p>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.9, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.85 }}
              className="mt-3 text-lg"
            >
              {TAGLINE}
            </motion.p>

            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.4 }}
              className="mt-6 h-0.5 w-40 origin-left rounded-full bg-primary-foreground/70"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
