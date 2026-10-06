import { ShieldAlert } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { LinkButton } from './ui/Button.jsx';
import { EmptyState, LoadingLabel, Skeleton } from './ui/primitives.jsx';

export const HOME = { PATIENT: '/patient', DOCTOR: '/doctor', STAFF: '/staff' };
export const LOGIN = { PATIENT: '/login', DOCTOR: '/staff/login', STAFF: '/staff/login' };

const DENIED = {
  PATIENT: {
    title: 'This area is for patients',
    text: 'Booking and appointment tracking are for patient accounts. Your account uses its own dashboard instead.',
  },
  DOCTOR: {
    title: 'Doctors only',
    text: 'The consulting-room dashboard is available to doctors. Your account does not have access to this page.',
  },
  STAFF: {
    title: 'Staff access only',
    text: 'The front desk tools are available to clinic staff. Your account does not have access to this page.',
  },
};

function AccessDenied({ role, home }) {
  usePageMeta(DENIED[role].title);
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <EmptyState icon={ShieldAlert} title={DENIED[role].title} action={<LinkButton to={home}>Back to my dashboard</LinkButton>}>
        {DENIED[role].text}
      </EmptyState>
    </div>
  );
}

// Guards a group of screens. Visitors go to that role's sign-in and come back
// afterwards; a signed-in user of another role sees a friendly explanation.
// The server enforces the same rule on every request.
export default function RequireRole({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <LoadingLabel />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-8 h-48 w-full rounded-card" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to={LOGIN[role]} replace state={{ from: location.pathname + location.search }} />;
  }
  if (user.role !== role) return <AccessDenied role={role} home={HOME[user.role]} />;
  return <Outlet />;
}
