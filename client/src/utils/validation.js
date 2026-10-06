// Client-side checks mirror the server's, for faster feedback. The server
// remains the authority.
import { REASON_MAX_LENGTH } from './constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{10,15}$/;

function checkContact({ name, email, phone }, errors, { phoneRequired = true } = {}) {
  if (!name.trim()) errors.name = 'Full name is required.';
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!phone.trim()) {
    if (phoneRequired) errors.phone = 'Phone number is required.';
  } else if (!PHONE_RE.test(phone.trim())) {
    errors.phone = 'Enter 10 to 15 digits, with an optional leading +.';
  }
}

export function validateRegistration(form) {
  const errors = {};
  checkContact(form, errors);
  if (!form.password) errors.password = 'Password is required.';
  else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
}

// A doctor or staff account. A doctor also says which profile in the
// directory is theirs, or the specialization for a new one.
export function validateStaffRegistration(form) {
  const errors = {};
  checkContact({ ...form, phone: '' }, errors, { phoneRequired: false });
  if (!form.password) errors.password = 'Password is required.';
  else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (form.role === 'DOCTOR' && !form.doctorId && !form.specialization) {
    errors.specialization = 'Specialization is required.';
  }
  if (!form.clinicCode.trim()) errors.clinicCode = 'Clinic code is required.';
  return errors;
}

export function validateProfile(form, options) {
  const errors = {};
  checkContact(form, errors, options);
  return errors;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateDoctor({ name, specialization, consultationFee, yearsExperience }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Doctor name is required.';
  if (!specialization) errors.specialization = 'Specialization is required.';
  const fee = String(consultationFee).trim();
  if (fee === '') errors.consultationFee = 'Consultation fee is required.';
  else if (!Number.isFinite(Number(fee)) || Number(fee) < 0) {
    errors.consultationFee = 'Consultation fee must be a number of 0 or more.';
  }
  const years = String(yearsExperience ?? '').trim();
  if (years !== '' && (!Number.isInteger(Number(years)) || Number(years) < 0 || Number(years) > 80)) {
    errors.yearsExperience = 'Experience must be a whole number of years between 0 and 80.';
  }
  return errors;
}

export function validateSlot({ date, startTime, endTime }) {
  const errors = {};
  if (!date) errors.date = 'Date is required.';
  if (!startTime) errors.startTime = 'Start time is required.';
  if (startTime && endTime && endTime <= startTime) {
    errors.endTime = 'End time must be after start time.';
  }
  return errors;
}

export function validateReason(reason) {
  return reason.trim().length > REASON_MAX_LENGTH
    ? { reason: `Reason must be ${REASON_MAX_LENGTH} characters or fewer.` }
    : {};
}

export function validateContact({ name, email, message }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Your name is required.';
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!message.trim()) errors.message = 'Please write a message.';
  else if (message.trim().length < 10) errors.message = 'Please write at least 10 characters.';
  return errors;
}
