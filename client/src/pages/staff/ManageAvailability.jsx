import { CalendarPlus, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, PageHeader } from '../../components/Page.jsx';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import { Field, SelectField } from '../../components/ui/forms.jsx';
import { Alert, Badge, Card, EmptyState, ErrorState, LoadingLabel, Skeleton } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { summariseHours, useClinic } from '../../hooks/useClinic.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { api } from '../../services/api.js';
import { formatDate, formatDateTime, todayDate } from '../../utils/format.js';
import { validateSlot } from '../../utils/validation.js';

// Date, start and end inputs, used to add a slot and to edit one.
function SlotForm({ initial, submitLabel, onSave, onCancel, keepDateAfterSave = false }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const found = validateSlot(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSave(form);
      // Keep the date so several slots can be added for the same day.
      if (keepDateAfterSave) setForm({ date: form.date, startTime: '', endTime: '' });
    } catch (err) {
      const fieldErrors = err.errors || {};
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Alert className="mb-3">{formError}</Alert>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" type="date" min={todayDate()} value={form.date} onChange={update('date')} error={errors.date} />
        <Field label="Start time" type="time" value={form.startTime} onChange={update('startTime')} error={errors.startTime} />
        <Field label="End time" optional type="time" value={form.endTime} onChange={update('endTime')} error={errors.endTime} hint="Blank means 30 minutes." />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function groupByDate(slots) {
  const groups = new Map();
  for (const slot of slots) {
    if (!groups.has(slot.date)) groups.set(slot.date, []);
    groups.get(slot.date).push(slot);
  }
  return [...groups.entries()];
}

function SlotGroups({ groups, editingId, setEditingId, onSave, onRemove, removingId }) {
  return (
    <div className="space-y-4">
      {groups.map(([date, daySlots]) => (
        <Card as="section" key={date} className="p-4 sm:p-5">
          <h3 className="text-lg">{formatDate(date)}</h3>
          <ul className="mt-2 divide-y divide-border">
            {daySlots.map((slot) => {
              const booked = slot.status === 'BOOKED';
              return (
                <li key={slot.id} className="py-3">
                  {editingId === slot.id ? (
                    <SlotForm
                      initial={{ date: slot.date, startTime: slot.startTime, endTime: slot.endTime }}
                      submitLabel="Save changes"
                      onSave={(values) => onSave(slot.id, values)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums">
                          {slot.startTime}–{slot.endTime}
                        </span>
                        <Badge tone={booked ? 'neutral' : 'primary'}>{booked ? 'Booked' : 'Available'}</Badge>
                        {slot.isPast && <span className="text-xs text-muted">Past</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Booked slots cannot be edited or removed; the server enforces this too. */}
                        <Button variant="secondary" size="sm" disabled={booked} title={booked ? 'Booked slots cannot be edited.' : undefined} onClick={() => setEditingId(slot.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={booked}
                          loading={removingId === slot.id}
                          title={booked ? 'Booked slots cannot be removed.' : undefined}
                          onClick={() => onRemove(slot)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export default function ManageAvailability() {
  usePageMeta('Availability');
  const toast = useToast();
  const { clinic } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const doctorId = searchParams.get('doctor') || '';

  const doctors = useFetch(() => api.get('/staff/doctors'), []);
  const slots = useFetch(
    () => (doctorId ? api.get(`/staff/doctors/${doctorId}/slots`) : Promise.resolve(null)),
    [doctorId],
  );
  const [editingId, setEditingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  async function addSlot(values) {
    const result = await api.post(`/staff/doctors/${doctorId}/slots`, values);
    toast.success(`Slot added for ${formatDateTime(result.slot.date, result.slot.startTime)}.`);
    slots.reload();
  }

  async function saveSlot(id, values) {
    const result = await api.patch(`/staff/slots/${id}`, values);
    toast.success(`Slot moved to ${formatDateTime(result.slot.date, result.slot.startTime)}.`);
    setEditingId(null);
    slots.reload();
  }

  async function removeSlot(slot) {
    setRemovingId(slot.id);
    try {
      await api.delete(`/staff/slots/${slot.id}`);
      toast.success(`Slot for ${formatDateTime(slot.date, slot.startTime)} was removed.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRemovingId(null);
      slots.reload();
    }
  }

  const header = (
    <PageHeader
      eyebrow="Front desk"
      title="Availability"
      subtitle={
        clinic
          ? `Slots must fall within opening hours: ${summariseHours(clinic.hours).map((group) => `${group.days} ${group.text}`).join(', ')}.`
          : 'Add and manage each doctor’s time slots.'
      }
    />
  );

  if (doctors.loading && !doctors.data) {
    return (
      <Page>
        {header}
        <LoadingLabel />
        <Skeleton className="h-11 w-72" />
        <Skeleton className="mt-6 h-48 w-full rounded-card" />
      </Page>
    );
  }
  if (doctors.error) {
    return (
      <Page>
        {header}
        <ErrorState error={doctors.error} onRetry={doctors.reload} />
      </Page>
    );
  }

  const doctorList = doctors.data.doctors;
  if (doctorList.length === 0) {
    return (
      <Page>
        {header}
        <EmptyState icon={Stethoscope} title="No doctors added yet" action={<LinkButton to="/staff/doctors">Go to Doctors</LinkButton>}>
          Add a doctor before adding time slots.
        </EmptyState>
      </Page>
    );
  }

  const today = todayDate();
  const allSlots = slots.data?.slots || [];
  const upcoming = groupByDate(allSlots.filter((slot) => slot.date >= today));
  const past = groupByDate(allSlots.filter((slot) => slot.date < today));
  const groupProps = { editingId, setEditingId, onSave: saveSlot, onRemove: removeSlot, removingId };

  return (
    <Page>
      {header}

      <SelectField
        label="Doctor"
        className="mb-6 max-w-sm"
        value={doctorId}
        onChange={(event) => {
          setEditingId(null);
          setSearchParams(event.target.value ? { doctor: event.target.value } : {});
        }}
      >
        <option value="">Select a doctor…</option>
        {doctorList.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.name} ({doctor.specialization})
          </option>
        ))}
      </SelectField>

      {!doctorId ? (
        <EmptyState icon={CalendarPlus} title="Select a doctor">
          Choose a doctor above to see and add their time slots.
        </EmptyState>
      ) : slots.loading && !slots.data ? (
        <>
          <LoadingLabel />
          <Skeleton className="h-48 w-full rounded-card" />
        </>
      ) : slots.error ? (
        slots.error.status === 404 ? (
          <EmptyState icon={Stethoscope} title="Doctor not found" />
        ) : (
          <ErrorState error={slots.error} onRetry={slots.reload} />
        )
      ) : (
        <>
          <Card className="mb-8 p-5 sm:p-6">
            <h2 className="mb-4 text-2xl">Add a slot</h2>
            {/* Keyed by doctor so the form resets when another doctor is chosen. */}
            <SlotForm key={doctorId} initial={{ date: '', startTime: '', endTime: '' }} submitLabel="Add slot" onSave={addSlot} keepDateAfterSave />
          </Card>

          <h2 className="mb-4 text-2xl">Slots</h2>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarPlus} title="No upcoming slots">
              Add a slot above and patients will be able to book it.
            </EmptyState>
          ) : (
            <SlotGroups groups={upcoming} {...groupProps} />
          )}
          {past.length > 0 && (
            <details className="mt-6">
              <summary className="min-h-9 cursor-pointer text-sm font-semibold">Past dates ({past.length})</summary>
              <div className="mt-3">
                <SlotGroups groups={past} {...groupProps} />
              </div>
            </details>
          )}
        </>
      )}
    </Page>
  );
}
