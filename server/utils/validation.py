"""Input checks for every form. Each validator returns (errors, values); the
browser repeats the same checks for faster feedback, but these decide."""
import math
import re
from datetime import date

from ..config.clinic import hours_on, weekday_label
from .constants import DEFAULT_SLOT_MINUTES, MESSAGES, PRIORITIES, REASON_MAX_LENGTH, SPECIALIZATIONS
from .errors import HttpError
from .time import add_minutes, is_in_future, today_date

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_RE = re.compile(r"^\+?\d{10,15}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
PHOTO_URL_RE = re.compile(r"^(https?://|/)\S+$")
TEAM_ROLES = ("STAFF", "DOCTOR")
MAX_ID = 2147483647


def text(value):
    """A trimmed string; anything that is not a string becomes ''. Control
    characters are dropped."""
    if not isinstance(value, str):
        return ""
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value).strip()


def parse_id(value, not_found_message):
    """A path id as a positive integer; anything else is a 404."""
    try:
        number = int(str(value))
    except ValueError:
        raise HttpError(404, not_found_message)
    if number <= 0 or number > MAX_ID:
        raise HttpError(404, not_found_message)
    return number


def positive_int(value):
    """A body value as a positive integer, or None."""
    if isinstance(value, bool):
        return None
    if isinstance(value, str) and value.strip().isdigit():
        value = int(value.strip())
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return value if isinstance(value, int) and 0 < value <= MAX_ID else None


def is_real_date(value):
    if not isinstance(value, str) or not DATE_RE.match(value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def _check_name(name, errors):
    if not name:
        errors["name"] = "Full name is required."
    elif len(name) > 100:
        errors["name"] = "Full name must be 100 characters or fewer."


def _check_email(email, errors):
    if not email:
        errors["email"] = "Email is required."
    elif not EMAIL_RE.match(email) or len(email) > 254:
        errors["email"] = "Enter a valid email address."


def _check_phone(phone, errors):
    if not phone:
        errors["phone"] = "Phone number is required."
    elif not PHONE_RE.match(phone):
        errors["phone"] = "Enter 10 to 15 digits, with an optional leading +."


def validate_registration(body):
    errors = {}
    name = text(body.get("name"))
    email = text(body.get("email")).lower()
    phone = text(body.get("phone"))
    password = body.get("password") if isinstance(body.get("password"), str) else ""

    _check_name(name, errors)
    _check_email(email, errors)
    _check_phone(phone, errors)

    if not password:
        errors["password"] = "Password is required."
    elif len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."
    elif len(password) > 128:
        errors["password"] = "Password must be 128 characters or fewer."

    return errors, {"name": name, "email": email, "phone": phone, "password": password}


def validate_team_registration(body):
    """Doctor or staff sign-up: the same account fields, with the phone
    optional, plus the clinic code that authorises it. A doctor also says which
    profile is theirs: an existing one, or a new one in a specialization."""
    errors, values = validate_registration(body)
    if not values["phone"]:
        errors.pop("phone", None)
    values["phone"] = values["phone"] or None

    values["clinic_code"] = text(body.get("clinicCode"))
    if not values["clinic_code"]:
        errors["clinicCode"] = "Clinic code is required."

    values["role"] = text(body.get("role")).upper() or "STAFF"
    if values["role"] not in TEAM_ROLES:
        errors["role"] = "Choose doctor or staff."

    values["doctor_id"] = None
    values["specialization"] = None
    if values["role"] == "DOCTOR":
        raw_doctor = body.get("doctorId")
        if raw_doctor not in (None, ""):
            values["doctor_id"] = positive_int(raw_doctor)
            if values["doctor_id"] is None:
                errors["doctorId"] = "Choose your profile from the list."
        else:
            values["specialization"] = text(body.get("specialization"))
            if not values["specialization"]:
                errors["specialization"] = "Specialization is required."
            elif values["specialization"] not in SPECIALIZATIONS:
                errors["specialization"] = "Choose a specialization from the list."
    return errors, values


def validate_profile(body, phone_required):
    """Phone is required for patients only; team accounts may not have one."""
    errors = {}
    name = text(body.get("name"))
    email = text(body.get("email")).lower()
    phone = text(body.get("phone"))

    _check_name(name, errors)
    _check_email(email, errors)
    if phone or phone_required:
        _check_phone(phone, errors)

    return errors, {"name": name, "email": email, "phone": phone or None}


def validate_login(body):
    errors = {}
    email = text(body.get("email")).lower()
    password = body.get("password") if isinstance(body.get("password"), str) else ""
    if not email:
        errors["email"] = "Email is required."
    if not password:
        errors["password"] = "Password is required."
    return errors, {"email": email, "password": password, "role": body.get("role")}


def validate_reason(value, errors):
    """Optional free text from the patient. Returns None when empty."""
    reason = text(value)
    if len(reason) > REASON_MAX_LENGTH:
        errors["reason"] = f"Reason must be {REASON_MAX_LENGTH} characters or fewer."
    return reason or None


def validate_walk_in(body):
    errors = {}
    name = text(body.get("name"))
    if not name:
        errors["name"] = "Patient name is required."
    elif len(name) > 100:
        errors["name"] = "Patient name must be 100 characters or fewer."
    doctor_id = positive_int(body.get("doctorId"))
    if doctor_id is None:
        errors["doctorId"] = "Select a doctor."
    reason = validate_reason(body.get("reason"), errors)
    # The original desk tool added emergencies only, so that stays the default.
    priority = body.get("priority", "EMERGENCY")
    if priority not in PRIORITIES:
        errors["priority"] = "Choose Normal or Emergency."
    return errors, {"name": name, "doctor_id": doctor_id, "reason": reason, "priority": priority}


def _parse_languages(value):
    items = value if isinstance(value, list) else value.split(",") if isinstance(value, str) else []
    seen = []
    for item in items:
        language = text(item)
        if language and language not in seen:
            seen.append(language)
    return seen


def validate_doctor(body):
    errors = {}
    name = text(body.get("name"))
    specialization = text(body.get("specialization"))
    raw_fee = body.get("consultationFee")
    fee = raw_fee
    if isinstance(raw_fee, str):
        try:
            fee = float(raw_fee.strip()) if raw_fee.strip() else math.nan
        except ValueError:
            fee = math.nan

    if not name:
        errors["name"] = "Doctor name is required."
    elif len(name) > 100:
        errors["name"] = "Doctor name must be 100 characters or fewer."

    if not specialization:
        errors["specialization"] = "Specialization is required."
    elif specialization not in SPECIALIZATIONS:
        errors["specialization"] = "Choose a specialization from the list."

    if raw_fee is None or raw_fee == "":
        errors["consultationFee"] = "Consultation fee is required."
    elif isinstance(fee, bool) or not isinstance(fee, (int, float)) or not math.isfinite(fee) or fee < 0:
        errors["consultationFee"] = "Consultation fee must be a number of 0 or more."
    elif fee > 9999999:
        errors["consultationFee"] = "Consultation fee is too large."

    # Everything below is optional profile detail.
    description = text(body.get("description"))
    if len(description) > 160:
        errors["description"] = "Short description must be 160 characters or fewer."

    bio = text(body.get("bio"))
    if len(bio) > 2000:
        errors["bio"] = "Bio must be 2,000 characters or fewer."

    room = text(body.get("room"))
    if len(room) > 20:
        errors["room"] = "Room must be 20 characters or fewer."

    years_experience = None
    raw_years = body.get("yearsExperience")
    if raw_years is not None and str(raw_years).strip() != "":
        try:
            number = float(raw_years)
        except (TypeError, ValueError):
            number = math.nan
        if isinstance(raw_years, bool) or not math.isfinite(number) or not number.is_integer() or not 0 <= number <= 80:
            errors["yearsExperience"] = "Experience must be a whole number of years between 0 and 80."
        else:
            years_experience = int(number)

    languages = _parse_languages(body.get("languages"))
    if len(languages) > 8 or any(len(language) > 30 for language in languages):
        errors["languages"] = "List up to 8 languages, each 30 characters or fewer."

    photo_url = text(body.get("photoUrl"))
    if photo_url and (not PHOTO_URL_RE.match(photo_url) or len(photo_url) > 500):
        errors["photoUrl"] = "Photo must be a web address starting with http:// or https://."

    return errors, {
        "name": name,
        "specialization": specialization,
        "consultation_fee": fee,
        "description": description,
        "bio": bio,
        "room": room,
        "years_experience": years_experience,
        "languages": languages,
        "photo_url": photo_url or None,
    }


def validate_slot(body):
    """Validates a slot's date and times. `endTime` defaults to start + 30
    minutes. The slot must be in the future and inside opening hours."""
    errors = {}
    slot_date = text(body.get("date"))
    start_time = text(body.get("startTime"))
    end_time = text(body.get("endTime"))

    if not slot_date:
        errors["date"] = "Date is required."
    elif not is_real_date(slot_date):
        errors["date"] = "Enter a valid date."

    if not start_time:
        errors["startTime"] = "Start time is required."
    elif not TIME_RE.match(start_time):
        errors["startTime"] = "Enter a valid start time."

    if end_time and not TIME_RE.match(end_time):
        errors["endTime"] = "Enter a valid end time."

    if "startTime" not in errors and "endTime" not in errors:
        if not end_time:
            end_time = add_minutes(start_time, DEFAULT_SLOT_MINUTES)
        if not end_time or end_time <= start_time:
            errors["endTime"] = MESSAGES.slot_end_before_start

    if "date" not in errors and "startTime" not in errors:
        if slot_date < today_date():
            errors["date"] = MESSAGES.slot_in_past
        elif not is_in_future(slot_date, start_time):
            errors["startTime"] = MESSAGES.slot_in_past

    if "date" not in errors:
        hours = hours_on(slot_date)
        if not hours:
            errors["date"] = f"The clinic is closed on {weekday_label(slot_date)}s."
        elif "startTime" not in errors and "endTime" not in errors and (
            start_time < hours["open"] or end_time > hours["close"]
        ):
            errors["startTime"] = f"Slots must be within opening hours ({hours['open']}–{hours['close']})."

    return errors, {"date": slot_date, "start_time": start_time, "end_time": end_time}
