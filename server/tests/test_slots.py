from server.config.clinic import hours_on
from server.extensions import db
from server.models import Doctor, DoctorSlot
from server.services.slot_service import top_up_slots
from server.utils.constants import BOOKING_WINDOW_DAYS
from server.utils.time import add_days, today_date

from .conftest import open_day


def _add(doctor_id, day, start, end):
    db.session.add(DoctorSlot(doctor_id=doctor_id, date=day, start_time=start, end_time=end))


def _by_day(doctor_id):
    days = {}
    for slot in DoctorSlot.query.filter_by(doctor_id=doctor_id):
        days.setdefault(slot.date, set()).add(slot.start_time)
    return days


def test_the_booking_window_is_kept_full(app):
    with app.app_context():
        busy = Doctor(name="Dr. Busy", specialization="ENT", consultation_fee=300)
        idle = Doctor(name="Dr. Idle", specialization="ENT", consultation_fee=300)
        db.session.add_all([busy, idle])
        db.session.flush()

        # Two open days of slots some time ago, with different times, and one
        # test slot outside opening hours that must not be copied.
        first = open_day(-20)
        second = add_days(first, 1) if hours_on(add_days(first, 1)) else add_days(first, 2)
        _add(busy.id, first, "09:00", "09:30")
        _add(busy.id, second, "10:00", "10:30")
        _add(busy.id, second, "14:00", "14:30")
        _add(busy.id, second, "23:00", "23:30")
        db.session.commit()

        added = top_up_slots()
        days = _by_day(busy.id)
        window = [today_date(offset) for offset in range(BOOKING_WINDOW_DAYS)]

        assert added > 0
        for day in window:
            if hours_on(day):
                assert days[day], day
                assert "23:00" not in days[day]
            else:
                assert day not in days
        # A day repeats the times of the same weekday a week before.
        some_day = next(day for day in reversed(window) if hours_on(day))
        assert days[some_day] == days[add_days(some_day, -7)]
        # Nothing beyond the window, nothing for a doctor without a timetable.
        assert max(days) <= window[-1]
        assert _by_day(idle.id) == {}
        # Running it again adds nothing.
        assert top_up_slots() == 0


def test_a_doctor_with_no_upcoming_slots_is_left_alone(app):
    with app.app_context():
        working = Doctor(name="Dr. Working", specialization="ENT", consultation_fee=300)
        stopped = Doctor(name="Dr. Stopped", specialization="ENT", consultation_fee=300)
        db.session.add_all([working, stopped])
        db.session.flush()
        _add(working.id, open_day(1), "09:00", "09:30")
        _add(stopped.id, open_day(-10), "09:00", "09:30")
        db.session.commit()

        top_up_slots()
        assert max(_by_day(working.id)) >= today_date(BOOKING_WINDOW_DAYS - 2)
        assert all(day < today_date() for day in _by_day(stopped.id))


def test_days_staff_left_empty_stay_empty(app):
    with app.app_context():
        doctor = Doctor(name="Dr. Gap", specialization="ENT", consultation_fee=300)
        db.session.add(doctor)
        db.session.flush()
        far = open_day(BOOKING_WINDOW_DAYS - 2)
        _add(doctor.id, far, "09:00", "09:30")
        db.session.commit()

        top_up_slots()
        days = _by_day(doctor.id)
        assert all(day >= far for day in days)
