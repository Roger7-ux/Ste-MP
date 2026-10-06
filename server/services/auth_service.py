import hmac
import time

from flask import current_app
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from ..models import Doctor, User
from ..utils.constants import MESSAGES
from ..utils.errors import HttpError

# Compared against when the email is unknown, so both failures take similar time.
_DUMMY_HASH = generate_password_hash("unused-placeholder")

# Wrong guesses at the clinic code, per client address. After a few, further
# attempts are refused for a while, so the code cannot be found by trial. Held
# in memory, so it resets when the server restarts.
_MAX_CODE_ATTEMPTS = 5
_CODE_LOCK_SECONDS = 15 * 60
_failed_code_attempts = {}


def _email_taken():
    return HttpError(409, MESSAGES.email_taken, {"email": MESSAGES.email_taken})


def _register(values, role, doctor=None):
    user = User(name=values["name"], email=values["email"], phone=values["phone"] or None, role=role, doctor=doctor)
    user.set_password(values["password"])
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise _email_taken()
    return user


def register_patient(values):
    return _register(values, "PATIENT")


def _assert_not_locked(client_key):
    entry = _failed_code_attempts.get(client_key)
    if not entry:
        return
    if time.time() - entry["first"] > _CODE_LOCK_SECONDS:
        del _failed_code_attempts[client_key]
    elif entry["count"] >= _MAX_CODE_ATTEMPTS:
        raise HttpError(429, MESSAGES.too_many_code_attempts)


def register_team_member(values, client_key):
    """Creates a doctor or staff account for someone who knows the clinic code.
    The code is compared in constant time. With no code configured, sign-up is
    off. A doctor is linked to a profile in the directory: one staff already
    made, or a new one."""
    expected = current_app.config["CLINIC_CODE"]
    if not expected:
        raise HttpError(403, MESSAGES.team_signup_disabled)
    _assert_not_locked(client_key)
    if not hmac.compare_digest(values["clinic_code"].encode(), expected.encode()):
        entry = _failed_code_attempts.setdefault(client_key, {"count": 0, "first": time.time()})
        entry["count"] += 1
        raise HttpError(403, MESSAGES.wrong_clinic_code, {"clinicCode": MESSAGES.wrong_clinic_code})

    if values["role"] != "DOCTOR":
        return _register(values, "STAFF")

    if User.query.filter_by(email=values["email"]).first():
        raise _email_taken()
    if values["doctor_id"]:
        doctor = db.session.get(Doctor, values["doctor_id"])
        if not doctor:
            raise HttpError(404, MESSAGES.doctor_not_found, {"doctorId": MESSAGES.doctor_not_found})
        if doctor.account:
            raise HttpError(409, MESSAGES.profile_taken, {"doctorId": MESSAGES.profile_taken})
    else:
        # The fee starts at 0; staff set it, with the room and bio, under Doctors.
        doctor = Doctor(name=values["name"], specialization=values["specialization"], consultation_fee=0)
    return _register(values, "DOCTOR", doctor)


def login(email, password, portal):
    """`portal` is the login screen used: 'PATIENT', or 'STAFF' for doctors and
    staff. An account for the other screen is refused with the same generic
    error as a wrong password."""
    found = User.query.filter_by(email=email).first()
    password_matches = check_password_hash(found.password_hash if found else _DUMMY_HASH, password)
    allowed = ("PATIENT",) if portal == "PATIENT" else ("STAFF", "DOCTOR")
    if not found or not password_matches or found.role not in allowed:
        raise HttpError(401, MESSAGES.invalid_login)
    return found


def update_profile(user, values):
    user.name = values["name"]
    user.email = values["email"]
    user.phone = values["phone"]
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise _email_taken()
    return user
