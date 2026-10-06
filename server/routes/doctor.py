"""The doctor's own queue."""
from flask import Blueprint
from flask_login import current_user

from ..middleware.auth import require_doctor
from ..services import appointment_service, queue_service
from ..services.serializers import AppointmentMapper
from ..utils.constants import MESSAGES
from ..utils.errors import HttpError
from ..utils.request import body
from ..utils.validation import positive_int

bp = Blueprint("doctor", __name__)


def _profile():
    if not current_user.doctor:
        raise HttpError(409, MESSAGES.no_doctor_profile)
    return current_user.doctor


@bp.get("/api/doctor/next-token")
@require_doctor
def next_token():
    return queue_service.doctor_next(_profile())


@bp.get("/api/doctor/stats")
@require_doctor
def stats():
    return {"stats": queue_service.doctor_stats(_profile())}


@bp.post("/api/doctor/call-next-token")
@bp.post("/doctor/call-next-token")
@require_doctor
def call_next_token():
    """The doctor's one button: the patient with them is marked complete and
    the next one is called. The front desk board and the waiting-room screen
    show the call and announce it."""
    completed, called = appointment_service.doctor_call_next(_profile())
    mapper = AppointmentMapper()
    return {
        "completed": mapper.staff(completed) if completed else None,
        "appointment": mapper.staff(called) if called else None,
    }


@bp.post("/api/doctor/skip-token")
@bp.post("/doctor/skip-token")
@require_doctor
def skip_token():
    """The called patient did not come in: recorded as not arrived."""
    return {"appointment": AppointmentMapper().staff(appointment_service.doctor_skip(_profile()))}


@bp.post("/api/doctor/start-consultation")
@require_doctor
def start_consultation():
    appointment_id = positive_int(body().get("appointmentId"))
    if not appointment_id:
        raise HttpError(400, MESSAGES.appointment_not_found)
    appointment = appointment_service.start_consultation(_profile(), appointment_id)
    return {"appointment": AppointmentMapper().staff(appointment)}


@bp.post("/api/doctor/release-token")
@bp.post("/doctor/release-token")
@require_doctor
def release_token():
    """Marks the treatment of the patient with the doctor as complete."""
    appointment = appointment_service.release(_profile(), positive_int(body().get("appointmentId")))
    return {"appointment": AppointmentMapper().staff(appointment)}
