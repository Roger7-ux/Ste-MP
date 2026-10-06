import { Share2 } from 'lucide-react';
import { Button } from './ui/Button.jsx';
import { useToast } from './ui/Toast.jsx';

export const trackingUrl = (token) => `${window.location.origin}/track/${token}`;

// Copies the appointment's tracking link, which anyone can open without an
// account. The link uses a random token and shows no personal details.
export default function ShareTrackingLink({ token, size = 'sm', variant = 'ghost' }) {
  const toast = useToast();
  if (!token) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(trackingUrl(token));
      toast.success('Tracking link copied. Anyone with the link can follow this visit.');
    } catch {
      toast.error(`Could not copy. The link is ${trackingUrl(token)}`);
    }
  }

  return (
    <Button variant={variant} size={size} onClick={copy}>
      <Share2 aria-hidden="true" className="h-4 w-4" />
      Share tracking link
    </Button>
  );
}
