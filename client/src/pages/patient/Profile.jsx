import { useState } from 'react';
import { Page, PageHeader } from '../../components/Page.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field } from '../../components/ui/forms.jsx';
import { Alert, Avatar, Card } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { validateProfile } from '../../utils/validation.js';

export default function Profile() {
  usePageMeta('Profile');
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', email: user.email });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const changed = form.name !== user.name || form.phone !== (user.phone || '') || form.email !== user.email;

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const saved = await updateProfile(form);
      setForm({ name: saved.name, phone: saved.phone || '', email: saved.email });
      toast.success('Your profile was updated.');
    } catch (err) {
      const fieldErrors = err.errors || {};
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page width="md">
      <PageHeader backTo="/patient" backLabel="Dashboard" title="Profile" subtitle="The clinic uses these details to contact you about your appointments." />

      <Card className="animate-rise p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-xl">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Alert>{formError}</Alert>
          <Field label="Full name" autoComplete="name" value={form.name} onChange={update('name')} error={errors.name} />
          <Field
            label="Phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={update('phone')}
            error={errors.phone}
            hint="10 to 15 digits, with an optional leading +."
          />
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
            hint="You sign in with this email."
          />
          <Button type="submit" loading={saving} disabled={!changed}>
            Save changes
          </Button>
        </form>
      </Card>
    </Page>
  );
}
