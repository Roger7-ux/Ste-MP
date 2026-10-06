from .auth import bp as auth_bp
from .doctor import bp as doctor_bp
from .patient import bp as patient_bp
from .public import bp as public_bp
from .staff import bp as staff_bp

BLUEPRINTS = (auth_bp, public_bp, patient_bp, doctor_bp, staff_bp)
