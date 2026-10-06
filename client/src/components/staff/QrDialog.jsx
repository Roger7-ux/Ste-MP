import { motion } from 'motion/react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { EASE } from '../motion.jsx';
import { Button } from '../ui/Button.jsx';
import { SelectField } from '../ui/forms.jsx';
import { Dialog } from '../ui/overlays.jsx';
import { Alert } from '../ui/primitives.jsx';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

// On-site booking by QR code. Staff choose a doctor; the code that appears is
// scanned by the patient, who confirms on their own phone and joins that
// doctor's queue for today with the next queue number. Each code works once.
export default function QrDialog({ open, onOpenChange, doctors, defaultDoctorId }) {
  const [doctorId, setDoctorId] = useState('');
  const [made, setMade] = useState(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Start fresh each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDoctorId(defaultDoctorId || '');
      setMade(null);
      setImage('');
      setError('');
    }
  }, [open, defaultDoctorId]);

  const url = made ? `${window.location.origin}${made.bookingPath}` : '';

  async function generate(event) {
    event?.preventDefault();
    if (!doctorId) {
      setError('Select a doctor.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const result = await api.post('/staff/generate-qr-token', { doctorId: Number(doctorId) });
      setImage(await QRCode.toDataURL(`${window.location.origin}${result.bookingPath}`, { width: 560, margin: 1 }));
      setMade(result);
    } catch (err) {
      setError(err.errors?.doctorId || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title={made ? `Scan to join ${made.doctor.name}’s queue` : 'QR code for on-site booking'}
      description={
        made
          ? 'Ask the patient to scan this with their phone camera and confirm. They join the queue at once.'
          : 'Shows a one-time QR code. The patient scans it and books themselves into the doctor’s queue for today.'
      }
    >
      {made ? (
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="grid aspect-square w-full max-w-[280px] place-items-center rounded-card border border-border bg-white p-3">
            <motion.img
              key={made.code}
              src={image}
              alt={`QR code to join the queue for ${made.doctor.name}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="h-full w-full"
            />
          </div>
          <p className="mt-4 font-display text-xl">{made.doctor.name}</p>
          <p className="mt-1 text-xs break-all text-muted">{url}</p>
          {LOCAL_HOSTS.includes(window.location.hostname) && (
            <Alert tone="info" className="mt-4 w-full text-left">
              This page is open on “{window.location.hostname}”, which a phone cannot reach. To scan from a phone, start
              the server with HOST=0.0.0.0 and open this page using the computer’s network address.
            </Alert>
          )}
          <Alert className="mt-4 w-full text-left">{error}</Alert>
          <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row">
            <Button variant="secondary" className="flex-1" loading={saving} onClick={() => generate()}>
              Next patient
            </Button>
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={generate} noValidate className="mt-4 space-y-4">
          <SelectField label="Doctor" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} error={error}>
            <option value="">Select a doctor…</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} ({doctor.specialization})
              </option>
            ))}
          </SelectField>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Generate QR code
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
