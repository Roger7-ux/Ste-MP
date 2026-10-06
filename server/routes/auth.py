from flask import Blueprint, request, session
from flask_login import current_user, login_user, logout_user
from flask_wtf.csrf import generate_csrf

from ..middleware.auth import role_required
from ..services import auth_service
from ..utils.errors import assert_valid
from ..utils.request import body
from ..utils.validation import validate_login, validate_profile, validate_registration, validate_team_registration

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.get("/csrf")
def csrf_token():
    """The token the browser must send back in the X-CSRFToken header."""
    return {"csrfToken": generate_csrf()}


@bp.post("/register")
def register():
    errors, values = validate_registration(body())
    assert_valid(errors)
    user = auth_service.register_patient(values)
    return {"message": "Account created. You can now log in.", "user": user.to_dict()}, 201


@bp.post("/register-staff")
def register_team_member():
    errors, values = validate_team_registration(body())
    assert_valid(errors)
    user = auth_service.register_team_member(values, request.remote_addr)
    return {"message": "Account created. You can now sign in.", "user": user.to_dict()}, 201


@bp.post("/login")
def log_in():
    errors, values = validate_login(body())
    assert_valid(errors)
    user = auth_service.login(values["email"], values["password"], values["role"])
    login_user(user)
    session.permanent = True  # applies the session timeout from config.py
    return {"user": user.to_dict()}


@bp.post("/logout")
def log_out():
    logout_user()
    return {"message": "Logged out"}


@bp.get("/me")
def me():
    return {"user": current_user.to_dict() if current_user.is_authenticated else None}


@bp.patch("/me")
@role_required()
def update_me():
    errors, values = validate_profile(body(), phone_required=current_user.role == "PATIENT")
    assert_valid(errors)
    return {"user": auth_service.update_profile(current_user, values).to_dict()}
