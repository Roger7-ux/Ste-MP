"""Turns database rows into the JSON the interface expects."""
from datetime import timedelta

from ..models import Appointment, DoctorSlot
from ..utils.constants import DEFAULT_CONSULT_MINUTES, TRANSITIONS, UNDO_WINDOW_SECONDS, WITH_DOCTOR
from ..utils.time import add_days, iso, minutes_between, now_stamp, round_half_up, stamp, today_date, utcnow


# --- Doctors and slots -----------------------------------------------------


def doctor_dict(doctor, slots=None):
    """`slots` may be passed in to avoid a query per doctor. Availability is
    counted over unbooked slots that are still in the future."""
    if slots is None:
        slots = DoctorSlot.query.filter_by(doctor_id=doctor.id, status="AVAILABLE").all()
    now = now_stamp()
    today = today_date()
    # "This week" is today and the six days after it, as on the doctor's page.
    week_end = add_days(today, 6) + " 23:59"
    upcoming = sorted(stamp(s.date, s.start_time) for s in slots if s.status == "AVAILABLE" and stamp(s.date, s.start_time) > now)
    next_date, next_time = upcoming[0].split(" ") if upcoming else (None, None)
    return {
        "id": doctor.id,
        "name": doctor.name,
        "specialization": doctor.specialization,
        "consultationFee": doctor.consultation_fee,
        "description": doctor.description,
        "bio": doctor.bio,
        "room": doctor.room,
        "yearsExperience": doctor.years_experience,
        "languages": doctor.languages or [],
        "photoUrl": doctor.photo_url,
        "hasAvailableSlots": len(upcoming) > 0,
        "openSlots": len(upcoming),
        "openSlotsThisWeek": sum(1 for value in upcoming if value <= week_end),
        "slotsToday": sum(1 for value in upcoming if value.startswith(today)),
        "nextAvailable": {"date": next_date, "time": next_time} if next_date else None,
        # Whether a doctor has already claimed this profile as their login.
        "hasAccount": doctor.account is not None,
    }


def slot_dict(slot):
    return {
        "id": slot.id,
        "doctorId": slot.doctor_id,
        "date": slot.date,
        "startTime": slot.start_time,
        "endTime": slot.end_time,
        "status": slot.status,
        "isPast": stamp(slot.date, slot.start_time) <= now_stamp(),
    }


# --- Appointments ----------------------------------------------------------


def queue_key(appointment):
    """Emergency cases come first; within each group, earlier check-ins."""
    return (-1 if appointment.priority == "EMERGENCY" else 0, appointment.checked_in_at or utcnow(), appointment.id)


class AppointmentMapper:
    """Maps appointments to JSON. A waiting patient's place in line depends on
    the doctor's other appointments that day, so each doctor-day is loaded once
    and reused for every appointment in the response."""

    def __init__(self):
        self._days = {}

    def day(self, doctor_id, date):
        key = (doctor_id, date)
        if key not in self._days:
            self._days[key] = Appointment.query.filter_by(doctor_id=doctor_id, appointment_date=date).all()
        return self._days[key]

    def preload(self, appointments):
        """Fills the cache from a list that already holds whole days."""
        for appointment in appointments:
            self._days.setdefault((appointment.doctor_id, appointment.appointment_date), []).append(appointment)

    def queue(self, appointment):
        """Where a waiting patient stands in their doctor's queue for the day.
        The wait estimate uses the doctor's average consultation length that
        day, or a default until one has finished."""
        if appointment.status != "WAITING":
            return None
        day = self.day(appointment.doctor_id, appointment.appointment_date)
        mine = queue_key(appointment)
        position = 1 + sum(1 for other in day if other.status == "WAITING" and queue_key(other) < mine)
        consults = [
            minutes_between(other.started_at, other.completed_at)
            for other in day
            if other.status == "COMPLETED" and other.started_at and other.completed_at
        ]
        per_visit = sum(consults) / len(consults) if consults else DEFAULT_CONSULT_MINUTES
        doctor_busy = any(other.status in WITH_DOCTOR for other in day)
        return {
            "position": position,
            "ahead": position - 1,
            "isNext": position == 1,
            "estimatedWaitMinutes": round_half_up((position - 1 + (1 if doctor_busy else 0)) * per_visit),
            # True when an emergency case has been put ahead of this patient.
            "emergencyAhead": appointment.priority == "NORMAL"
            and any(other.priority == "EMERGENCY" and other.status in ("WAITING", *WITH_DOCTOR) for other in day),
        }

    def public(self, a):
        """The fields that are safe to show on the no-login tracking page:
        nothing that identifies the patient or says why they are visiting."""
        return {
            "appointmentId": a.appointment_id,
            "tokenNumber": a.token_number,
            "doctorId": a.doctor_id,
            "doctorName": a.doctor.name,
            "specialization": a.doctor.specialization,
            "room": a.doctor.room,
            "date": a.appointment_date,
            "time": a.appointment_time,
            "status": a.status,
            "priority": a.priority,
            "timeline": {
                "bookedAt": iso(a.created_at),
                "checkedInAt": iso(a.checked_in_at),
                "calledAt": iso(a.called_at),
                "startedAt": iso(a.started_at),
                "completedAt": iso(a.completed_at),
            },
            "queue": self.queue(a),
        }

    def _private(self, a):
        return {
            **self.public(a),
            "id": a.id,
            "patientName": a.patient_name,
            "isWalkIn": a.is_walk_in,
            "consultationFee": a.consultation_fee,
            "reason": a.reason,
            "cancelledBy": a.cancelled_by,
        }

    def patient(self, a):
        """The patient also gets the token for their shareable tracking link."""
        return {**self._private(a), "trackToken": a.track_token}

    def staff(self, a):
        """Staff and doctors also get the statuses the appointment may move to,
        whether the latest change can still be undone, and whether a patient
        marked as not arrived can be put back in the queue."""
        undo_until = (a.status_changed_at or utcnow()) + timedelta(seconds=UNDO_WINDOW_SECONDS)
        return {
            **self._private(a),
            "trackToken": a.track_token,
            "allowedNextStatuses": TRANSITIONS[a.status],
            "canUndo": a.previous_status is not None and a.status_changed_at is not None and undo_until > utcnow(),
            "canRestore": a.status == "NO_SHOW" and a.appointment_date == today_date(),
        }
