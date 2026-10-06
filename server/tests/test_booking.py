"""Doctors, slots, booking, cancelling and rescheduling."""
from server.utils.time import today_date

from .conftest import open_day


def add_slot(staff, doctor_id, date=None, start="10:00"):
    made = staff.post(f"/api/staff/doctors/{doctor_id}/slots", json={"date": date or open_day(), "startTime": start})
    assert made.status_code == 201, made.get_json()
    return made.get_json()["slot"]


def book(api, doctor_id, slot_id, reason=""):
    return api.post("/api/appointments", json={"doctorId": doctor_id, "slotId": slot_id, "reason": reason})


def test_staff_add_and_edit_a_doctor(staff, doctor_profile, browser):
    doctor = doctor_profile()
    assert doctor["consultationFee"] == 500 and doctor["hasAvailableSlots"] is False
    edited = staff.patch(
        f"/api/staff/doctors/{doctor['id']}",
        json={"name": "Dr. Rahul Sharma", "specialization": "Cardiology", "consultationFee": "650", "languages": "English, Hindi"},
    ).get_json()["doctor"]
    assert edited["consultationFee"] == 650 and edited["languages"] == ["English", "Hindi"]
    bad = staff.patch(f"/api/staff/doctors/{doctor['id']}", json={"name": "", "specialization": "Magic", "consultationFee": -1})
    assert set(bad.get_json()["errors"]) == {"name", "specialization", "consultationFee"}
    # Anyone can browse the directory and filter it.
    assert len(browser().get("/api/doctors?specialization=Cardiology").get_json()["doctors"]) == 1
    assert browser().get("/api/doctors?specialization=ENT").get_json()["doctors"] == []
    assert browser().get("/api/doctors/999").status_code == 404


def test_slot_rules(staff, doctor_profile):
    doctor = doctor_profile()
    slot = add_slot(staff, doctor["id"])
    assert slot["endTime"] == "10:30" and slot["status"] == "AVAILABLE"
    path = f"/api/staff/doctors/{doctor['id']}/slots"
    duplicate = staff.post(path, json={"date": open_day(), "startTime": "10:00"})
    assert duplicate.status_code == 409 and "startTime" in duplicate.get_json()["errors"]
    assert "date" in staff.post(path, json={"date": today_date(-1), "startTime": "10:00"}).get_json()["errors"]
    assert "startTime" in staff.post(path, json={"date": open_day(), "startTime": "07:00"}).get_json()["errors"]
    assert "endTime" in staff.post(path, json={"date": open_day(), "startTime": "11:00", "endTime": "10:00"}).get_json()["errors"]

    moved = staff.patch(f"/api/staff/slots/{slot['id']}", json={"startTime": "12:00"}).get_json()["slot"]
    assert (moved["startTime"], moved["endTime"]) == ("12:00", "12:30")
    assert staff.delete(f"/api/staff/slots/{slot['id']}").status_code == 200
    assert staff.get(path).get_json()["slots"] == []


def test_booking_gives_an_id_and_takes_the_slot(staff, doctor_profile, patient):
    doctor = doctor_profile()
    slot = add_slot(staff, doctor["id"])
    api = patient()
    made = book(api, doctor["id"], slot["id"], "Chest pain")
    assert made.status_code == 201
    appointment = made.get_json()["appointment"]
    assert appointment["appointmentId"].startswith("RS-") and appointment["status"] == "BOOKED"
    assert appointment["consultationFee"] == 500 and appointment["reason"] == "Chest pain"
    assert len(appointment["trackToken"]) == 32 and appointment["tokenNumber"] is None

    listed = api.get(f"/api/doctors/{doctor['id']}/slots").get_json()
    assert [s["status"] for s in listed["slots"]] == ["BOOKED"] and listed["doctor"]["openSlots"] == 0
    # Booked slots cannot be edited or removed.
    assert staff.delete(f"/api/staff/slots/{slot['id']}").status_code == 409


def test_a_slot_cannot_be_booked_twice(staff, doctor_profile, patient):
    doctor = doctor_profile()
    slot = add_slot(staff, doctor["id"])
    assert book(patient(), doctor["id"], slot["id"]).status_code == 201
    second = book(patient("other@example.com"), doctor["id"], slot["id"])
    assert second.status_code == 409 and "just booked" in second.get_json()["message"]


def test_patients_only_see_their_own_appointments(staff, doctor_profile, patient):
    doctor = doctor_profile()
    slot = add_slot(staff, doctor["id"])
    owner, other = patient(), patient("other@example.com")
    appointment = book(owner, doctor["id"], slot["id"]).get_json()["appointment"]
    assert len(owner.get("/api/appointments").get_json()["appointments"]) == 1
    assert other.get("/api/appointments").get_json()["appointments"] == []
    assert other.get(f"/api/appointments/{appointment['id']}").status_code == 404
    assert other.post(f"/api/appointments/{appointment['id']}/cancel").status_code == 404


def test_cancel_reopens_the_slot(staff, doctor_profile, patient):
    doctor = doctor_profile()
    slot = add_slot(staff, doctor["id"])
    api = patient()
    appointment = book(api, doctor["id"], slot["id"]).get_json()["appointment"]
    cancelled = api.post(f"/api/appointments/{appointment['id']}/cancel").get_json()["appointment"]
    assert cancelled["status"] == "CANCELLED" and cancelled["cancelledBy"] == "PATIENT"
    assert book(patient("other@example.com"), doctor["id"], slot["id"]).status_code == 201
    # A cancelled appointment cannot be cancelled again.
    assert api.post(f"/api/appointments/{appointment['id']}/cancel").status_code == 409


def test_reschedule_keeps_the_id_and_swaps_slots(staff, doctor_profile, patient):
    doctor = doctor_profile()
    first, second = add_slot(staff, doctor["id"]), add_slot(staff, doctor["id"], start="11:00")
    api = patient()
    appointment = book(api, doctor["id"], first["id"]).get_json()["appointment"]
    moved = api.post(f"/api/appointments/{appointment['id']}/reschedule", json={"slotId": second["id"]}).get_json()["appointment"]
    assert moved["appointmentId"] == appointment["appointmentId"] and moved["time"] == "11:00"
    statuses = {s["startTime"]: s["status"] for s in api.get(f"/api/doctors/{doctor['id']}/slots").get_json()["slots"]}
    assert statuses == {"10:00": "AVAILABLE", "11:00": "BOOKED"}


def test_schedule_search_and_analytics(staff, doctor_profile, patient):
    doctor = doctor_profile()
    slot = add_slot(staff, doctor["id"])
    appointment = book(patient(), doctor["id"], slot["id"]).get_json()["appointment"]

    week = staff.get(f"/api/staff/schedule?start={open_day()}").get_json()
    assert len(week["days"]) == 7 and len(week["slots"]) == 1 and len(week["doctors"]) == 1

    by_name = staff.get("/api/staff/appointments?q=asha").get_json()["appointments"]
    by_id = staff.get(f"/api/staff/appointments?q={appointment['appointmentId']}").get_json()["appointments"]
    assert len(by_name) == 1 and len(by_id) == 1 and by_name[0]["allowedNextStatuses"] == ["WAITING", "CANCELLED", "NO_SHOW"]
    assert staff.get("/api/staff/appointments?q=nobody").get_json()["appointments"] == []

    report = staff.get("/api/staff/analytics?days=7").get_json()
    assert report["days"] == 7 and len(report["daily"]) == 7 and report["doctors"][0]["doctorName"] == "Dr. Rahul Sharma"
    stats = staff.get("/api/stats").get_json()["stats"]
    assert (stats["doctors"], stats["specialties"], stats["openSlots"]) == (1, 1, 0)


def test_open_slots_are_counted_for_this_week(staff, doctor_profile, browser):
    doctor = doctor_profile()
    soon = open_day()  # within the next seven days
    later = open_day(8)  # next week
    add_slot(staff, doctor["id"], soon, "10:00")
    add_slot(staff, doctor["id"], soon, "11:00")
    add_slot(staff, doctor["id"], later, "10:00")
    listed = browser().get("/api/doctors").get_json()["doctors"][0]
    assert (listed["openSlotsThisWeek"], listed["openSlots"]) == (2, 3)
    stats = browser().get("/api/stats").get_json()["stats"]
    assert (stats["openSlotsThisWeek"], stats["openSlots"]) == (2, 3)
