import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { REASON_MAX_LENGTH } from '../../utils/constants.js';
import { Button } from '../ui/Button.jsx';
import { Field, SegmentedControl, SelectField, TextareaField } from '../ui/forms.jsx';
import { Dialog } from '../ui/overlays.jsx';
import { Alert } from '../ui/primitives.jsx';
import { useToast } from '../ui/Toast.jsx';

const EMPTY = { name: '', doctorId: '', reason: '', priority: 'NORMAL' };

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'EMERGENCY', label: 'Emergency' },
];

// Issues a token to a patient who has arrived without a booking. They are
// checked in at once: at the end of the chosen doctor's queue, or at the front
// when marked as an emergency.
export default function WalkInDialog({ open, onOpenChange, doctors, defaultDoctorId, onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Start fresh each time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, doctorId: defaultDoctorId || '' });
      setErrors({});
      setFormError('');
    }
  }, [open, defaultDoctorId]);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const found = {};
    if (!form.name.trim()) found.name = 'Patient name is required.';
    if (!form.doctorId) found.doctorId = 'Select a doctor.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const result = await api.post('/staff/walk-ins', { ...form, doctorId: Number(form.doctorId) });
      const { appointment } = result;
      toast.success(
        emergency
          ? `${appointment.appointmentId} added as an emergency, first in line for ${appointment.doctorName}.`
          : `Token ${appointment.tokenNumber} issued to ${appointment.patientName} for ${appointment.doctorName}.`,
      );
      onAdded(result.appointment);
      onOpenChange(false);
    } catch (err) {
      const fieldErrors = err.errors || {};
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : err.message);
    } finally {
      setSaving(false);
    }
  }

  const emergency = form.priority === 'EMERGENCY';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title="Token for a walk-in patient"
      description={
        emergency
          ? 'For a patient who needs to be seen urgently and has no booking. They go straight to the front of the doctor’s queue.'
          : 'For a patient at the desk who has no booking. They get the next queue number and join the doctor’s queue.'
      }
    >
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <Alert>{formError}</Alert>
        <SegmentedControl label="Priority" options={PRIORITIES} value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
        <Field label="Patient name" value={form.name} onChange={update('name')} error={errors.name} />
        <SelectField label="Doctor" value={form.doctorId} onChange={update('doctorId')} error={errors.doctorId}>
          <option value="">Select a doctor…</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} ({doctor.specialization})
            </option>
          ))}
        </SelectField>
        <TextareaField
          label="Reason"
          optional
          rows={2}
          maxLength={REASON_MAX_LENGTH}
          value={form.reason}
          onChange={update('reason')}
          error={errors.reason}
        />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant={emergency ? 'destructive' : 'primary'} loading={saving}>
            {emergency ? 'Add to front of queue' : 'Generate token'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
