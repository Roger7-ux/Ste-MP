import sqlite3

from server import create_app


def test_an_older_database_gains_its_missing_columns(tmp_path):
    """An appointments table from before queue numbers existed."""
    path = tmp_path / "old.db"
    connection = sqlite3.connect(path)
    connection.executescript(
        """
        CREATE TABLE doctors (id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL, specialization VARCHAR(40) NOT NULL,
            consultation_fee FLOAT NOT NULL);
        CREATE TABLE appointments (id INTEGER PRIMARY KEY, appointment_id VARCHAR(40) NOT NULL, doctor_id INTEGER NOT NULL,
            walk_in_name VARCHAR(100), appointment_date VARCHAR(10) NOT NULL, appointment_time VARCHAR(5) NOT NULL,
            consultation_fee FLOAT NOT NULL, status VARCHAR(16) NOT NULL, track_token VARCHAR(32) NOT NULL);
        INSERT INTO doctors (name, specialization, consultation_fee) VALUES ('Dr. Old', 'ENT', 300);
        INSERT INTO appointments (appointment_id, doctor_id, walk_in_name, appointment_date, appointment_time,
            consultation_fee, status, track_token) VALUES ('DO-1', 1, 'Kept', '2026-01-01', '10:00', 300, 'COMPLETED', 'abc');
        """
    )
    connection.commit()
    connection.close()

    app = create_app({"TESTING": True, "SECRET_KEY": "x", "SQLALCHEMY_DATABASE_URI": f"sqlite:///{path.as_posix()}"})

    connection = sqlite3.connect(path)
    columns = {row[1] for row in connection.execute("PRAGMA table_info(appointments)")}
    kept = connection.execute("SELECT walk_in_name, priority, token_number FROM appointments").fetchall()
    doctor = connection.execute("SELECT room, languages FROM doctors").fetchall()
    connection.close()
    assert {"token_number", "priority", "checked_in_at", "patient_id", "created_at"} <= columns
    assert kept == [("Kept", "NORMAL", None)]
    assert doctor[0][0] == ""
    # The upgraded database serves requests.
    listed = app.test_client().get("/api/doctors").get_json()["doctors"]
    assert listed[0]["name"] == "Dr. Old" and listed[0]["languages"] == []
