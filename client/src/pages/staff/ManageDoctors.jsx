import { CalendarDays, Pencil, Plus, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Page, PageHeader } from '../../components/Page.jsx';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import { Field, SelectField, TextareaField } from '../../components/ui/forms.jsx';
import { Dialog } from '../../components/ui/overlays.jsx';
import { Alert, Avatar, Card, EmptyState, ErrorState, Eyebrow, LoadingLabel, Skeleton } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { SPECIALTY_NAMES } from '../../utils/constants.js';
import { formatFee } from '../../utils/format.js';
import { validateDoctor } from '../../utils/validation.js';

const EMPTY = {
  name: '',
  specialization: '',
  consultationFee: '',
  room: '',
  yearsExperience: '',
  languages: '',
  description: '',
  bio: '',
  photoUrl: '',
};

const toForm = (doctor) => ({
  name: doctor.name,
  specialization: doctor.specialization,
  consultationFee: String(doctor.consultationFee),
  room: doctor.room,
  yearsExperience: doctor.yearsExperience === null ? '' : String(doctor.yearsExperience),
  languages: doctor.languages.join(', '),
  description: doctor.description,
  bio: doctor.bio,
  photoUrl: doctor.photoUrl || '',
});

// Add or edit a doctor. Name, specialty and fee are required; the rest fills
// out the doctor's public profile.
function DoctorForm({ initial, submitLabel, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const found = validateDoctor(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      const fieldErrors = err.errors || {};
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
      <Alert>{formError}</Alert>
      <Field label="Doctor name" value={form.name} onChange={update('name')} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Specialty" value={form.specialization} onChange={update('specialization')} error={errors.specialization}>
          <option value="">Select…</option>
          {SPECIALTY_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectField>
        <Field label="Consultation fee (₹)" inputMode="decimal" value={form.consultationFee} onChange={update('consultationFee')} error={errors.consultationFee} />
        <Field label="Room" optional value={form.room} onChange={update('room')} error={errors.room} />
        <Field label="Years of experience" optional inputMode="numeric" value={form.yearsExperience} onChange={update('yearsExperience')} error={errors.yearsExperience} />
      </div>
      <Field label="Languages" optional value={form.languages} onChange={update('languages')} error={errors.languages} hint="Separate with commas, for example English, Hindi." />
      <Field label="Short description" optional value={form.description} onChange={update('description')} error={errors.description} hint="One line shown on the doctor’s card." />
      <TextareaField label="Bio" optional rows={4} value={form.bio} onChange={update('bio')} error={errors.bio} />
      <Field label="Photo web address" optional type="url" value={form.photoUrl} onChange={update('photoUrl')} error={errors.photoUrl} hint="Initials are shown when this is empty." />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function ManageDoctors() {
  usePageMeta('Doctors');
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => api.get('/staff/doctors'), []);
  // null: closed; 'new': adding; a doctor object: editing that doctor.
  const [editing, setEditing] = useState(null);
  const doctors = data?.doctors || [];

  async function save(values) {
    const result =
      editing === 'new' ? await api.post('/staff/doctors', values) : await api.patch(`/staff/doctors/${editing.id}`, values);
    toast.success(`${result.doctor.name} was ${editing === 'new' ? 'added' : 'updated'}.`);
    setEditing(null);
    reload();
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Front desk"
        title="Doctors"
        subtitle="Add doctors and keep their details and public profile up to date."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add doctor
          </Button>
        }
      />

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <LoadingLabel>Loading doctors…</LoadingLabel>
          <Skeleton className="h-32 rounded-card" />
          <Skeleton className="h-32 rounded-card" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No doctors added yet" action={<Button onClick={() => setEditing('new')}>Add the first doctor</Button>}>
          Patients can book once a doctor has been added and given time slots.
        </EmptyState>
      ) : (
        <ul className="stagger-rise grid gap-4 md:grid-cols-2">
          {doctors.map((doctor) => (
            <li key={doctor.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start gap-3.5">
                  <Avatar name={doctor.name} src={doctor.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <Eyebrow>{doctor.specialization}</Eyebrow>
                    <h2 className="text-xl leading-snug">{doctor.name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {formatFee(doctor.consultationFee)}
                      {doctor.room && ` · Room ${doctor.room}`} · {doctor.openSlotsThisWeek} open slots this week
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(doctor)}>
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                    Edit
                  </Button>
                  <LinkButton to={`/staff/availability?doctor=${doctor.id}`} variant="secondary" size="sm">
                    <CalendarDays aria-hidden="true" className="h-4 w-4" />
                    Availability
                  </LinkButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === 'new' ? 'Add doctor' : `Edit ${editing?.name || 'doctor'}`}
        className="max-w-xl"
      >
        {editing !== null && (
          <DoctorForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? EMPTY : toForm(editing)}
            submitLabel={editing === 'new' ? 'Add doctor' : 'Save changes'}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>
    </Page>
  );
}
