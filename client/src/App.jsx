import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import RequireRole from './components/RequireRole.jsx';
import SiteLayout from './components/layout/SiteLayout.jsx';
import Home from './pages/Home.jsx';

// Every page but the landing page is loaded on demand.
const Doctors = lazy(() => import('./pages/Doctors.jsx'));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile.jsx'));
const Specialties = lazy(() => import('./pages/Specialties.jsx'));
const SpecialtyDetail = lazy(() => import('./pages/SpecialtyDetail.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const StaffLogin = lazy(() => import('./pages/StaffLogin.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Display = lazy(() => import('./pages/Display.jsx'));
const Track = lazy(() => import('./pages/Track.jsx'));
const QrBooking = lazy(() => import('./pages/QrBooking.jsx'));

const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard.jsx'));
const Booking = lazy(() => import('./pages/patient/Booking.jsx'));
const Appointments = lazy(() => import('./pages/patient/Appointments.jsx'));
const AppointmentDetail = lazy(() => import('./pages/patient/AppointmentDetail.jsx'));
const Profile = lazy(() => import('./pages/patient/Profile.jsx'));

const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard.jsx'));

const StaffLayout = lazy(() => import('./pages/staff/StaffLayout.jsx'));
const QueueBoard = lazy(() => import('./pages/staff/QueueBoard.jsx'));
const ManageDoctors = lazy(() => import('./pages/staff/ManageDoctors.jsx'));
const ManageAvailability = lazy(() => import('./pages/staff/ManageAvailability.jsx'));
const ManageAppointments = lazy(() => import('./pages/staff/ManageAppointments.jsx'));
const StaffAppointmentDetail = lazy(() => import('./pages/staff/StaffAppointmentDetail.jsx'));
const PatientRecords = lazy(() => import('./pages/staff/PatientRecords.jsx'));
const Schedule = lazy(() => import('./pages/staff/Schedule.jsx'));
const Analytics = lazy(() => import('./pages/staff/Analytics.jsx'));

// Old addresses from the first version keep working.
function LegacyDoctorRedirect() {
  const { id } = useParams();
  return <Navigate to={`/doctors/${id}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Full-screen waiting-room board: no header or footer. */}
      <Route
        path="/display"
        element={
          <Suspense fallback={null}>
            <Display />
          </Suspense>
        }
      />

      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:id" element={<DoctorProfile />} />
        <Route path="/specialties" element={<Specialties />} />
        <Route path="/specialties/:slug" element={<SpecialtyDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/track/:token" element={<Track />} />
        {/* The address inside a QR code shown at the front desk. */}
        <Route path="/book/:code" element={<QrBooking />} />
        <Route path="/login" element={<AuthPage mode="signin" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/staff/login" element={<StaffLogin mode="signin" />} />
        <Route path="/staff/register" element={<StaffLogin mode="register" />} />

        <Route element={<RequireRole role="PATIENT" />}>
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/patient/doctors" element={<Navigate to="/doctors" replace />} />
          <Route path="/patient/doctors/:id" element={<LegacyDoctorRedirect />} />
          <Route path="/patient/doctors/:id/book" element={<Booking />} />
          <Route path="/patient/appointments" element={<Appointments />} />
          <Route path="/patient/appointments/:id" element={<AppointmentDetail />} />
          <Route path="/patient/profile" element={<Profile />} />
        </Route>

        <Route element={<RequireRole role="DOCTOR" />}>
          <Route path="/doctor" element={<DoctorDashboard />} />
        </Route>

        <Route element={<RequireRole role="STAFF" />}>
          <Route element={<StaffLayout />}>
            <Route path="/staff" element={<QueueBoard />} />
            <Route path="/staff/doctors" element={<ManageDoctors />} />
            <Route path="/staff/availability" element={<ManageAvailability />} />
            <Route path="/staff/schedule" element={<Schedule />} />
            <Route path="/staff/analytics" element={<Analytics />} />
            <Route path="/staff/appointments" element={<ManageAppointments />} />
            <Route path="/staff/appointments/:id" element={<StaffAppointmentDetail />} />
            <Route path="/staff/patients" element={<PatientRecords />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
