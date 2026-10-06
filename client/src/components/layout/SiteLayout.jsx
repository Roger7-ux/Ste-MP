import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { Suspense, useContext, useEffect, useRef, useState } from 'react';
import { UNSAFE_LocationContext as LocationContext, useLocation, useOutlet } from 'react-router-dom';
import CallWatcher from '../CallWatchers.jsx';
import { EASE } from '../motion.jsx';
import Splash from '../Splash.jsx';
import { LoadingLabel, Skeleton } from '../ui/primitives.jsx';
import Footer from './Footer.jsx';
import Header from './Header.jsx';

// Holds on to the page that was current when it mounted, so the outgoing page
// keeps rendering while it fades out. While it is leaving, it also keeps
// seeing its own address rather than the new one; otherwise a page that
// redirects based on the address could redirect a second time on its way out.
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  const isPresent = useIsPresent();
  const location = useContext(LocationContext);
  const lastLocation = useRef(location);
  if (isPresent) lastLocation.current = location;
  return <LocationContext.Provider value={lastLocation.current}>{frozen}</LocationContext.Provider>;
}

function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <LoadingLabel />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-5 w-96 max-w-full" />
      <Skeleton className="mt-10 h-64 w-full rounded-card" />
    </div>
  );
}

// The shell around every page except the waiting-room screen: a header that
// stays put, a page area that fades and slides between routes, and the footer.
export default function SiteLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Splash />
      <CallWatcher />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast) focus:rounded-button focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex-1"
        >
          <Suspense fallback={<PageFallback />}>
            <FrozenOutlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
