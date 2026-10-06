// Builds a calendar (.ics) file for an appointment and downloads it. Times are
// written as "floating" local times, which is how the clinic stores them.

const compact = (date, time) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;

const escapeText = (value) => String(value).replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');

function endTime(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function buildAppointmentIcs(appointment, clinic, durationMinutes = 30) {
  const location = clinic
    ? `${clinic.name}${appointment.room ? `, Room ${appointment.room}` : ''}, ${clinic.address.line1}, ${clinic.address.city}`
    : '';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MediQ//Appointments//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.appointmentId}@mediq`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compact(appointment.date, appointment.time)}`,
    `DTEND:${compact(appointment.date, endTime(appointment.time, durationMinutes))}`,
    `SUMMARY:${escapeText(`Appointment with ${appointment.doctorName}`)}`,
    `DESCRIPTION:${escapeText(`Appointment ID ${appointment.appointmentId}. Quote this ID at the front desk.`)}`,
    location ? `LOCATION:${escapeText(location)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function downloadAppointmentIcs(appointment, clinic) {
  const blob = new Blob([buildAppointmentIcs(appointment, clinic)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${appointment.appointmentId}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
