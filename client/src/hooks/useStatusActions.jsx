import { useCallback, useState } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { announceEnabled, announceOnce } from '../utils/announce.js';
import { STATUS_META } from '../utils/constants.js';

// Staff status changes with an Undo toast. `apply(updated)` puts a changed
// appointment into the screen's data; `refresh()` reloads from the server.
// The change is shown at once (optimistically) and corrected if it fails.
export function useStatusActions({ apply, refresh }) {
  const toast = useToast();
  const [pendingId, setPendingId] = useState(null);

  const undo = useCallback(
    async (appointment) => {
      try {
        const result = await api.post(`/staff/appointments/${appointment.id}/undo`);
        apply(result.appointment);
        toast.success(`${appointment.appointmentId} is back to ${STATUS_META[result.appointment.status].label}.`);
      } catch (err) {
        toast.error(err.message);
      }
      refresh();
    },
    [apply, refresh, toast],
  );

  const changeStatus = useCallback(
    async (appointment, status) => {
      setPendingId(appointment.id);
      apply({ ...appointment, status, queue: null, allowedNextStatuses: [] });
      try {
        const result = await api.patch(`/staff/appointments/${appointment.id}/status`, { status });
        apply(result.appointment);
        // The front desk's call is read aloud, in English and then Hindi.
        if (status === 'CALLED') announceOnce(result.appointment, { speak: announceEnabled() });
        toast.show({
          message: `${appointment.appointmentId} · ${appointment.patientName} is now ${STATUS_META[status].label}.`,
          action: { label: 'Undo', onClick: () => undo(result.appointment) },
          duration: 8000,
        });
      } catch (err) {
        apply(appointment);
        toast.error(err.message);
      } finally {
        setPendingId(null);
        refresh();
      }
    },
    [apply, refresh, toast, undo],
  );

  // Marks an appointment as an emergency, or clears the mark.
  const setPriority = useCallback(
    async (appointment, priority) => {
      setPendingId(appointment.id);
      apply({ ...appointment, priority });
      try {
        const result = await api.patch(`/staff/appointments/${appointment.id}/priority`, { priority });
        apply(result.appointment);
        toast.success(
          priority === 'EMERGENCY'
            ? `${appointment.appointmentId} is now an emergency and moves to the front of the queue.`
            : `${appointment.appointmentId} is back to normal priority.`,
        );
      } catch (err) {
        apply(appointment);
        toast.error(err.message);
      } finally {
        setPendingId(null);
        refresh();
      }
    },
    [apply, refresh, toast],
  );

  // Puts a patient who was marked as not arrived back in the waiting queue,
  // in the place they had.
  const restore = useCallback(
    async (appointment) => {
      setPendingId(appointment.id);
      try {
        const result = await api.post('/staff/restore-token', { appointmentId: appointment.id });
        apply(result.appointment);
        toast.success(`${appointment.appointmentId} · ${appointment.patientName} is back in the waiting queue.`);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setPendingId(null);
        refresh();
      }
    },
    [apply, refresh, toast],
  );

  return { changeStatus, undo, setPriority, restore, pendingId };
}
