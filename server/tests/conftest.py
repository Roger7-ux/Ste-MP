import pytest

from server import create_app
from server.config.clinic import hours_on
from server.extensions import db
from server.models import DoctorSlot
from server.utils.time import today_date

CLINIC_CODE = "TEST-CODE"
PASSWORD = "secret1"


class Api:
    """A browser stand-in: keeps its own session cookie and sends the CSRF
    token with every request that changes something."""

    def __init__(self, app):
        self.client = app.test_client()
        self.csrf = None

    def _headers(self):
        if self.csrf is None:
            self.csrf = self.client.get("/api/auth/csrf").get_json()["csrfToken"]
        return {"X-CSRFToken": self.csrf}

    def get(self, path):
        return self.client.get(path)

    def post(self, path, json=None, csrf=True):
        return self.client.post(path, json=json or {}, headers=self._headers() if csrf else {})

    def patch(self, path, json=None):
        return self.client.patch(path, json=json or {}, headers=self._headers())

    def delete(self, path):
        return self.client.delete(path, headers=self._headers())

    def sign_up(self, path, portal, **values):
        made = self.post(path, json={"password": PASSWORD, **values})
        assert made.status_code == 201, made.get_json()
        signed_in = self.post("/api/auth/login", json={"email": values["email"], "password": PASSWORD, "role": portal})
        assert signed_in.status_code == 200, signed_in.get_json()
        self.user = signed_in.get_json()["user"]
        return self


@pytest.fixture
def app(tmp_path):
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
            "CLINIC_CODE": CLINIC_CODE,
        }
    )


@pytest.fixture
def browser(app):
    """Call it to open a fresh, signed-out browser."""
    return lambda: Api(app)


@pytest.fixture
def patient(browser):
    def make(email="patient@example.com", name="Asha Rao"):
        return browser().sign_up("/api/auth/register", "PATIENT", name=name, email=email, phone="9876543210")

    return make


@pytest.fixture
def staff(browser):
    return browser().sign_up(
        "/api/auth/register-staff", "STAFF", name="Front Desk", email="staff@example.com", role="STAFF", clinicCode=CLINIC_CODE
    )


@pytest.fixture
def doctor_profile(staff):
    """A doctor in the directory, created by staff. Returns its JSON."""

    def make(name="Dr. Rahul Sharma", specialization="Cardiology", fee=500):
        made = staff.post(
            "/api/staff/doctors", json={"name": name, "specialization": specialization, "consultationFee": fee, "room": "101"}
        )
        assert made.status_code == 201, made.get_json()
        return made.get_json()["doctor"]

    return make


@pytest.fixture
def doctor_login(browser):
    """A doctor's own account, claiming an existing profile."""

    def make(doctor_id, email="doctor@example.com"):
        return browser().sign_up(
            "/api/auth/register-staff",
            "STAFF",
            name="Rahul Sharma",
            email=email,
            role="DOCTOR",
            doctorId=doctor_id,
            clinicCode=CLINIC_CODE,
        )

    return make


def open_day(offset=1):
    """The first day from `offset` days ahead on which the clinic is open."""
    while not hours_on(today_date(offset)):
        offset += 1
    return today_date(offset)


@pytest.fixture
def slot_today(app):
    """A bookable slot for today, written straight to the database because
    the tests may run after closing time."""

    def make(doctor_id, start="23:58", end="23:59"):
        with app.app_context():
            slot = DoctorSlot(doctor_id=doctor_id, date=today_date(), start_time=start, end_time=end)
            db.session.add(slot)
            db.session.commit()
            return slot.id

    return make
