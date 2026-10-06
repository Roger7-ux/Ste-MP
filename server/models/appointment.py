from ..extensions import db
from ..utils.time import utcnow


class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    # Human-readable, e.g. RS-261001-0042. Never changes.
    appointment_id = db.Column(db.String(40), nullable=False, unique=True)
    # Empty for a walk-in, who has only the name given at the desk.
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    walk_in_name = db.Column(db.String(100))
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    # Empty for walk-ins, or if staff later remove a slot reopened by a cancellation.
    slot_id = db.Column(db.Integer, db.ForeignKey("doctor_slots.id", ondelete="SET NULL"))
    # Date, time and fee are copied at booking so history stays accurate.
    appointment_date = db.Column(db.String(10), nullable=False)
    appointment_time = db.Column(db.String(5), nullable=False)
    consultation_fee = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(16), nullable=False, default="BOOKED")
    reason = db.Column(db.String(500))
    # The day's queue number for this doctor, given at check-in. Starts again
    # at 1 every day.
    token_number = db.Column(db.Integer)
    # When each stage of the visit was reached; drives queue order and wait times.
    checked_in_at = db.Column(db.DateTime)
    called_at = db.Column(db.DateTime)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    # The status before the latest change, so staff can undo it for a short time.
    previous_status = db.Column(db.String(16))
    status_changed_at = db.Column(db.DateTime)
    # Emergency cases go to the front of the doctor's queue.
    priority = db.Column(db.String(10), nullable=False, default="NORMAL")
    priority_at = db.Column(db.DateTime)
    # Who cancelled, for the cancellation analytics: PATIENT or STAFF.
    cancelled_by = db.Column(db.String(10))
    # An unguessable token for the no-login tracking link. The appointment ID is
    # sequential, so it is never used as the key to a public page.
    track_token = db.Column(db.String(32), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = db.relationship("User")
    doctor = db.relationship("Doctor")

    __table_args__ = (
        db.CheckConstraint("patient_id IS NOT NULL OR walk_in_name IS NOT NULL", name="appointments_patient_or_walk_in"),
        # Double booking is impossible at the data layer: a slot can have at most
        # one appointment that is not cancelled.
        db.Index(
            "appointments_one_active_per_slot",
            "slot_id",
            unique=True,
            sqlite_where=db.text("status <> 'CANCELLED'"),
        ),
        # Two patients can never hold the same queue number.
        db.Index(
            "appointments_unique_token",
            "doctor_id",
            "appointment_date",
            "token_number",
            unique=True,
            sqlite_where=db.text("token_number IS NOT NULL"),
        ),
        db.Index("appointments_patient_idx", "patient_id"),
        db.Index("appointments_date_idx", "appointment_date", "doctor_id"),
    )

    @property
    def patient_name(self):
        return self.patient.name if self.patient else self.walk_in_name

    @property
    def is_walk_in(self):
        return self.patient_id is None


class QrCode(db.Model):
    """A one-time code staff show at the desk. Scanning it lets a patient book
    themselves into one doctor's queue for today, from their own phone."""

    __tablename__ = "qr_codes"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(32), nullable=False, unique=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    doctor = db.relationship("Doctor")
    appointment = db.relationship("Appointment")
