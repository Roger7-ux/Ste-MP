from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from ..utils.time import utcnow


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    # Stored in lower case, so it is unique regardless of letter case.
    email = db.Column(db.String(254), nullable=False, unique=True, index=True)
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(255), nullable=False)  # never plain text
    role = db.Column(db.String(10), nullable=False, default="PATIENT")
    # A doctor's account points at their profile in the doctor directory.
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), unique=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Never includes the password hash; safe to return to clients."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "doctorId": self.doctor_id,
        }
