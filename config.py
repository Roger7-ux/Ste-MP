"""Application settings. Every value can be overridden with an environment
variable of the same name; none of them needs to be set to run the project."""
import os
import secrets
from datetime import timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

DEFAULT_CLINIC_CODE = "CLINIC-2026"


def _flag(name):
    """An on/off setting from the environment: 1, true, yes or on."""
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes", "on")

# Where the SQLite file and the session secret live: a "data" folder inside
# the project, so the whole system is one folder that can be copied to another
# computer. Delete the folder to start again with an empty database.
DATA_DIR = Path(os.environ.get("CLINIC_DATA_DIR") or ROOT_DIR / "data")


def _secret_key():
    """A random secret, created once and reused so sessions survive a restart."""
    if os.environ.get("SECRET_KEY"):
        return os.environ["SECRET_KEY"]
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    key_file = DATA_DIR / "secret.key"
    if not key_file.exists():
        key_file.write_text(secrets.token_hex(32), encoding="utf-8")
    return key_file.read_text(encoding="utf-8").strip()


class Config:
    # --- Server ---
    HOST = os.environ.get("HOST", "127.0.0.1")
    PORT = int(os.environ.get("PORT", 5000))

    # --- Database ---
    DATABASE_PATH = DATA_DIR / "clinic.db"
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or f"sqlite:///{DATABASE_PATH.as_posix()}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # SQLite: wait up to 15 seconds for a lock instead of failing at once.
    SQLALCHEMY_ENGINE_OPTIONS = (
        {"connect_args": {"timeout": 15}} if SQLALCHEMY_DATABASE_URI.startswith("sqlite") else {}
    )

    # --- Sessions (Flask-Login) ---
    SECRET_KEY = None  # filled in by create_app, so importing this file writes nothing
    PERMANENT_SESSION_LIFETIME = timedelta(hours=int(os.environ.get("SESSION_HOURS", 8)))
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    # Set HTTPS=1 when the site is served over https, so the session cookie is
    # never sent over plain http. Leave it off for http://localhost.
    SESSION_COOKIE_SECURE = _flag("HTTPS")

    # --- Hosting ---
    # Set TRUST_PROXY=1 when a hosting service or reverse proxy sits in front,
    # so the visitor's real address and https are seen instead of the proxy's.
    TRUST_PROXY = _flag("TRUST_PROXY")

    # --- CSRF (Flask-WTF) ---
    # The token lives as long as the session, so a long shift never hits an
    # expired form.
    WTF_CSRF_TIME_LIMIT = None

    # --- Sign-up ---
    # Doctors and staff need this code to create an account. Change it before
    # sharing the system; set it to an empty string to switch that sign-up off.
    CLINIC_CODE = os.environ.get("CLINIC_CODE", DEFAULT_CLINIC_CODE).strip()

    # --- Frontend ---
    CLIENT_DIST = ROOT_DIR / "client" / "dist"

    @staticmethod
    def secret_key():
        return _secret_key()
