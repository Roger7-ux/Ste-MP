"""Read-only views of the queue: the staff board and its figures, the doctor's
dashboard, the waiting-room screen, each doctor's pace, and the analytics."""
from datetime import datetime, timedelta

from ..config.clinic import CLINIC, hours_on
from ..models import Appointment, Doctor, DoctorSlot
from ..utils.constants import WITH_DOCTOR
from ..utils.time import add_days, iso, minutes_between, round_half_up, scheduled_at, to_local, today_date
from .serializers import AppointmentMapper, doctor_dict, queue_key


def _average(values):
    return sum(values) / len(values) if values else None


def _group_by_doctor(appointments):
    groups = {}
    for appointment in appointments:
        groups.setdefault(appointment.doctor_id, []).append(appointment)
    return groups


def _on_date(date):
    """One day's appointments in time order."""
    return (
        Appointment.query.filter_by(appointment_date=date)
        .order_by(Appointment.appointment_time, Appointment.id)
        .all()
    )


def _wait_minutes(a):
    """Minutes from check-in until the patient was called (or seen, if never
    called)."""
    end = a.called_at or a.started_at
    return minutes_between(a.checked_in_at, end) if a.checked_in_at and end else None


def doctor_delay_minutes(appointments, now=None):
    """How far behind schedule a doctor is running, in minutes, from one day's
    appointments. It is the larger of two things: how late the most recent
    consultation started, and how overdue the longest-waiting checked-in
    patient is. Walk-ins have no scheduled time, so they are left out."""
    now = now or datetime.now()
    scheduled = [a for a in appointments if not a.is_walk_in]
    started = max((a for a in scheduled if a.started_at), key=lambda a: a.started_at, default=None)
    last_start_delay = (
        minutes_between(scheduled_at(started.appointment_date, started.appointment_time), to_local(started.started_at))
        if started
        else 0
    )
    overdue = [
        minutes_between(scheduled_at(a.appointment_date, a.appointment_time), now)
        for a in scheduled
        if a.status in ("WAITING", "CALLED")
    ]
    return max(0, round_half_up(max(last_start_delay, *overdue, 0)))


def doctor_pace():
    """Today's pace for every doctor with appointments: minutes behind schedule
    and how many patients are waiting. Shown publicly, so it carries no patient
    data."""
    return {
        doctor_id: {
            "delayMinutes": doctor_delay_minutes(group),
            "waiting": sum(1 for a in group if a.status == "WAITING"),
        }
        for doctor_id, group in _group_by_doctor(_on_date(today_date())).items()
    }


def doctors_with_pace(doctors):
    """Doctors as JSON, each with today's live pace."""
    pace = doctor_pace()
    slots = {}
    for slot in DoctorSlot.query.filter_by(status="AVAILABLE").all():
        slots.setdefault(slot.doctor_id, []).append(slot)
    return [
        {**doctor_dict(doctor, slots.get(doctor.id, [])), **pace.get(doctor.id, {"delayMinutes": 0, "waiting": 0})}
        for doctor in doctors
    ]


def attach_live_info(items, appointments):
    """Adds live pace to today's active appointments: how late the doctor is
    running and when the patient can expect to be seen. `items` are the JSON
    forms of `appointments`, in the same order."""
    today = today_date()
    now = datetime.now()
    groups = None
    for item, a in zip(items, appointments):
        if a.appointment_date != today or a.status not in ("BOOKED", "WAITING"):
            continue
        if groups is None:
            groups = _group_by_doctor(_on_date(today))
        delay = doctor_delay_minutes(groups.get(a.doctor_id, []), now)
        if a.status == "WAITING":
            expected = now + timedelta(minutes=item["queue"]["estimatedWaitMinutes"])
        else:
            expected = max(scheduled_at(a.appointment_date, a.appointment_time) + timedelta(minutes=delay), now)
        item["live"] = {"delayMinutes": delay, "expectedTime": expected.strftime("%H:%M")}
    return items


def _hour_range(date):
    """The hours shown in the sparklines: opening to closing on that date."""
    hours = hours_on(date) or next(entry for entry in CLINIC["hours"] if entry["open"])
    first = int(hours["open"][:2])
    last = max(first, int(hours["close"][:2]) - 1)
    return list(range(first, last + 1))


def _kpis(appointments, date):
    """Headline numbers for one day plus an hour-by-hour series for each."""
    hours = _hour_range(date)

    def per_hour(pick_hour, keep=lambda a: True):
        return [sum(1 for a in appointments if keep(a) and pick_hour(a) == hour) for hour in hours]

    scheduled_hour = lambda a: int(a.appointment_time[:2])  # noqa: E731

    def stamp_hour(column):
        return lambda a: to_local(getattr(a, column)).hour if getattr(a, column) else None

    active = [a for a in appointments if a.status != "CANCELLED"]
    waits = [w for w in map(_wait_minutes, appointments) if w is not None]
    average_wait = _average(waits)

    def wait_in_hour(hour):
        in_hour = [_wait_minutes(a) for a in appointments if stamp_hour("checked_in_at")(a) == hour]
        return round_half_up(_average([w for w in in_hour if w is not None]) or 0)

    return {
        "hours": hours,
        "total": {"value": len(active), "series": per_hour(scheduled_hour, lambda a: a.status != "CANCELLED")},
        "waiting": {
            "value": sum(1 for a in appointments if a.status == "WAITING"),
            "series": per_hour(stamp_hour("checked_in_at"), lambda a: a.checked_in_at),
        },
        "averageWaitMinutes": {
            "value": None if average_wait is None else round_half_up(average_wait),
            "series": [wait_in_hour(hour) for hour in hours],
        },
        "completed": {
            "value": sum(1 for a in appointments if a.status == "COMPLETED"),
            "series": per_hour(stamp_hour("completed_at"), lambda a: a.status == "COMPLETED"),
        },
        "noShows": {
            "value": sum(1 for a in appointments if a.status == "NO_SHOW"),
            "series": per_hour(scheduled_hour, lambda a: a.status == "NO_SHOW"),
        },
        "emergencies": {
            "value": sum(1 for a in active if a.priority == "EMERGENCY"),
            "series": per_hour(scheduled_hour, lambda a: a.priority == "EMERGENCY" and a.status != "CANCELLED"),
        },
    }


def queue_board(date):
    """One day's appointments for staff, with each doctor's delay and the
    day's headline numbers."""
    appointments = _on_date(date)
    mapper = AppointmentMapper()
    mapper.preload(appointments)
    delays = {
        str(doctor_id): doctor_delay_minutes(group) if date == today_date() else 0
        for doctor_id, group in _group_by_doctor(appointments).items()
    }
    return {
        "date": date,
        "appointments": [mapper.staff(a) for a in appointments],
        "delays": delays,
        "kpis": _kpis(appointments, date),
    }


def display_board(date):
    """What the waiting-room screen shows: appointment IDs and queue numbers
    only, never names. `calls` are the calls in progress, which the screens
    announce aloud; `lastCalled` is the most recent of them."""
    appointments = _on_date(date)
    mapper = AppointmentMapper()
    mapper.preload(appointments)
    rooms = {}
    for a in appointments:
        if a.status not in ("WAITING", *WITH_DOCTOR):
            continue
        entry = rooms.setdefault(
            a.doctor_id,
            {
                "doctorId": a.doctor_id,
                "doctorName": a.doctor.name,
                "specialization": a.doctor.specialization,
                "room": a.doctor.room,
                "nowServing": [],
                "next": [],
            },
        )
        ticket = {"appointmentId": a.appointment_id, "tokenNumber": a.token_number}
        if a.status == "WAITING":
            entry["next"].append({**ticket, "position": mapper.queue(a)["position"]})
        else:
            entry["nowServing"].append({**ticket, "status": a.status, "calledAt": mapper.public(a)["timeline"]["calledAt"]})
    for entry in rooms.values():
        entry["next"] = sorted(entry["next"], key=lambda item: item["position"])[:3]

    called = sorted((a for a in appointments if a.status == "CALLED" and a.called_at), key=lambda a: a.called_at)
    return {
        "date": date,
        "rooms": sorted(rooms.values(), key=lambda entry: (entry["room"], entry["doctorName"])),
        # Calls now in progress, oldest first: the screens announce each once.
        "calls": [_announcement(a) for a in called],
        "lastCalled": _announcement(called[-1]) if called else None,
    }


def _announcement(a):
    """What is read aloud when a patient is called. No name, by design."""
    return {
        "id": a.id,
        "appointmentId": a.appointment_id,
        "tokenNumber": a.token_number,
        "doctorName": a.doctor.name,
        "room": a.doctor.room,
        "calledAt": iso(a.called_at),
    }


def public_stats():
    """Public headline figures for the landing page. Average wait covers the
    last 30 days and is None until a patient has been checked in and called."""
    doctors = [doctor_dict(doctor) for doctor in Doctor.query.all()]
    recent = Appointment.query.filter(
        Appointment.checked_in_at.isnot(None), Appointment.appointment_date > add_days(today_date(), -30)
    ).all()
    wait = _average([w for w in map(_wait_minutes, recent) if w is not None])
    return {
        "doctors": len(doctors),
        "specialties": len({doctor["specialization"] for doctor in doctors}),
        "openSlots": sum(doctor["openSlots"] for doctor in doctors),
        "openSlotsThisWeek": sum(doctor["openSlotsThisWeek"] for doctor in doctors),
        "averageWaitMinutes": None if wait is None else round_half_up(wait),
    }


# --- Doctor dashboard ------------------------------------------------------


def doctor_next(doctor):
    """The doctor's queue for today: who is with them, who is next, and the
    rest of the waiting list in order."""
    appointments = Appointment.query.filter_by(doctor_id=doctor.id, appointment_date=today_date()).all()
    mapper = AppointmentMapper()
    mapper.preload(appointments)
    with_doctor = sorted((a for a in appointments if a.status in WITH_DOCTOR), key=lambda a: a.called_at or a.created_at)
    waiting = sorted((a for a in appointments if a.status == "WAITING"), key=queue_key)
    return {
        "doctor": doctor_dict(doctor),
        "current": mapper.staff(with_doctor[0]) if with_doctor else None,
        "next": mapper.staff(waiting[0]) if waiting else None,
        "waiting": [mapper.staff(a) for a in waiting],
        "booked": sum(1 for a in appointments if a.status == "BOOKED"),
    }


def doctor_stats(doctor):
    appointments = Appointment.query.filter_by(doctor_id=doctor.id, appointment_date=today_date()).all()
    count = lambda *statuses: sum(1 for a in appointments if a.status in statuses)  # noqa: E731
    waits = [w for w in map(_wait_minutes, appointments) if w is not None]
    visits = [
        minutes_between(a.started_at, a.completed_at)
        for a in appointments
        if a.status == "COMPLETED" and a.started_at and a.completed_at
    ]
    return {
        "total": count("BOOKED", "WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED", "NO_SHOW"),
        "booked": count("BOOKED"),
        "waiting": count("WAITING"),
        "withDoctor": count(*WITH_DOCTOR),
        "completed": count("COMPLETED"),
        "notArrived": count("NO_SHOW"),
        "averageWaitMinutes": round_half_up(_average(waits)) if waits else None,
        "averageVisitMinutes": round_half_up(_average(visits)) if visits else None,
        "delayMinutes": doctor_delay_minutes(appointments),
    }


# --- Patient records -------------------------------------------------------


def patient_records():
    """Every patient the clinic has seen or booked, with their visit history,
    most recently seen first. Registered patients are grouped by account;
    walk-ins, who have no account, by the name given at the desk."""
    appointments = Appointment.query.order_by(
        Appointment.appointment_date.desc(), Appointment.appointment_time.desc(), Appointment.id.desc()
    ).all()
    records = {}
    for a in appointments:
        key = f"patient-{a.patient_id}" if a.patient_id else f"walk-in-{(a.walk_in_name or '').strip().lower()}"
        record = records.setdefault(
            key,
            {
                "key": key,
                "name": a.patient_name,
                "phone": a.patient.phone if a.patient else None,
                "email": a.patient.email if a.patient else None,
                "isWalkIn": a.patient_id is None,
                "visits": [],
            },
        )
        wait = _wait_minutes(a)
        record["visits"].append(
            {
                "id": a.id,
                "appointmentId": a.appointment_id,
                "tokenNumber": a.token_number,
                "date": a.appointment_date,
                "time": a.appointment_time,
                "doctorName": a.doctor.name,
                "specialization": a.doctor.specialization,
                "status": a.status,
                "priority": a.priority,
                "reason": a.reason,
                "consultationFee": a.consultation_fee,
                "waitMinutes": None if wait is None else round_half_up(wait),
                "visitMinutes": round_half_up(minutes_between(a.started_at, a.completed_at))
                if a.started_at and a.completed_at
                else None,
            }
        )
    for record in records.values():
        completed = [visit for visit in record["visits"] if visit["status"] == "COMPLETED"]
        record["totalVisits"] = len(record["visits"])
        record["completedVisits"] = len(completed)
        record["notArrivedVisits"] = sum(1 for visit in record["visits"] if visit["status"] == "NO_SHOW")
        record["lastVisit"] = completed[0]["date"] if completed else None
    return list(records.values())


# --- Analytics -------------------------------------------------------------


def _rate(part, whole):
    return round_half_up(part / whole * 1000) / 10 if whole else 0


def analytics(days):
    """Doctor-wise appointment and cancellation figures for the last `days`
    days, ending today, with clinic-wide totals and a day-by-day series."""
    to = today_date()
    start = add_days(to, -(days - 1))
    appointments = Appointment.query.filter(Appointment.appointment_date.between(start, to)).all()
    groups = _group_by_doctor(appointments)

    doctors = []
    for doctor in Doctor.query.all():
        group = groups.get(doctor.id, [])
        cancelled = [a for a in group if a.status == "CANCELLED"]
        waits = [w for w in map(_wait_minutes, group) if w is not None]
        row = {
            "doctorId": doctor.id,
            "doctorName": doctor.name,
            "specialization": doctor.specialization,
            "total": len(group),
            "completed": sum(1 for a in group if a.status == "COMPLETED"),
            "cancelled": len(cancelled),
            "cancelledByPatient": sum(1 for a in cancelled if a.cancelled_by == "PATIENT"),
            "cancelledByStaff": sum(1 for a in cancelled if a.cancelled_by == "STAFF"),
            "noShows": sum(1 for a in group if a.status == "NO_SHOW"),
            "emergencies": sum(1 for a in group if a.priority == "EMERGENCY"),
            "averageWaitMinutes": round_half_up(_average(waits)) if waits else None,
        }
        row["cancellationRate"] = _rate(row["cancelled"], row["total"])
        row["noShowRate"] = _rate(row["noShows"], row["total"])
        row["completionRate"] = _rate(row["completed"], row["total"])
        doctors.append(row)
    doctors.sort(key=lambda row: (-row["total"], row["doctorName"]))

    total = lambda key: sum(row[key] for row in doctors)  # noqa: E731
    waits = [row["averageWaitMinutes"] for row in doctors if row["averageWaitMinutes"] is not None]

    by_day = {}
    for a in appointments:
        by_day.setdefault(a.appointment_date, []).append(a)
    daily = []
    for offset in range(days):
        day = add_days(start, offset)
        on_day = by_day.get(day, [])
        daily.append({"date": day, "total": len(on_day), "cancelled": sum(1 for a in on_day if a.status == "CANCELLED")})

    return {
        "from": start,
        "to": to,
        "days": days,
        "totals": {
            "total": total("total"),
            "completed": total("completed"),
            "cancelled": total("cancelled"),
            "cancelledByPatient": total("cancelledByPatient"),
            "cancelledByStaff": total("cancelledByStaff"),
            "noShows": total("noShows"),
            "emergencies": total("emergencies"),
            "cancellationRate": _rate(total("cancelled"), total("total")),
            "noShowRate": _rate(total("noShows"), total("total")),
            "averageWaitMinutes": round_half_up(_average(waits)) if waits else None,
        },
        "doctors": doctors,
        "daily": daily,
    }
