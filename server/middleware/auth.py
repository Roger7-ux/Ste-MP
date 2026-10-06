from functools import wraps

from flask_login import current_user

from ..utils.constants import MESSAGES
from ..utils.errors import HttpError


def role_required(*roles):
    """Guards a route: 401 when nobody is signed in, 403 for the wrong role.
    With no roles given, any signed-in user may pass."""

    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if not current_user.is_authenticated:
                raise HttpError(401, MESSAGES.login_required)
            if roles and current_user.role not in roles:
                raise HttpError(403, MESSAGES.not_authorized)
            return view(*args, **kwargs)

        return wrapped

    return decorator


require_patient = role_required("PATIENT")
require_staff = role_required("STAFF")
require_doctor = role_required("DOCTOR")
