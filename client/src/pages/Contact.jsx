import { useState } from 'react';
import ClinicInfo from '../components/ClinicInfo.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { AnimatedCheck } from '../components/motion.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, TextareaField } from '../components/ui/forms.jsx';
import { Alert, Card } from '../components/ui/primitives.jsx';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { validateContact } from '../utils/validation.js';

const EMPTY = { name: '', email: '', message: '' };

export default function Contact() {
  usePageMeta('Contact', 'Opening hours, address and a form to get in touch with MediQ.');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  // The form is validated here but not yet connected to email or a help desk.
  // TODO: send the message once a destination has been agreed.
  function handleSubmit(event) {
    event.preventDefault();
    const found = validateContact(form);
    setErrors(found);
    if (Object.keys(found).length === 0) setSent(true);
  }

  return (
    <Page>
      <PageHeader eyebrow="Contact" title="Get in touch" subtitle="For anything urgent, please phone the clinic. To book, change or cancel a visit, use your appointments page." />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <Card className="h-fit p-6">
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center" role="status">
              <AnimatedCheck />
              <h2 className="mt-4 text-2xl">Thank you, {form.name.trim().split(/\s+/)[0]}</h2>
              <p className="mt-2 max-w-xs text-sm text-muted">Your message looks good.</p>
              <Alert tone="info" className="mt-4 text-left">
                This form is not connected to an inbox yet, so the message has not been sent anywhere. Please phone or
                email the clinic for now.
              </Alert>
              <Button
                variant="secondary"
                className="mt-6"
                onClick={() => {
                  setForm(EMPTY);
                  setSent(false);
                }}
              >
                Write another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <h2 className="text-2xl">Send a message</h2>
              <Field label="Your name" autoComplete="name" value={form.name} onChange={update('name')} error={errors.name} />
              <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={errors.email} />
              <TextareaField
                label="Message"
                rows={5}
                value={form.message}
                onChange={update('message')}
                error={errors.message}
                hint="Please do not include medical details."
              />
              <Button type="submit" className="w-full">
                Send message
              </Button>
            </form>
          )}
        </Card>
        <ClinicInfo className="lg:grid-cols-1" />
      </div>
    </Page>
  );
}
