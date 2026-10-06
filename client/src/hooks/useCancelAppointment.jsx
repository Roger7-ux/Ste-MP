import { useState } from 'react';
import { ConfirmDialog } from '../components/ui/overlays.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { formatDateTime } from '../utils/format.js';

// Cancelling one of the patient's own appointments, behind a confirmation.
// Returns `askToCancel(appointment)` and the dialog element to render.
export function useCancelAppointment(onCancelled) {
  const toast = useToast();
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setLoading(true);
    setError('');
    try {
      const result = await api.post(`/appointments/${target.id}/cancel`);
      toast.success(`Appointment ${target.appointmentId} was cancelled.`);
      setTarget(null);
      onCancelled(result.appointment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const dialog = (
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open && !loading) {
          setTarget(null);
          setError('');
        }
      }}
      title="Cancel this appointment?"
      description={
        target
          ? `${target.doctorName}, ${formatDateTime(target.date, target.time)}. The time will be offered to other patients, and this cannot be undone.`
          : ''
      }
      confirmLabel="Cancel appointment"
      cancelLabel="Keep appointment"
      destructive
      loading={loading}
      error={error}
      onConfirm={confirm}
    />
  );

  return { askToCancel: setTarget, dialog };
}
