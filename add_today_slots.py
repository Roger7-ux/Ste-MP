"""For testing: gives every doctor bookable slots for the rest of today.

    python add_today_slots.py

The front desk's Availability page only accepts slots inside opening hours,
which makes it impossible to try the same-day flow (book, check in, call,
complete) in the evening. This adds a slot every 15 minutes from now until
23:45 for each doctor, whatever the opening hours. Safe to run again: slots
that already exist are skipped.

Patients can only see them on a day the clinic is open (not Sunday).
"""
from datetime import datetime, timedelta

from server import create_app
from server.config.clinic import hours_on
from server.extensions import db
from server.models import Doctor, DoctorSlot
from server.utils.time import today_date

STEP_MINUTES = 15
LAST_START = "23:45"


def remaining_times():
    """Quarter-hour start times from the next one after now."""
    now = datetime.now()
    start = now.replace(second=0, microsecond=0) + timedelta(minutes=STEP_MINUTES - now.minute % STEP_MINUTES)
    times = []
    while start.date() == now.date() and start.strftime("%H:%M") <= LAST_START:
        times.append(start.strftime("%H:%M"))
        start += timedelta(minutes=STEP_MINUTES)
    return times


def add_slots():
    today = today_date()
    added = 0
    for doctor in Doctor.query.all():
        existing = {slot.start_time for slot in DoctorSlot.query.filter_by(doctor_id=doctor.id, date=today)}
        for start in remaining_times():
            if start in existing:
                continue
            end = (datetime.strptime(start, "%H:%M") + timedelta(minutes=STEP_MINUTES - 1)).strftime("%H:%M")
            db.session.add(DoctorSlot(doctor_id=doctor.id, date=today, start_time=start, end_time=end))
            added += 1
    db.session.commit()
    return added


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        times = remaining_times()
        if not Doctor.query.first():
            print("There are no doctors yet. Add one, or run: python seed_doctors.py")
        elif not times:
            print("It is too late in the day to add slots. Try again tomorrow.")
        else:
            added = add_slots()
            print(f"Added {added} slot(s) for today, from {times[0]} to {times[-1]}, across {Doctor.query.count()} doctor(s).")
            if not hours_on(today_date()):
                print("Note: the clinic is closed today, so patients will not see these slots.")
