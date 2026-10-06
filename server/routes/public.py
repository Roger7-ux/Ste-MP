"""Routes that need no account. Visitors can browse doctors and availability
before signing in; booking itself requires a patient account. The waiting-room
screen, the tracking link and the QR booking link are public too."""
import re

from flask import Blueprint, current_app, request
from flask_login import current_user

from ..config.clinic import CLINIC, hours_on
from ..models import Appointment, Doctor, DoctorSlot
from ..services import appointment_service, queue_service
from ..services.serializers import AppointmentMapper, slot_dict
from ..utils.constants import BOOKING_WINDOW_DAYS, MESSAGES, SPECIALIZATIONS
from ..utils.errors import HttpError, assert_valid
from ..utils.request import body
from ..utils.time import today_date
from ..utils.validation import parse_id, text

bp = Blueprint("public", __name__, url_prefix="/api")

_TRACK_TOKEN_RE = re.compile(r"^[0-9a-f]{32}$")


def _load_doctor(doctor_id):
    return appointment_service.find_doctor(parse_id(doctor_id, MESSAGES.doctor_not_found))


@bp.get("/health")
def health():
    return {"status": "ok"}


@bp.get("/clinic")
def clinic_info():
    return {
        "clinic": CLINIC,
        "specializations": SPECIALIZATIONS,
        "bookingWindowDays": BOOKING_WINDOW_DAYS,
        # Lets the sign-in screen offer "Create account" only when it works.
        "staffSignupEnabled": bool(current_app.config["CLINIC_CODE"]),
    }


@bp.get("/stats")
def stats():
    return {"stats": queue_service.public_stats()}


@bp.get("/display")
def display():
    return queue_service.display_board(today_date())


@bp.get("/doctors")
def list_doctors():
    query = Doctor.query
    specialization = request.args.get("specialization", "").strip()
    if specialization:
        query = query.filter_by(specialization=specialization)
    return {"doctors": queue_service.doctors_with_pace(query.order_by(Doctor.name, Doctor.id).all())}


@bp.get("/doctors/<doctor_id>")
def get_doctor(doctor_id):
    return {"doctor": queue_service.doctors_with_pace([_load_doctor(doctor_id)])[0]}


@bp.get("/doctors/<doctor_id>/slots")
def doctor_slots(doctor_id):
    """The doctor plus their slots for the booking window, starting today.
    Booked and already-passed slots are included so they can be shown
    disabled; days the clinic is closed are left out."""
    doctor = _load_doctor(doctor_id)
    start = today_date()
    end = today_date(BOOKING_WINDOW_DAYS - 1)
    slots = (
        DoctorSlot.query.filter(DoctorSlot.doctor_id == doctor.id, DoctorSlot.date.between(start, end))
        .order_by(DoctorSlot.date, DoctorSlot.start_time)
        .all()
    )
    return {
        "doctor": queue_service.doctors_with_pace([doctor])[0],
        "from": start,
        "to": end,
        "slots": [slot_dict(slot) for slot in slots if hours_on(slot.date)],
    }


@bp.get("/track/<token>")
def track(token):
    """The live status behind a shareable tracking link. The token is random,
    and the response leaves out the patient's name and reason."""
    appointment = Appointment.query.filter_by(track_token=token).first() if _TRACK_TOKEN_RE.match(token) else None
    if not appointment:
        raise HttpError(404, MESSAGES.tracking_not_found)
    items = queue_service.attach_live_info([AppointmentMapper().public(appointment)], [appointment])
    return {"appointment": items[0]}


@bp.get("/qr/<code>")
def qr_code(code):
    """What a scanned QR code is for: which doctor's queue it joins."""
    qr = appointment_service.find_qr_code(code)
    return {
        "doctor": queue_service.doctors_with_pace([qr.doctor])[0],
        "date": qr.date,
        "used": qr.appointment_id is not None or qr.date != today_date(),
        "trackToken": qr.appointment.track_token if qr.appointment else None,
    }


@bp.post("/qr/<code>/book")
def book_with_qr_code(code):
    """Confirms the booking behind a scanned QR code."""
    patient = current_user if current_user.is_authenticated and current_user.role == "PATIENT" else None
    name = text(body().get("name"))[:100]
    if not patient:
        assert_valid({} if name else {"name": "Your name is required."})
    appointment = appointment_service.claim_qr_code(code, None if patient else name, patient)
    return {"appointment": AppointmentMapper().public(appointment), "trackToken": appointment.track_token}, 201
