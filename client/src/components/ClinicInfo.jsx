import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useClinic } from '../hooks/useClinic.jsx';
import { cn } from '../utils/cn.js';
import { MapArt } from './Illustrations.jsx';
import { Card, IconTile, Skeleton } from './ui/primitives.jsx';

function InfoRow({ icon, title, children }) {
  return (
    <div className="flex gap-3.5">
      <IconTile icon={icon} />
      <div className="min-w-0">
        <h3 className="font-sans text-sm font-semibold tracking-normal">{title}</h3>
        <div className="mt-1 text-sm text-muted">{children}</div>
      </div>
    </div>
  );
}

// Opening hours, address, contact details and a map. The hours come from the
// same clinic config that decides which days can be booked.
export default function ClinicInfo({ className }) {
  const { clinic } = useClinic();
  const today = new Date().getDay();

  return (
    <div className={cn('grid gap-6 lg:grid-cols-2', className)}>
      <Card className="space-y-6 p-6">
        <InfoRow icon={Clock} title="Opening hours">
          {clinic ? (
            <dl>
              {[...clinic.hours.slice(1), clinic.hours[0]].map((entry) => (
                <div
                  key={entry.day}
                  className={cn('flex justify-between gap-8 py-0.5', entry.day === today && 'font-semibold text-foreground')}
                >
                  <dt>
                    {entry.label}
                    {entry.day === today && <span className="sr-only"> (today)</span>}
                  </dt>
                  <dd className="tabular-nums">{entry.open ? `${entry.open}–${entry.close}` : 'Closed'}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <Skeleton className="h-40 w-56" />
          )}
        </InfoRow>
        <InfoRow icon={MapPin} title="Address">
          {clinic ? (
            <address className="not-italic">
              {clinic.address.line1}, {clinic.address.city} {clinic.address.postcode}
              {clinic.address.isPlaceholder && <span className="block text-xs">Placeholder address, to be replaced.</span>}
            </address>
          ) : (
            <Skeleton className="h-4 w-48" />
          )}
        </InfoRow>
        <InfoRow icon={Phone} title="Phone">
          {clinic ? clinic.phone : <Skeleton className="h-4 w-32" />}
        </InfoRow>
        <InfoRow icon={Mail} title="Email">
          {clinic ? clinic.email : <Skeleton className="h-4 w-44" />}
        </InfoRow>
      </Card>
      <div className="min-h-64 overflow-hidden rounded-card border border-border">
        <MapArt />
      </div>
    </div>
  );
}
