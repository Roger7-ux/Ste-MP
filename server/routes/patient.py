"""A patient's own appointments."""
from flask import Blueprint
from flask_login import current_user

from ..middleware.auth import require_patient
from ..models import Appointment
from ..services import appointment_service, queue_service
from ..services.serializers import AppointmentMapper
from ..utils.constants import IN_QUEUE, MESSAGES
from ..utils.errors import HttpError, assert_valid
from ..utils.request import body
from ..utils.time import today_date
from ..utils.validation import parse_id, positive_int, validate_reason

bp = Blueprint("patient", __name__)


def _json(appointments):
    mapper = AppointmentMapper()
    return queue_service.attach_live_info([mapper.patient(a) for a in appointments], appointments)


def _own(appointment_id):
    """Another patient's appointment is reported exactly like a missing one."""
    appointment = Appointment.query.filter_by(
        id=parse_id(appointment_id, MESSAGES.appointment_not_found), patient_id=current_user.id
    ).first()
    if not appointment:
        raise HttpError(404, MESSAGES.appointment_not_found)
    return appointment


@bp.post("/api/appointments")
@bp.post("/api/patient/book-token")
@bp.post("/patient/book-token")
@require_patient
def create():
    data = body()
    doctor_id = positive_int(data.get("doctorId"))
    slot_id = positive_int(data.get("slotId"))
    errors = {}
    if doctor_id is None:
        errors["doctorId"] = "Select a doctor."
    if slot_id is None:
        errors["slotId"] = "Select a time slot."
    reason = validate_reason(data.get("reason"), errors)
    assert_valid(errors)

    appointment_service.find_doctor(doctor_id)
    appointment_id = appointment_service.book_appointment(current_user.id, doctor_id, slot_id, reason)
    return {"appointment": _json([_own(appointment_id)])[0]}, 201


@bp.get("/api/appointments")
@require_patient
def list_own():
    appointments = (
        Appointment.query.filter_by(patient_id=current_user.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc(), Appointment.id.desc())
        .all()
    )
    return {"appointments": _json(appointments)}


@bp.get("/api/patient/token-status")
@require_patient
def token_status():
    """The patient's visit for today: the one in the queue if there is one,
    otherwise the next one still to come, otherwise none."""
    todays = Appointment.query.filter_by(patient_id=current_user.id, appointment_date=today_date()).all()
    in_queue = [a for a in todays if a.status in IN_QUEUE]
    booked = sorted((a for a in todays if a.status == "BOOKED"), key=lambda a: a.appointment_time)
    current = (in_queue or booked or [None])[0]
    return {"appointment": _json([current])[0] if current else None}


@bp.get("/api/appointments/<appointment_id>")
@require_patient
def get(appointment_id):
    return {"appointment": _json([_own(appointment_id)])[0]}


@bp.post("/api/appointments/<appointment_id>/cancel")
@require_patient
def cancel(appointment_id):
    appointment = _own(appointment_id)
    appointment_service.cancel_own(appointment.id, current_user.id)
    return {"appointment": _json([appointment])[0]}


@bp.post("/api/appointments/<appointment_id>/reschedule")
@require_patient
def reschedule(appointment_id):
    appointment = _own(appointment_id)
    slot_id = positive_int(body().get("slotId"))
    assert_valid({} if slot_id else {"slotId": "Select a time slot."})
    appointment_service.reschedule_own(appointment.id, current_user.id, slot_id)
    return {"appointment": _json([appointment])[0]}
