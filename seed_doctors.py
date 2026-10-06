"""Adds the clinic's doctors and two weeks of their time slots:

    python seed_doctors.py

Safe to run again: a doctor who is already in the directory is left as they
are, and only slots that are missing and still in the future are added. After
that the app keeps the two weeks full by itself (server/services/slot_service.py).
It creates no accounts and no
appointments. Doctors sign in by registering at /staff/register and choosing
their profile from the list.
"""
from server import create_app
from server.config.clinic import hours_on
from server.extensions import db
from server.models import Doctor, DoctorSlot
from server.utils.constants import BOOKING_WINDOW_DAYS, DEFAULT_SLOT_MINUTES
from server.utils.time import add_minutes, is_in_future, today_date

MORNING = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"]
AFTERNOON = ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"]

DOCTORS = [
    {
        "name": "Dr. Rahul Sharma",
        "specialization": "Cardiology",
        "consultation_fee": 800,
        "room": "101",
        "years_experience": 14,
        "languages": ["English", "Hindi"],
        "description": "Heart health, blood pressure and preventive cardiac care.",
        "bio": "Dr. Sharma looks after patients with high blood pressure, chest pain and heart rhythm concerns, with a focus on prevention and clear, unhurried explanations.",
        "times": MORNING + AFTERNOON[:4],
    },
    {
        "name": "Dr. Ananya Iyer",
        "specialization": "General Medicine",
        "consultation_fee": 400,
        "room": "102",
        "years_experience": 9,
        "languages": ["English", "Tamil", "Hindi"],
        "description": "Everyday illnesses, check-ups and long-term condition reviews.",
        "bio": "Dr. Iyer is the first stop for most visits: fevers, infections, routine check-ups and ongoing care for diabetes and thyroid conditions.",
        "times": MORNING + AFTERNOON,
    },
    {
        "name": "Dr. Meera Kapoor",
        "specialization": "Dermatology",
        "consultation_fee": 600,
        "room": "201",
        "years_experience": 11,
        "languages": ["English", "Hindi", "Punjabi"],
        "description": "Skin, hair and nail conditions for adults and children.",
        "bio": "Dr. Kapoor treats acne, eczema, rashes and hair loss, and carries out skin checks for moles and sun damage.",
        "times": MORNING[2:] + AFTERNOON,
    },
    {
        "name": "Dr. Arjun Nair",
        "specialization": "Pediatrics",
        "consultation_fee": 500,
        "room": "103",
        "years_experience": 8,
        "languages": ["English", "Malayalam"],
        "description": "Care for babies, children and teenagers, including vaccinations.",
        "bio": "Dr. Nair sees children from birth to eighteen for growth checks, vaccinations, coughs and colds, and worries parents want talked through.",
        "times": MORNING + AFTERNOON[:5],
    },
    {
        "name": "Dr. Vikram Singh",
        "specialization": "Orthopedics",
        "consultation_fee": 700,
        "room": "202",
        "years_experience": 17,
        "languages": ["English", "Hindi"],
        "description": "Joint pain, sports injuries, back and neck problems.",
        "bio": "Dr. Singh manages knee, shoulder and back pain, fractures and sports injuries, and plans rehabilitation with the physiotherapy team.",
        "times": MORNING[1:] + AFTERNOON[1:],
    },
    {
        "name": "Dr. Farah Khan",
        "specialization": "ENT",
        "consultation_fee": 550,
        "room": "203",
        "years_experience": 10,
        "languages": ["English", "Urdu", "Hindi"],
        "description": "Ear, nose and throat: sinus trouble, hearing and tonsils.",
        "bio": "Dr. Khan treats sinus and allergy problems, ear infections, hearing concerns and recurring sore throats in adults and children.",
        "times": MORNING[:6] + AFTERNOON[2:],
    },
]


def seed():
    added_doctors = added_slots = 0
    for entry in DOCTORS:
        details = {key: value for key, value in entry.items() if key != "times"}
        doctor = Doctor.query.filter_by(name=entry["name"]).first()
        if not doctor:
            doctor = Doctor(**details)
            db.session.add(doctor)
            db.session.flush()
            added_doctors += 1

        existing = {(slot.date, slot.start_time) for slot in DoctorSlot.query.filter_by(doctor_id=doctor.id)}
        for offset in range(BOOKING_WINDOW_DAYS):
            day = today_date(offset)
            if not hours_on(day):
                continue  # the clinic is closed
            for start in entry["times"]:
                if (day, start) in existing or not is_in_future(day, start):
                    continue
                end = add_minutes(start, DEFAULT_SLOT_MINUTES)
                db.session.add(DoctorSlot(doctor_id=doctor.id, date=day, start_time=start, end_time=end))
                added_slots += 1
    db.session.commit()
    return added_doctors, added_slots


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        doctors, slots = seed()
        print(f"Added {doctors} doctor(s) and {slots} time slot(s).")
        print(f"The directory now has {Doctor.query.count()} doctor(s). Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
