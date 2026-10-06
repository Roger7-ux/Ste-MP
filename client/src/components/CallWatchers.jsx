import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useQueueAlerts } from '../hooks/useQueueAlerts.jsx';
import { api } from '../services/api.js';
import { announceEnabled, announceOnce, markAnnounced } from '../utils/announce.js';
import { tokenLabel } from '../utils/constants.js';
import { useToast } from './ui/Toast.jsx';

const STAFF_CHECK_MS = 5000;
const PATIENT_CHECK_MS = 8000;

// Runs `check` now and then on a timer. Unlike the page data hooks it keeps
// going while the tab is in the background, so a call is still heard when the
// browser is behind another window.
function useBackgroundCheck(check, everyMs) {
  const latest = useRef(check);
  latest.current = check;
  useEffect(() => {
    let stopped = false;
    const run = () => {
      if (!stopped) latest.current();
    };
    run();
    const timer = setInterval(run, everyMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [everyMs]);
}

// Front desk: hears every call a doctor makes, on whichever staff page is
// open. It shows who was called and reads the call aloud when announcements
// are switched on (the switch is on the dashboard).
function StaffCallWatcher() {
  const toast = useToast();
  const loaded = useRef(false);

  useBackgroundCheck(async () => {
    let board;
    try {
      board = await api.get('/display');
    } catch {
      return; // Try again on the next tick.
    }
    for (const call of board.calls) {
      // A call already made when the page opened is not repeated.
      if (!loaded.current) markAnnounced(call);
      else if (announceOnce(call, { speak: announceEnabled() })) {
        toast.success(`${call.doctorName} called ${tokenLabel(call.tokenNumber) || call.appointmentId}.`, { duration: 9000 });
      }
    }
    loaded.current = true;
  }, STAFF_CHECK_MS);

  return null;
}

// Patient: follows their own appointments on every page of the site, so the
// "It's your turn" pop-up and the spoken call arrive wherever they are.
function PatientCallWatcher() {
  const [appointments, setAppointments] = useState([]);

  useBackgroundCheck(async () => {
    try {
      setAppointments((await api.get('/appointments')).appointments);
    } catch {
      // Keep the last known state and try again on the next tick.
    }
  }, PATIENT_CHECK_MS);

  return useQueueAlerts(appointments);
}

// Mounted once in the site layout, for whoever is signed in.
export default function CallWatcher() {
  const { user } = useAuth();
  if (user?.role === 'STAFF') return <StaffCallWatcher />;
  if (user?.role === 'PATIENT') return <PatientCallWatcher />;
  return null;
}
