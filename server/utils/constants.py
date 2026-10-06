ROLES = ("PATIENT", "DOCTOR", "STAFF")

SPECIALIZATIONS = [
    "Cardiology",
    "Dermatology",
    "ENT",
    "General Medicine",
    "Orthopedics",
    "Pediatrics",
]

STATUSES = ("BOOKED", "WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED", "CANCELLED", "NO_SHOW")

# Allowed next statuses for staff. Completed and Cancelled are final. A patient
# marked as not arrived leaves the queue, and comes back only through
# "restore", which puts them where they were.
TRANSITIONS = {
    "BOOKED": ["WAITING", "CANCELLED", "NO_SHOW"],
    "WAITING": ["CALLED", "CANCELLED", "NO_SHOW"],
    "CALLED": ["IN_CONSULTATION", "CANCELLED", "NO_SHOW"],
    "IN_CONSULTATION": ["COMPLETED"],
    "COMPLETED": [],
    "CANCELLED": [],
    "NO_SHOW": [],
}

# The timestamp column that records when each status was reached.
STATUS_TIMESTAMP = {
    "WAITING": "checked_in_at",
    "CALLED": "called_at",
    "IN_CONSULTATION": "started_at",
    "COMPLETED": "completed_at",
}

# Statuses in which a patient is in the queue or with the doctor.
IN_QUEUE = ("WAITING", "CALLED", "IN_CONSULTATION")
WITH_DOCTOR = ("CALLED", "IN_CONSULTATION")

PRIORITIES = ("NORMAL", "EMERGENCY")

DEFAULT_SLOT_MINUTES = 30
# Used for wait estimates until a doctor has completed a visit that day.
DEFAULT_CONSULT_MINUTES = 15
# How long staff can undo a status change.
UNDO_WINDOW_SECONDS = 30
# How far ahead patients can book.
BOOKING_WINDOW_DAYS = 14
REASON_MAX_LENGTH = 500


class MESSAGES:
    invalid_login = "Invalid email or password"
    email_taken = "This email is already registered"
    not_authorized = "Not authorized"
    wrong_clinic_code = "That clinic code is not correct."
    team_signup_disabled = "Doctor and staff sign-up is switched off. Ask the clinic administrator for an account."
    too_many_code_attempts = "Too many incorrect codes. Please wait 15 minutes and try again."
    login_required = "Please log in to continue."
    slot_taken = "This slot was just booked. Please choose another."
    slot_gone = "This slot is no longer available. Please choose another."
    slot_exists = "This slot already exists."
    slot_in_past = "Slots must be in the future."
    slot_end_before_start = "End time must be after start time."
    slot_booked = "Booked slots cannot be edited or removed."
    appointment_not_found = "Appointment not found"
    doctor_not_found = "Doctor not found"
    slot_not_found = "Slot not found"
    status_not_allowed = "This status change is not allowed"
    priority_not_allowed = "Priority can only be changed before the consultation starts."
    tracking_not_found = "This tracking link is not valid."
    undo_expired = "This change can no longer be undone."
    undo_slot_taken = "The slot has since been booked by someone else, so this cannot be undone."
    patient_change_not_allowed = "Only an appointment that is still Booked can be changed."
    fix_fields = "Please fix the highlighted fields."
    restore_not_allowed = "Only a patient marked as not arrived today can be restored to the queue."
    nobody_waiting = "Nobody is waiting for this doctor."
    nobody_with_doctor = "There is no patient with you to complete."
    nobody_to_skip = "There is no called patient to skip."
    profile_taken = "That doctor profile already has an account."
    no_doctor_profile = "This account is not linked to a doctor profile. Ask the front desk to check."
    qr_not_found = "This QR code is not valid."
    qr_used = "This QR code has already been used or has expired."
