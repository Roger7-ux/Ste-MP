import { BellRing } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/Button.jsx';
import { Dialog } from '../components/ui/overlays.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { announceOnce } from '../utils/announce.js';
import { tokenLabel } from '../utils/constants.js';

// Watches appointments as they refresh and alerts the patient at the moments
// that matter: a pop-up and a spoken announcement (English, then Hindi) when
// they are called, and a toast when they become
// next or when an emergency is put ahead of them. Nothing fires on first load,
// only on a change. Returns the pop-up element to render.
export function useQueueAlerts(appointments) {
  const toast = useToast();
  const previous = useRef(new Map());
  const [called, setCalled] = useState(null);

  useEffect(() => {
    for (const appointment of appointments) {
      const key = appointment.appointmentId;
      const before = previous.current.get(key);
      if (before) {
        const becameNext = appointment.queue?.isNext && !before.queue?.isNext;
        const emergencyArrived = appointment.queue?.emergencyAhead && !before.queue?.emergencyAhead;
        if (appointment.status === 'CALLED' && before.status !== 'CALLED') {
          if (announceOnce(appointment)) setCalled(appointment);
        } else if (appointment.status === 'WAITING' && becameNext) {
          toast.success(`You're next for ${appointment.doctorName}. Please stay close to the waiting area.`, { duration: 9000 });
        } else if (appointment.status === 'WAITING' && emergencyArrived) {
          toast.show({
            tone: 'error',
            message: 'An emergency case has been put ahead of the queue. Your wait has been re-estimated.',
            duration: 9000,
          });
        }
      }
      previous.current.set(key, appointment);
    }
  }, [appointments, toast]);

  const dialog = (
    <Dialog
      open={Boolean(called)}
      onOpenChange={(open) => !open && setCalled(null)}
      title="It’s your turn"
      description={called ? `${called.doctorName} is ready to see you.` : ''}
    >
      {called && (
        <div className="mt-5 flex flex-col items-center text-center">
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
            <span aria-hidden="true" className="absolute inset-0 animate-pulse-ring rounded-full bg-primary" />
            <motion.span
              animate={{ rotate: [0, -14, 12, -8, 6, 0] }}
              transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.2 }}
              className="relative"
            >
              <BellRing aria-hidden="true" className="h-7 w-7" />
            </motion.span>
          </span>
          <p className="mt-4 font-display text-3xl">{called.room ? `Room ${called.room}` : 'Please go in'}</p>
          <p className="mt-1 font-mono text-sm font-semibold">
            {called.tokenNumber ? `${tokenLabel(called.tokenNumber)} · ` : ''}
            {called.appointmentId}
          </p>
          <Button className="mt-6 w-full" onClick={() => setCalled(null)}>
            On my way
          </Button>
        </div>
      )}
    </Dialog>
  );

  return dialog;
}
