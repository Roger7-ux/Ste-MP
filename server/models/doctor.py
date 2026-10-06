from ..extensions import db
from ..utils.time import utcnow


class Doctor(db.Model):
    __tablename__ = "doctors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    specialization = db.Column(db.String(40), nullable=False)
    consultation_fee = db.Column(db.Float, nullable=False, default=0)
    description = db.Column(db.String(160), nullable=False, default="")
    bio = db.Column(db.Text, nullable=False, default="")
    room = db.Column(db.String(20), nullable=False, default="")
    years_experience = db.Column(db.Integer)
    languages = db.Column(db.JSON, nullable=False, default=list)
    photo_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    account = db.relationship("User", backref="doctor", uselist=False)

    __table_args__ = (db.CheckConstraint("consultation_fee >= 0", name="doctors_fee_not_negative"),)


class DoctorSlot(db.Model):
    __tablename__ = "doctor_slots"

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    # Clinic wall-clock values: 'YYYY-MM-DD' and 'HH:MM'.
    date = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.String(5), nullable=False)
    end_time = db.Column(db.String(5), nullable=False)
    status = db.Column(db.String(10), nullable=False, default="AVAILABLE")  # AVAILABLE or BOOKED
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    doctor = db.relationship("Doctor")

    __table_args__ = (
        db.UniqueConstraint("doctor_id", "date", "start_time", name="doctor_slots_unique_start"),
        db.CheckConstraint("end_time > start_time", name="doctor_slots_end_after_start"),
        db.Index("doctor_slots_doctor_date_idx", "doctor_id", "date"),
    )
