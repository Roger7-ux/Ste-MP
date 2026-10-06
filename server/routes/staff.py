"""The front desk: doctors, slots, the day's queue, appointments, analytics."""
from flask import Blueprint, request
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..middleware.auth import require_staff
from ..models import Appointment, Doctor, DoctorSlot, User
from ..services import appointment_service, queue_service
from ..services.serializers import AppointmentMapper, doctor_dict, slot_dict
from ..utils.constants import MESSAGES, PRIORITIES, STATUSES
from ..utils.errors import HttpError, assert_valid
from ..utils.request import body
from ..utils.time import add_days, today_date
from ..utils.validation import is_real_date, parse_id, positive_int, validate_doctor, validate_slot, validate_walk_in

bp = Blueprint("staff", __name__)

_MOST_RECENT_FIRST = (Appointment.appointment_date.desc(), Appointment.appointment_time.desc(), Appointment.id.desc())


def _date_param(value):
    """A 'YYYY-MM-DD' query value, or today when it is missing or malformed."""
    return value if is_real_date(value) else today_date()


def _load_doctor(doctor_id):
    return appointment_service.find_doctor(parse_id(doctor_id, MESSAGES.doctor_not_found))


def _body_doctor():
    doctor_id = positive_int(body().get("doctorId"))
    assert_valid({} if doctor_id else {"doctorId": "Select a doctor."})
    return appointment_service.find_doctor(doctor_id)


def _body_appointment_id():
    appointment_id = positive_int(body().get("appointmentId"))
    assert_valid({} if appointment_id else {"appointmentId": "An appointment is required."})
    return appointment_id


def _load_editable_slot(slot_id):
    slot = db.session.get(DoctorSlot, parse_id(slot_id, MESSAGES.slot_not_found))
    if not slot:
        raise HttpError(404, MESSAGES.slot_not_found)
    if slot.status != "AVAILABLE":
        raise HttpError(409, MESSAGES.slot_booked)
    return slot


def _slot_exists():
    db.session.rollback()
    return HttpError(409, MESSAGES.slot_exists, {"startTime": MESSAGES.slot_exists})


def _staff_json(appointment):
    return {"appointment": AppointmentMapper().staff(appointment)}


def _find_appointment(appointment_id):
    appointment = db.session.get(Appointment, parse_id(appointment_id, MESSAGES.appointment_not_found))
    if not appointment:
        raise HttpError(404, MESSAGES.appointment_not_found)
    return appointment


# --- Doctors ---------------------------------------------------------------


@bp.get("/api/staff/doctors")
@require_staff
def list_all_doctors():
    return {"doctors": [doctor_dict(doctor) for doctor in Doctor.query.order_by(Doctor.name, Doctor.id).all()]}


def _write_doctor(doctor, values):
    for field, value in values.items():
        setattr(doctor, field, value)
    db.session.add(doctor)
    db.session.commit()
    return {"doctor": doctor_dict(doctor)}


@bp.post("/api/staff/doctors")
@require_staff
def add_doctor():
    errors, values = validate_doctor(body())
    assert_valid(errors)
    return _write_doctor(Doctor(), values), 201


@bp.patch("/api/staff/doctors/<doctor_id>")
@require_staff
def edit_doctor(doctor_id):
    doctor = _load_doctor(doctor_id)
    errors, values = validate_doctor(body())
    assert_valid(errors)
    return _write_doctor(doctor, values)


# --- Slots -----------------------------------------------------------------


@bp.get("/api/staff/doctors/<doctor_id>/slots")
@require_staff
def list_doctor_slots(doctor_id):
    doctor = _load_doctor(doctor_id)
    slots = DoctorSlot.query.filter_by(doctor_id=doctor.id).order_by(DoctorSlot.date, DoctorSlot.start_time).all()
    return {"doctor": doctor_dict(doctor), "slots": [slot_dict(slot) for slot in slots]}


@bp.post("/api/staff/doctors/<doctor_id>/slots")
@require_staff
def add_slot(doctor_id):
    doctor = _load_doctor(doctor_id)
    errors, values = validate_slot(body())
    assert_valid(errors)
    slot = DoctorSlot(doctor_id=doctor.id, **values)
    db.session.add(slot)
    try:
        db.session.commit()
    except IntegrityError:
        raise _slot_exists()
    return {"slot": slot_dict(slot)}, 201


@bp.patch("/api/staff/slots/<slot_id>")
@require_staff
def edit_slot(slot_id):
    slot = _load_editable_slot(slot_id)
    data = body()
    start_changed = data.get("startTime") is not None and data.get("startTime") != slot.start_time
    errors, values = validate_slot(
        {
            "date": data.get("date") or slot.date,
            "startTime": data.get("startTime") or slot.start_time,
            # A new start time without an end time gets the default length again.
            "endTime": data.get("endTime") or ("" if start_changed else slot.end_time),
        }
    )
    assert_valid(errors)
    slot.date, slot.start_time, slot.end_time = values["date"], values["start_time"], values["end_time"]
    try:
        db.session.commit()
    except IntegrityError:
        raise _slot_exists()
    return {"slot": slot_dict(slot)}


@bp.delete("/api/staff/slots/<slot_id>")
@require_staff
def remove_slot(slot_id):
    db.session.delete(_load_editable_slot(slot_id))
    db.session.commit()
    return {"message": "Slot removed."}


# --- The day's queue -------------------------------------------------------


@bp.get("/api/staff/queue")
@bp.get("/api/staff/queue-status")
@require_staff
def queue_board():
    """One day's appointments with the day's headline numbers. Defaults to today."""
    return queue_service.queue_board(_date_param(request.args.get("date")))


@bp.get("/api/staff/schedule")
@require_staff
def schedule():
    """Seven days of every doctor's slots, starting from `?start=`."""
    start = _date_param(request.args.get("start"))
    days = [add_days(start, index) for index in range(7)]
    slots = (
        DoctorSlot.query.filter(DoctorSlot.date.between(start, days[-1]))
        .order_by(DoctorSlot.date, DoctorSlot.start_time)
        .all()
    )
    return {
        "start": start,
        "days": days,
        "doctors": [doctor_dict(doctor) for doctor in Doctor.query.order_by(Doctor.name, Doctor.id).all()],
        "slots": [slot_dict(slot) for slot in slots],
    }


@bp.post("/api/staff/walk-ins")
@bp.post("/api/staff/generate-token")
@bp.post("/staff/generate-token")
@require_staff
def add_walk_in():
    """Adds a patient who arrived without a booking, straight into the queue."""
    errors, values = validate_walk_in(body())
    assert_valid(errors)
    doctor = appointment_service.find_doctor(values["doctor_id"])
    appointment_id = appointment_service.create_walk_in(doctor, values["name"], values["reason"], values["priority"])
    return _staff_json(db.session.get(Appointment, appointment_id)), 201


@bp.post("/api/staff/generate-qr-token")
@bp.post("/staff/generate-qr-token")
@require_staff
def generate_qr_token():
    """A one-time code for on-site booking. The browser turns the path into a
    full link and draws the QR code."""
    doctor = _body_doctor()
    qr = appointment_service.create_qr_code(doctor)
    return {"code": qr.code, "bookingPath": f"/book/{qr.code}", "doctor": doctor_dict(doctor)}, 201


@bp.post("/api/staff/call-next-token")
@bp.post("/staff/call-next-token")
@require_staff
def call_next_token():
    return _staff_json(appointment_service.call_next(_body_doctor()))


@bp.post("/api/staff/mark-not-arrived")
@bp.post("/staff/mark-not-arrived")
@require_staff
def mark_not_arrived():
    return _staff_json(appointment_service.mark_not_arrived(_body_appointment_id()))


@bp.post("/api/staff/restore-token")
@bp.post("/staff/restore-token")
@require_staff
def restore_token():
    return _staff_json(appointment_service.restore(_body_appointment_id()))


@bp.post("/api/staff/reset-tokens")
@bp.post("/staff/reset-tokens")
@require_staff
def reset_tokens():
    return {"closed": appointment_service.reset_tokens()}


# --- Appointments ----------------------------------------------------------


@bp.get("/api/staff/appointments")
@require_staff
def list_appointments():
    """`?q=` looks appointments up by ID or patient name."""
    search = request.args.get("q", "").strip()[:100]
    query = Appointment.query
    if search:
        pattern = "%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        query = query.outerjoin(User, User.id == Appointment.patient_id).filter(
            or_(
                Appointment.appointment_id.ilike(pattern, escape="\\"),
                User.name.ilike(pattern, escape="\\"),
                Appointment.walk_in_name.ilike(pattern, escape="\\"),
            )
        )
    query = query.order_by(*_MOST_RECENT_FIRST)
    appointments = query.limit(20).all() if search else query.all()
    mapper = AppointmentMapper()
    return {"appointments": [mapper.staff(a) for a in appointments]}


@bp.get("/api/staff/appointments/<appointment_id>")
@require_staff
def get_appointment(appointment_id):
    return _staff_json(_find_appointment(appointment_id))


@bp.patch("/api/staff/appointments/<appointment_id>/status")
@require_staff
def update_appointment_status(appointment_id):
    appointment = _find_appointment(appointment_id)
    status = body().get("status")
    if status not in STATUSES:
        raise HttpError(400, MESSAGES.status_not_allowed, {"status": MESSAGES.status_not_allowed})
    return _staff_json(appointment_service.change_status(appointment.id, status))


@bp.post("/api/staff/appointments/<appointment_id>/undo")
@require_staff
def undo_appointment_status(appointment_id):
    appointment = _find_appointment(appointment_id)
    return _staff_json(appointment_service.undo_status_change(appointment.id))


@bp.patch("/api/staff/appointments/<appointment_id>/priority")
@require_staff
def update_appointment_priority(appointment_id):
    """Marks an appointment as an emergency, or clears the mark."""
    appointment = _find_appointment(appointment_id)
    priority = body().get("priority")
    if priority not in PRIORITIES:
        raise HttpError(400, MESSAGES.fix_fields, {"priority": "Choose Normal or Emergency."})
    return _staff_json(appointment_service.set_priority(appointment.id, priority))


@bp.get("/api/staff/patients")
@require_staff
def patient_records():
    """Every patient with their visit history, kept for future visits."""
    return {"patients": queue_service.patient_records()}


@bp.get("/api/staff/analytics")
@require_staff
def analytics():
    """Doctor-wise appointment and cancellation figures for the last 7, 30 or 90 days."""
    days = request.args.get("days", type=int)
    return queue_service.analytics(days if days in (7, 30, 90) else 30)
