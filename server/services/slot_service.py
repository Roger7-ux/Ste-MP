"""Keeps every doctor bookable for the whole booking window.

Patients can book two weeks ahead. As the days pass, the far end of that
window would run out of slots, so each day the missing days are filled in by
repeating the doctor's own timetable: the times they had on the same weekday
a week earlier, or on their latest working day when that weekday had none.

Only days after a doctor's last slot are filled. Days that already have slots,
and gaps staff left on purpose, are never touched, and a doctor who has never
been given a slot gets none.

A doctor whose upcoming slots staff have all removed is left alone: that is
how a doctor is taken off the booking pages. The exception is when no doctor
at all has an upcoming slot, which means the app has simply not been run for a
while, and then everyone's timetable is resumed.
"""
from collections import defaultdict
from threading import Lock

from flask import current_app

from ..config.clinic import hours_on
from ..extensions import db
from ..models import Doctor, DoctorSlot
from ..utils.constants import BOOKING_WINDOW_DAYS
from ..utils.time import add_days, today_date

_lock = Lock()
_EXTENSION_KEY = "slots_topped_up_on"


def _timetable(doctor_id):
    """The doctor's slot times by date, leaving out any outside opening hours
    (such as the ones add_today_slots.py makes for testing)."""
    days = defaultdict(set)
    for slot in DoctorSlot.query.filter_by(doctor_id=doctor_id):
        hours = hours_on(slot.date)
        if hours and slot.start_time >= hours["open"] and slot.end_time <= hours["close"]:
            days[slot.date].add((slot.start_time, slot.end_time))
    return days


def top_up_slots():
    """Adds the slots missing from the end of the booking window. Returns how
    many were added. Safe to run at any time and as often as you like."""
    today = today_date()
    last_day = today_date(BOOKING_WINDOW_DAYS - 1)
    added = 0
    timetables = {doctor.id: _timetable(doctor.id) for doctor in Doctor.query.all()}
    clinic_lapsed = not any(max(days) >= today for days in timetables.values() if days)
    for doctor_id, days in timetables.items():
        if not days:
            continue
        latest = max(days)
        if latest < today and not clinic_lapsed:
            continue  # staff removed this doctor's upcoming slots
        day = max(add_days(latest, 1), today)
        while day <= last_day:
            if hours_on(day):
                times = days.get(add_days(day, -7)) or days[latest]
                for start, end in sorted(times):
                    db.session.add(DoctorSlot(doctor_id=doctor_id, date=day, start_time=start, end_time=end))
                added += len(times)
                days[day] = set(times)
                latest = day
            day = add_days(day, 1)
    db.session.commit()
    return added


def top_up_once_a_day():
    """Runs the top-up the first time it is called on each date: at start, and
    then on the first request after midnight while the app stays running."""
    today = today_date()
    if current_app.extensions.get(_EXTENSION_KEY) == today:
        return
    with _lock:
        if current_app.extensions.get(_EXTENSION_KEY) == today:
            return
        try:
            added = top_up_slots()
            if added:
                current_app.logger.info("Added %s time slot(s) to keep the booking window full.", added)
        except Exception:  # the day's requests must not fail because of this
            db.session.rollback()
            current_app.logger.exception("Could not top up the time slots.")
        current_app.extensions[_EXTENSION_KEY] = today
