"""The day's queue: check-in, calling, the doctor's dashboard, walk-ins, QR
codes, not arrived and restore, the reset, and the public screens."""
from datetime import timedelta

from server.extensions import db
from server.models import Appointment
from server.utils.time import today_date


def walk_in(staff, doctor_id, name="Walk In", priority="NORMAL"):
    made = staff.post("/api/staff/walk-ins", json={"name": name, "doctorId": doctor_id, "priority": priority})
    assert made.status_code == 201, made.get_json()
    return made.get_json()["appointment"]


def set_status(staff, appointment, status):
    return staff.patch(f"/api/staff/appointments/{appointment['id']}/status", json={"status": status})


def board(staff):
    return {a["appointmentId"]: a for a in staff.get("/api/staff/queue").get_json()["appointments"]}


def waiting_order(staff):
    waiting = [a for a in board(staff).values() if a["status"] == "WAITING"]
    return [a["patientName"] for a in sorted(waiting, key=lambda a: a["queue"]["position"])]


def test_booked_visit_goes_through_the_whole_flow(staff, doctor_profile, doctor_login, patient, slot_today):
    doctor = doctor_profile()
    as_doctor, as_patient = doctor_login(doctor["id"]), patient()
    booked = as_patient.post("/api/appointments", json={"doctorId": doctor["id"], "slotId": slot_today(doctor["id"])})
    appointment = booked.get_json()["appointment"]
    assert as_patient.get("/api/patient/token-status").get_json()["appointment"]["status"] == "BOOKED"

    checked_in = set_status(staff, appointment, "WAITING").get_json()["appointment"]
    assert checked_in["tokenNumber"] == 1 and checked_in["queue"]["isNext"] is True
    assert as_doctor.get("/api/doctor/next-token").get_json()["next"]["appointmentId"] == appointment["appointmentId"]

    called = staff.post("/api/staff/call-next-token", json={"doctorId": doctor["id"]}).get_json()["appointment"]
    assert called["id"] == appointment["id"] and called["status"] == "CALLED"
    mine = as_patient.get("/api/patient/token-status").get_json()["appointment"]
    assert mine["status"] == "CALLED" and mine["room"] == "101"
    assert as_doctor.get("/api/doctor/next-token").get_json()["current"]["patientName"] == "Asha Rao"

    released = as_doctor.post("/api/doctor/release-token").get_json()["appointment"]
    assert released["status"] == "COMPLETED" and released["timeline"]["startedAt"]
    assert as_patient.get(f"/api/appointments/{appointment['id']}").get_json()["appointment"]["status"] == "COMPLETED"
    stats = as_doctor.get("/api/doctor/stats").get_json()["stats"]
    assert (stats["total"], stats["completed"], stats["waiting"]) == (1, 1, 0)
    assert as_doctor.post("/api/doctor/release-token").status_code == 409


def test_status_can_only_follow_allowed_steps_and_be_undone(staff, doctor_profile):
    doctor = doctor_profile()
    appointment = walk_in(staff, doctor["id"])
    assert set_status(staff, appointment, "COMPLETED").status_code == 409
    assert set_status(staff, appointment, "NONSENSE").status_code == 400
    assert set_status(staff, appointment, "CALLED").get_json()["appointment"]["canUndo"] is True
    undone = staff.post(f"/api/staff/appointments/{appointment['id']}/undo").get_json()["appointment"]
    assert undone["status"] == "WAITING" and undone["timeline"]["calledAt"] is None
    assert staff.post(f"/api/staff/appointments/{appointment['id']}/undo").status_code == 409


def test_queue_numbers_run_per_doctor_and_restart_each_day(app, staff, doctor_profile):
    first, second = doctor_profile(), doctor_profile("Dr. Anita Rao", "ENT")
    tokens = [walk_in(staff, first["id"])["tokenNumber"], walk_in(staff, first["id"])["tokenNumber"], walk_in(staff, second["id"])["tokenNumber"]]
    assert tokens == [1, 2, 1]
    with app.app_context():
        yesterday = today_date(-1)
        Appointment.query.update({"appointment_date": yesterday})
        db.session.commit()
    assert walk_in(staff, first["id"])["tokenNumber"] == 1


def test_emergency_goes_first_and_others_are_told(staff, doctor_profile):
    doctor = doctor_profile()
    walk_in(staff, doctor["id"], "First")
    walk_in(staff, doctor["id"], "Second")
    urgent = walk_in(staff, doctor["id"], "Urgent", "EMERGENCY")
    assert urgent["queue"]["position"] == 1 and waiting_order(staff) == ["Urgent", "First", "Second"]
    others = [a for a in board(staff).values() if a["patientName"] != "Urgent"]
    assert all(a["queue"]["emergencyAhead"] for a in others)
    # Clearing the mark sends them back behind earlier arrivals.
    staff.patch(f"/api/staff/appointments/{urgent['id']}/priority", json={"priority": "NORMAL"})
    assert waiting_order(staff) == ["First", "Second", "Urgent"]
    # The default for the desk's walk-in tool stays an emergency.
    assert staff.post("/api/staff/walk-ins", json={"name": "Default", "doctorId": doctor["id"]}).get_json()["appointment"]["priority"] == "EMERGENCY"


def test_wait_estimate_uses_the_default_until_a_visit_finishes(staff, doctor_profile):
    doctor = doctor_profile()
    walk_in(staff, doctor["id"], "A")
    walk_in(staff, doctor["id"], "B")
    third = walk_in(staff, doctor["id"], "C")
    assert third["queue"] == {"position": 3, "ahead": 2, "isNext": False, "estimatedWaitMinutes": 30, "emergencyAhead": False}
    staff.post("/api/staff/call-next-token", json={"doctorId": doctor["id"]})
    # One with the doctor, one ahead: two visits before C.
    assert board(staff)[third["appointmentId"]]["queue"]["estimatedWaitMinutes"] == 30


def test_not_arrived_then_restore_returns_to_the_same_place(app, staff, doctor_profile):
    doctor = doctor_profile()
    first = walk_in(staff, doctor["id"], "First")
    walk_in(staff, doctor["id"], "Second")
    walk_in(staff, doctor["id"], "Third")
    with app.app_context():  # spread the check-in times so the order is unambiguous
        for index, row in enumerate(Appointment.query.order_by(Appointment.id).all()):
            row.checked_in_at = row.checked_in_at - timedelta(minutes=10 - index)
        db.session.commit()

    staff.post("/api/staff/call-next-token", json={"doctorId": doctor["id"]})
    marked = staff.post("/api/staff/mark-not-arrived", json={"appointmentId": first["id"]}).get_json()["appointment"]
    assert marked["status"] == "NO_SHOW" and marked["canRestore"] is True
    assert waiting_order(staff) == ["Second", "Third"]

    restored = staff.post("/api/staff/restore-token", json={"appointmentId": first["id"]}).get_json()["appointment"]
    assert restored["status"] == "WAITING" and restored["tokenNumber"] == first["tokenNumber"]
    assert waiting_order(staff) == ["First", "Second", "Third"]
    # Only someone marked as not arrived can be restored.
    assert staff.post("/api/staff/restore-token", json={"appointmentId": first["id"]}).status_code == 409
    assert staff.post("/api/staff/mark-not-arrived", json={"appointmentId": 9999}).status_code == 404


def test_qr_code_books_a_patient_into_the_queue_once(staff, doctor_profile, browser):
    doctor = doctor_profile()
    walk_in(staff, doctor["id"])
    made = staff.post("/api/staff/generate-qr-token", json={"doctorId": doctor["id"]}).get_json()
    assert made["bookingPath"] == f"/book/{made['code']}"

    phone = browser()
    seen = phone.get(f"/api/qr/{made['code']}").get_json()
    assert seen["doctor"]["name"] == "Dr. Rahul Sharma" and seen["used"] is False
    assert phone.post(f"/api/qr/{made['code']}/book").status_code == 400  # a name is needed
    booked = phone.post(f"/api/qr/{made['code']}/book", json={"name": "Ravi"}).get_json()
    assert booked["appointment"]["status"] == "WAITING" and booked["appointment"]["tokenNumber"] == 2
    assert "patientName" not in booked["appointment"]
    assert phone.get(f"/api/track/{booked['trackToken']}").get_json()["appointment"]["queue"]["position"] == 2
    assert waiting_order(staff) == ["Walk In", "Ravi"]
    assert phone.post(f"/api/qr/{made['code']}/book", json={"name": "Ravi"}).status_code == 409
    assert phone.get("/api/qr/unknown").status_code == 404


def test_qr_code_attaches_to_a_signed_in_patient(staff, doctor_profile, patient):
    doctor = doctor_profile()
    code = staff.post("/api/staff/generate-qr-token", json={"doctorId": doctor["id"]}).get_json()["code"]
    api = patient()
    assert api.post(f"/api/qr/{code}/book").status_code == 201
    mine = api.get("/api/patient/token-status").get_json()["appointment"]
    assert mine["status"] == "WAITING" and mine["patientName"] == "Asha Rao"


def test_tracking_link_hides_the_patient(staff, doctor_profile, browser):
    doctor = doctor_profile()
    appointment = walk_in(staff, doctor["id"], "Private Name")
    public = browser().get(f"/api/track/{appointment['trackToken']}").get_json()["appointment"]
    assert public["appointmentId"] == appointment["appointmentId"] and public["live"]["expectedTime"]
    assert "patientName" not in public and "reason" not in public
    assert browser().get("/api/track/not-a-token").status_code == 404


def test_end_of_day_reset_closes_the_queue(staff, doctor_profile):
    doctor = doctor_profile()
    walk_in(staff, doctor["id"], "A")
    walk_in(staff, doctor["id"], "B")
    staff.post("/api/staff/call-next-token", json={"doctorId": doctor["id"]})
    code = staff.post("/api/staff/generate-qr-token", json={"doctorId": doctor["id"]}).get_json()["code"]
    assert staff.post("/api/staff/reset-tokens").get_json()["closed"] == 2
    # The patient with the doctor is completed; the one still waiting did not get seen.
    assert {a["patientName"]: a["status"] for a in board(staff).values()} == {"A": "COMPLETED", "B": "NO_SHOW"}
    assert staff.get(f"/api/qr/{code}").status_code == 404


def test_board_figures_display_and_pace(staff, doctor_profile, browser):
    doctor = doctor_profile()
    walk_in(staff, doctor["id"], "Private Name")
    walk_in(staff, doctor["id"], "Other")
    called = staff.post("/api/staff/call-next-token", json={"doctorId": doctor["id"]}).get_json()["appointment"]

    data = staff.get("/api/staff/queue-status").get_json()
    kpis = data["kpis"]
    assert (kpis["total"]["value"], kpis["waiting"]["value"], kpis["completed"]["value"]) == (2, 1, 0)
    assert len(kpis["total"]["series"]) == len(kpis["hours"]) and str(doctor["id"]) in data["delays"]

    screen = browser().get("/api/display").get_json()
    room = screen["rooms"][0]
    assert room["room"] == "101" and room["nowServing"][0]["tokenNumber"] == 1 and room["next"][0]["tokenNumber"] == 2
    assert screen["lastCalled"]["appointmentId"] == called["appointmentId"] and screen["lastCalled"]["tokenNumber"] == 1
    assert "Private Name" not in str(screen)

    listed = browser().get("/api/doctors").get_json()["doctors"][0]
    assert listed["waiting"] == 1 and listed["delayMinutes"] == 0


def test_description_paths_work_without_the_api_prefix(staff, doctor_profile, doctor_login):
    doctor = doctor_profile()
    as_doctor = doctor_login(doctor["id"])
    assert staff.post("/staff/generate-token", json={"name": "A", "doctorId": doctor["id"]}).status_code == 201
    assert staff.post("/staff/call-next-token", json={"doctorId": doctor["id"]}).status_code == 200
    assert as_doctor.post("/doctor/release-token").status_code == 200
    assert staff.post("/staff/reset-tokens").status_code == 200


def test_the_doctors_one_button_completes_the_current_patient_and_calls_the_next(staff, doctor_profile, doctor_login, browser):
    doctor = doctor_profile()
    as_doctor = doctor_login(doctor["id"])
    assert as_doctor.post("/api/doctor/call-next-token").status_code == 409  # nobody is waiting
    first = walk_in(staff, doctor["id"], "First")
    walk_in(staff, doctor["id"], "Second")

    result = as_doctor.post("/api/doctor/call-next-token").get_json()
    assert result["completed"] is None and result["appointment"]["patientName"] == "First"
    # The front desk and the waiting-room screen see the call at once.
    assert board(staff)[first["appointmentId"]]["status"] == "CALLED"
    assert browser().get("/api/display").get_json()["lastCalled"]["tokenNumber"] == 1

    # Pressed again: First is completed and Second is called, in one step.
    result = as_doctor.post("/api/doctor/call-next-token").get_json()
    assert result["completed"]["patientName"] == "First" and result["completed"]["status"] == "COMPLETED"
    assert result["appointment"]["patientName"] == "Second" and result["appointment"]["status"] == "CALLED"
    assert board(staff)[first["appointmentId"]]["timeline"]["completedAt"]

    # Pressed with nobody left waiting: the last patient is completed.
    result = as_doctor.post("/api/doctor/call-next-token").get_json()
    assert result["completed"]["patientName"] == "Second" and result["appointment"] is None
    assert as_doctor.post("/api/doctor/call-next-token").status_code == 409
    # Staff cannot use the doctor's button.
    assert staff.post("/api/doctor/call-next-token").status_code == 403


def test_the_doctor_skips_a_called_patient_who_did_not_come(staff, doctor_profile, doctor_login):
    doctor = doctor_profile()
    as_doctor = doctor_login(doctor["id"])
    first = walk_in(staff, doctor["id"], "First")
    walk_in(staff, doctor["id"], "Second")
    assert as_doctor.post("/api/doctor/skip-token").status_code == 409  # nobody has been called
    as_doctor.post("/api/doctor/call-next-token")
    skipped = as_doctor.post("/api/doctor/skip-token").get_json()["appointment"]
    assert skipped["id"] == first["id"] and skipped["status"] == "NO_SHOW"
    # The doctor carries on, and the skipped visit is not counted as completed.
    result = as_doctor.post("/api/doctor/call-next-token").get_json()
    assert result["completed"] is None and result["appointment"]["patientName"] == "Second"
    # It stays on the patient's record as not arrived, and the desk can restore it.
    record = next(r for r in staff.get("/api/staff/patients").get_json()["patients"] if r["name"] == "First")
    assert (record["notArrivedVisits"], record["completedVisits"]) == (1, 0)
    assert staff.post("/api/staff/restore-token", json={"appointmentId": first["id"]}).status_code == 200


def test_completed_visits_are_kept_as_patient_records(staff, doctor_profile, doctor_login, patient, slot_today):
    doctor = doctor_profile()
    as_doctor, as_patient = doctor_login(doctor["id"]), patient()
    as_patient.post("/api/appointments", json={"doctorId": doctor["id"], "slotId": slot_today(doctor["id"]), "reason": "Cough"})
    booked = next(iter(board(staff).values()))
    set_status(staff, booked, "WAITING")
    walk_in(staff, doctor["id"], "Walk In")
    as_doctor.post("/api/doctor/call-next-token")
    as_doctor.post("/api/doctor/release-token")

    records = {r["name"]: r for r in staff.get("/api/staff/patients").get_json()["patients"]}
    asha = records["Asha Rao"]
    assert (asha["phone"], asha["isWalkIn"], asha["completedVisits"], asha["lastVisit"]) == ("9876543210", False, 1, booked["date"])
    assert asha["visits"][0]["reason"] == "Cough" and asha["visits"][0]["status"] == "COMPLETED"
    assert asha["visits"][0]["visitMinutes"] is not None
    assert records["Walk In"]["isWalkIn"] is True and records["Walk In"]["completedVisits"] == 0
    # Records are for the front desk only.
    assert as_patient.get("/api/staff/patients").status_code == 403
    assert as_doctor.get("/api/staff/patients").status_code == 403
