from .conftest import CLINIC_CODE, PASSWORD


def test_database_starts_empty(app):
    from server.models import Appointment, Doctor, DoctorSlot, User

    with app.app_context():
        assert [model.query.count() for model in (User, Doctor, DoctorSlot, Appointment)] == [0, 0, 0, 0]


def test_patient_registers_then_signs_in(patient):
    api = patient()
    assert api.user["role"] == "PATIENT"
    assert api.get("/api/auth/me").get_json()["user"]["email"] == "patient@example.com"


def test_password_is_stored_hashed(app, patient):
    from server.models import User

    patient()
    with app.app_context():
        stored = User.query.one().password_hash
    assert PASSWORD not in stored and stored.startswith(("scrypt:", "pbkdf2:"))


def test_registration_validates_input(browser):
    response = browser().post("/api/auth/register", json={"name": "", "email": "nope", "phone": "12", "password": "abc"})
    assert response.status_code == 400
    assert set(response.get_json()["errors"]) == {"name", "email", "phone", "password"}


def test_duplicate_email_is_rejected_whatever_the_case(patient, browser):
    patient()
    response = browser().post(
        "/api/auth/register",
        json={"name": "Other", "email": "PATIENT@example.com", "phone": "9876543210", "password": PASSWORD},
    )
    assert response.status_code == 409 and "email" in response.get_json()["errors"]


def test_login_logout(patient, browser):
    patient()
    api = browser()
    wrong = api.post("/api/auth/login", json={"email": "patient@example.com", "password": "wrong", "role": "PATIENT"})
    assert wrong.status_code == 401
    api.post("/api/auth/login", json={"email": "patient@example.com", "password": PASSWORD, "role": "PATIENT"})
    assert api.get("/api/auth/me").get_json()["user"]["name"] == "Asha Rao"
    api.post("/api/auth/logout")
    assert api.get("/api/auth/me").get_json()["user"] is None


def test_each_sign_in_screen_only_accepts_its_own_accounts(patient, staff, browser):
    patient()
    api = browser()
    on_staff_screen = api.post("/api/auth/login", json={"email": "patient@example.com", "password": PASSWORD, "role": "STAFF"})
    on_patient_screen = api.post("/api/auth/login", json={"email": "staff@example.com", "password": PASSWORD, "role": "PATIENT"})
    assert on_staff_screen.status_code == 401 and on_patient_screen.status_code == 401


def test_profile_update(patient):
    api = patient()
    saved = api.patch("/api/auth/me", json={"name": "Asha R", "email": "asha@example.com", "phone": "9123456780"})
    assert saved.get_json()["user"]["name"] == "Asha R"
    assert api.patch("/api/auth/me", json={"name": "", "email": "x", "phone": ""}).status_code == 400


def test_team_signup_needs_the_clinic_code(browser):
    values = {"name": "Front Desk", "email": "s@example.com", "password": PASSWORD, "role": "STAFF"}
    wrong = browser().post("/api/auth/register-staff", json={**values, "clinicCode": "guess"})
    assert wrong.status_code == 403 and "clinicCode" in wrong.get_json()["errors"]
    assert browser().post("/api/auth/register-staff", json={**values, "clinicCode": CLINIC_CODE}).status_code == 201


def test_doctor_signup_creates_a_profile_in_the_directory(browser):
    values = {"name": "Dr. Meera Nair", "email": "d@example.com", "password": PASSWORD, "role": "DOCTOR", "clinicCode": CLINIC_CODE}
    api = browser()
    assert "specialization" in api.post("/api/auth/register-staff", json=values).get_json()["errors"]
    made = api.post("/api/auth/register-staff", json={**values, "specialization": "ENT"}).get_json()["user"]
    assert made["role"] == "DOCTOR" and made["doctorId"]
    listed = api.get("/api/doctors").get_json()["doctors"]
    assert [(d["name"], d["specialization"], d["hasAccount"]) for d in listed] == [("Dr. Meera Nair", "ENT", True)]


def test_doctor_signup_can_claim_a_profile_once(doctor_profile, doctor_login, browser):
    profile = doctor_profile()
    doctor = doctor_login(profile["id"])
    assert doctor.user["doctorId"] == profile["id"]
    again = browser().post(
        "/api/auth/register-staff",
        json={"name": "X", "email": "x@example.com", "password": PASSWORD, "role": "DOCTOR", "doctorId": profile["id"], "clinicCode": CLINIC_CODE},
    )
    assert again.status_code == 409


def test_requests_without_a_csrf_token_are_refused(browser):
    response = browser().post(
        "/api/auth/register",
        json={"name": "A", "email": "a@example.com", "phone": "9876543210", "password": PASSWORD},
        csrf=False,
    )
    assert response.status_code == 400 and response.get_json()["code"] == "csrf"


def test_role_based_access(patient, staff, doctor_profile, doctor_login, browser):
    anonymous, as_patient, as_doctor = browser(), patient(), doctor_login(doctor_profile()["id"])
    assert anonymous.get("/api/staff/queue").status_code == 401
    assert anonymous.get("/api/appointments").status_code == 401
    assert as_patient.get("/api/staff/queue").status_code == 403
    assert as_patient.get("/api/doctor/next-token").status_code == 403
    assert as_doctor.post("/api/staff/reset-tokens").status_code == 403
    assert as_doctor.get("/api/appointments").status_code == 403
    assert staff.get("/api/appointments").status_code == 403
    assert staff.post("/api/doctor/release-token").status_code == 403
    assert staff.get("/api/staff/queue").status_code == 200
    assert as_doctor.get("/api/doctor/next-token").status_code == 200
