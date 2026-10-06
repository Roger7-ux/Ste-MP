"""Everything that creates or moves an appointment. Each function is one
database transaction: it either completes or leaves nothing behind."""
import re
import secrets
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Appointment, Doctor, DoctorSlot, QrCode
from ..utils.constants import MESSAGES, STATUS_TIMESTAMP, TRANSITIONS, UNDO_WINDOW_SECONDS, WITH_DOCTOR
from ..utils.errors import HttpError
from .serializers import queue_key
from ..utils.time import now_stamp, stamp, today_date, utcnow

_TOKEN_ATTEMPTS = 5


def doctor_initials(name):
    """The doctor's initials that start every appointment ID: first and last
    name, ignoring a title. 'Dr. Rahul Sharma' -> 'RS'. Falls back to 'DR'
    when the name has no plain letters."""
    stripped = re.sub(r"^\s*(dr|prof|mr|mrs|ms)\.?\s+", "", str(name), flags=re.IGNORECASE)
    words = [word for word in (re.sub(r"[^A-Za-z]", "", part) for part in stripped.split()) if word]
    if not words:
        return "DR"
    last = words[-1][0] if len(words) > 1 else ""
    return (words[0][0] + last).upper()


def _commit(conflict_message=None):
    """Commits, turning a unique-index violation into a clear 409."""
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        if conflict_message:
            raise HttpError(409, conflict_message)
        raise


def _add(appointment, doctor):
    """Saves a new appointment and gives it its ID, such as RS-261001-0042:
    the doctor's initials, the booking date, and a number that is never reused."""
    appointment.track_token = secrets.token_hex(16)
    appointment.appointment_id = appointment.track_token  # placeholder until the row has its number
    db.session.add(appointment)
    db.session.flush()
    appointment.appointment_id = f"{doctor_initials(doctor.name)}-{datetime.now():%y%m%d}-{appointment.id:04d}"


def _give_token_number(appointment):
    """The next queue number for this doctor today. Kept once given."""
    if appointment.token_number is not None:
        return
    highest = (
        db.session.query(func.max(Appointment.token_number))
        .filter_by(doctor_id=appointment.doctor_id, appointment_date=appointment.appointment_date)
        .scalar()
    )
    appointment.token_number = (highest or 0) + 1


def _commit_with_token(appointment, build=None):
    """Commits a change that gives out a queue number and returns the saved
    appointment. If two requests pick the same number, the unique index rejects
    the second; `build` then recreates the appointment and the next number is
    tried."""
    for _ in range(_TOKEN_ATTEMPTS):
        _give_token_number(appointment)
        try:
            db.session.commit()
            return appointment
        except IntegrityError:
            db.session.rollback()
            if build is None:
                break
            appointment = build()
    raise HttpError(409, "The queue is busy. Please try again.")


# --- Booking ---------------------------------------------------------------


def _bookable_slot(slot_id, doctor_id):
    slot = db.session.get(DoctorSlot, slot_id)
    if not slot or slot.doctor_id != doctor_id:
        raise HttpError(404, MESSAGES.slot_not_found)
    if slot.status != "AVAILABLE":
        raise HttpError(409, MESSAGES.slot_taken)
    if stamp(slot.date, slot.start_time) <= now_stamp():
        raise HttpError(409, MESSAGES.slot_gone)
    return slot


def _reopen_slot_if_future(slot_id):
    slot = db.session.get(DoctorSlot, slot_id)
    if slot and stamp(slot.date, slot.start_time) > now_stamp():
        slot.status = "AVAILABLE"


def book_appointment(patient_id, doctor_id, slot_id, reason):
    """Books a slot. The appointment is created and the slot marked booked in
    one transaction; the partial unique index on appointments is the final
    guard against double booking."""
    slot = _bookable_slot(slot_id, doctor_id)
    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=doctor_id,
        slot_id=slot.id,
        appointment_date=slot.date,
        appointment_time=slot.start_time,
        consultation_fee=slot.doctor.consultation_fee,
        status="BOOKED",
        reason=reason,
    )
    try:
        _add(appointment, slot.doctor)
    except IntegrityError:
        db.session.rollback()
        raise HttpError(409, MESSAGES.slot_taken)
    slot.status = "BOOKED"
    _commit(MESSAGES.slot_taken)
    return appointment.id


def _load(appointment_id, patient_id=None):
    appointment = db.session.get(Appointment, appointment_id)
    # Another patient's appointment is reported exactly like a missing one.
    if not appointment or (patient_id is not None and appointment.patient_id != patient_id):
        raise HttpError(404, MESSAGES.appointment_not_found)
    return appointment


def _apply_status(appointment, next_status, actor):
    """`actor` ('PATIENT' or 'STAFF') is recorded when the change is a
    cancellation, which also reopens the slot if it is still in the future."""
    appointment.previous_status = appointment.status
    appointment.status = next_status
    appointment.status_changed_at = utcnow()
    appointment.cancelled_by = actor if next_status == "CANCELLED" else None
    column = STATUS_TIMESTAMP.get(next_status)
    if column:
        setattr(appointment, column, utcnow())
    if next_status == "CANCELLED" and appointment.slot_id:
        _reopen_slot_if_future(appointment.slot_id)


def change_status(appointment_id, next_status):
    """Staff: moves an appointment along an allowed transition."""
    appointment = _load(appointment_id)
    if next_status not in TRANSITIONS[appointment.status]:
        raise HttpError(409, MESSAGES.status_not_allowed)
    _apply_status(appointment, next_status, "STAFF")
    if next_status == "WAITING":
        _commit_with_token(appointment)
    else:
        _commit()
    return appointment


def undo_status_change(appointment_id):
    """Staff: reverts the latest status change, within a short window. Undoing
    a cancellation takes the slot back, which fails if someone else has booked
    it."""
    appointment = _load(appointment_id)
    window = timedelta(seconds=UNDO_WINDOW_SECONDS)
    if not appointment.previous_status or not appointment.status_changed_at or appointment.status_changed_at + window <= utcnow():
        raise HttpError(409, MESSAGES.undo_expired)

    if appointment.status == "CANCELLED" and appointment.slot_id:
        taken = Appointment.query.filter(
            Appointment.slot_id == appointment.slot_id,
            Appointment.id != appointment.id,
            Appointment.status != "CANCELLED",
        ).first()
        if taken:
            raise HttpError(409, MESSAGES.undo_slot_taken)
        slot = db.session.get(DoctorSlot, appointment.slot_id)
        if slot:
            slot.status = "BOOKED"

    column = STATUS_TIMESTAMP.get(appointment.status)
    # Undoing a restore must not wipe the original check-in time.
    if column and appointment.previous_status != "NO_SHOW":
        setattr(appointment, column, None)
    appointment.status = appointment.previous_status
    appointment.previous_status = None
    appointment.status_changed_at = utcnow()
    appointment.cancelled_by = None
    _commit(MESSAGES.undo_slot_taken)
    return appointment


def _assert_patient_can_change(appointment):
    if appointment.status != "BOOKED":
        raise HttpError(409, MESSAGES.patient_change_not_allowed)


def cancel_own(appointment_id, patient_id):
    """Patient: cancels their own appointment while it is still Booked."""
    appointment = _load(appointment_id, patient_id)
    _assert_patient_can_change(appointment)
    _apply_status(appointment, "CANCELLED", "PATIENT")
    _commit()


def reschedule_own(appointment_id, patient_id, new_slot_id):
    """Patient: moves their own Booked appointment to another open slot of the
    same doctor. The appointment ID and the fee agreed at booking stay."""
    appointment = _load(appointment_id, patient_id)
    _assert_patient_can_change(appointment)
    if appointment.slot_id == new_slot_id:
        return
    slot = _bookable_slot(new_slot_id, appointment.doctor_id)
    old_slot_id = appointment.slot_id
    appointment.slot_id = slot.id
    appointment.appointment_date = slot.date
    appointment.appointment_time = slot.start_time
    slot.status = "BOOKED"
    if old_slot_id:
        _reopen_slot_if_future(old_slot_id)
    _commit(MESSAGES.slot_taken)


def set_priority(appointment_id, priority):
    """Staff: marks an appointment as an emergency, or clears the mark. An
    emergency waits at the front of the doctor's queue. It can be changed until
    the consultation starts."""
    appointment = _load(appointment_id)
    if appointment.status not in ("BOOKED", "WAITING", "CALLED"):
        raise HttpError(409, MESSAGES.priority_not_allowed)
    if appointment.priority != priority:
        appointment.priority = priority
        appointment.priority_at = utcnow() if priority == "EMERGENCY" else None
        _commit()
    return appointment


# --- Walk-ins and QR codes -------------------------------------------------


def _walk_in(doctor, name, reason, priority, patient_id=None):
    now = utcnow()
    appointment = Appointment(
        patient_id=patient_id,
        walk_in_name=name,
        doctor_id=doctor.id,
        appointment_date=today_date(),
        appointment_time=now_stamp()[11:],
        consultation_fee=doctor.consultation_fee,
        status="WAITING",
        reason=reason,
        priority=priority,
        priority_at=now if priority == "EMERGENCY" else None,
        checked_in_at=now,
    )
    _add(appointment, doctor)
    return appointment


def create_walk_in(doctor, name, reason, priority):
    """Staff: adds a patient who arrived without a booking. They are checked in
    straight away, with no slot and no account, only the name given at the
    desk. An emergency goes to the front of the doctor's queue."""
    build = lambda: _walk_in(doctor, name, reason, priority)  # noqa: E731
    return _commit_with_token(build(), build).id


def create_qr_code(doctor):
    code = QrCode(code=secrets.token_urlsafe(12), doctor_id=doctor.id, date=today_date())
    db.session.add(code)
    db.session.commit()
    return code


def find_qr_code(code):
    qr = QrCode.query.filter_by(code=code).first()
    if not qr:
        raise HttpError(404, MESSAGES.qr_not_found)
    return qr


def claim_qr_code(code, name, patient=None):
    """Books the patient who scanned the code into the doctor's queue. A
    signed-in patient gets the visit on their account; anyone else just gives
    a name. Each code works once, on the day it was made."""
    qr = find_qr_code(code)
    if qr.appointment_id or qr.date != today_date():
        raise HttpError(409, MESSAGES.qr_used)
    doctor, qr_id = qr.doctor, qr.id

    def build():
        appointment = _walk_in(doctor, name, None, "NORMAL", patient.id if patient else None)
        db.session.get(QrCode, qr_id).appointment = appointment
        return appointment

    return _commit_with_token(build(), build)


# --- Queue operations ------------------------------------------------------


def _call_first_waiting(doctor):
    waiting = Appointment.query.filter_by(doctor_id=doctor.id, appointment_date=today_date(), status="WAITING").all()
    if not waiting:
        return None
    appointment = min(waiting, key=queue_key)
    _apply_status(appointment, "CALLED", "STAFF")
    return appointment


def call_next(doctor):
    """Staff, on a doctor's behalf: calls the first waiting patient."""
    appointment = _call_first_waiting(doctor)
    if not appointment:
        raise HttpError(409, MESSAGES.nobody_waiting)
    _commit()
    return appointment


def doctor_call_next(doctor):
    """The doctor's one button. It finishes the patient who is with them, if
    there is one, and calls the next in the queue, in a single step. Returns
    (completed, called); either may be None, but not both."""
    current = Appointment.query.filter(
        Appointment.doctor_id == doctor.id,
        Appointment.appointment_date == today_date(),
        Appointment.status.in_(WITH_DOCTOR),
    ).all()
    for appointment in current:
        _complete(appointment)
    called = _call_first_waiting(doctor)
    if not current and not called:
        raise HttpError(409, MESSAGES.nobody_waiting)
    _commit()
    return (current[0] if current else None), called


def _complete(appointment):
    """Treatment is finished. A patient who was called but never marked as in
    is taken to have started when they were called."""
    if appointment.status == "CALLED":
        appointment.started_at = appointment.called_at or utcnow()
    _apply_status(appointment, "COMPLETED", "STAFF")


def mark_not_arrived(appointment_id):
    return change_status(appointment_id, "NO_SHOW")


def restore(appointment_id):
    """Staff: puts a late patient back in the waiting queue. Someone who had
    checked in keeps that time, so they return to the place they had; their
    queue number does not change."""
    appointment = _load(appointment_id)
    if appointment.status != "NO_SHOW" or appointment.appointment_date != today_date():
        raise HttpError(409, MESSAGES.restore_not_allowed)
    appointment.previous_status = "NO_SHOW"
    appointment.status = "WAITING"
    appointment.status_changed_at = utcnow()
    if not appointment.checked_in_at:
        appointment.checked_in_at = utcnow()
    _commit_with_token(appointment)
    return appointment


def release(doctor, appointment_id=None):
    """Doctor: marks the treatment of the patient with them as complete."""
    query = Appointment.query.filter(
        Appointment.doctor_id == doctor.id,
        Appointment.appointment_date == today_date(),
        Appointment.status.in_(WITH_DOCTOR),
    )
    if appointment_id:
        query = query.filter(Appointment.id == appointment_id)
    appointment = query.order_by(Appointment.called_at).first()
    if not appointment:
        raise HttpError(409, MESSAGES.nobody_with_doctor)
    _complete(appointment)
    _commit()
    return appointment


def doctor_skip(doctor):
    """Doctor: the patient they called did not come in. The visit is kept on
    record as not arrived, and the doctor moves on. The front desk can restore
    the patient to the queue if they turn up."""
    appointment = Appointment.query.filter_by(
        doctor_id=doctor.id, appointment_date=today_date(), status="CALLED"
    ).first()
    if not appointment:
        raise HttpError(409, MESSAGES.nobody_to_skip)
    _apply_status(appointment, "NO_SHOW", "STAFF")
    _commit()
    return appointment


def start_consultation(doctor, appointment_id):
    """Doctor: the called patient has come in."""
    appointment = _load(appointment_id)
    if appointment.doctor_id != doctor.id or appointment.status != "CALLED":
        raise HttpError(409, MESSAGES.status_not_allowed)
    _apply_status(appointment, "IN_CONSULTATION", "STAFF")
    _commit()
    return appointment


def reset_tokens():
    """End of day: closes today's queue. Anyone still booked or waiting is
    marked as not arrived, the visit of a patient who is with a doctor (called
    or in consultation) is completed, and unused QR codes stop working. Queue
    numbers start again at 1 on the next day by themselves."""
    today = today_date()
    closed = 0
    for appointment in Appointment.query.filter_by(appointment_date=today).all():
        if appointment.status in ("BOOKED", "WAITING"):
            _apply_status(appointment, "NO_SHOW", "STAFF")
            closed += 1
        elif appointment.status in WITH_DOCTOR:
            _complete(appointment)
            closed += 1
    QrCode.query.filter(QrCode.date == today, QrCode.appointment_id.is_(None)).delete()
    db.session.commit()
    return closed


def find_doctor(doctor_id):
    doctor = db.session.get(Doctor, doctor_id)
    if not doctor:
        raise HttpError(404, MESSAGES.doctor_not_found)
    return doctor
