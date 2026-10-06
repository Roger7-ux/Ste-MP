-- Reference copy of the schema, for reading and for the project report.
-- The application does not run this file: it creates and upgrades the
-- SQLite database itself on start (see server/models and server/migrate.py).

CREATE TABLE doctors (
	id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	specialization VARCHAR(40) NOT NULL, 
	consultation_fee FLOAT NOT NULL, 
	description VARCHAR(160) NOT NULL, 
	bio TEXT NOT NULL, 
	room VARCHAR(20) NOT NULL, 
	years_experience INTEGER, 
	languages JSON NOT NULL, 
	photo_url VARCHAR(500), 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT doctors_fee_not_negative CHECK (consultation_fee >= 0)
);


CREATE TABLE doctor_slots (
	id INTEGER NOT NULL, 
	doctor_id INTEGER NOT NULL, 
	date VARCHAR(10) NOT NULL, 
	start_time VARCHAR(5) NOT NULL, 
	end_time VARCHAR(5) NOT NULL, 
	status VARCHAR(10) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT doctor_slots_unique_start UNIQUE (doctor_id, date, start_time), 
	CONSTRAINT doctor_slots_end_after_start CHECK (end_time > start_time), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (id)
);

CREATE INDEX doctor_slots_doctor_date_idx ON doctor_slots (doctor_id, date);

CREATE TABLE users (
	id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	email VARCHAR(254) NOT NULL, 
	phone VARCHAR(20), 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(10) NOT NULL, 
	doctor_id INTEGER, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (doctor_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE appointments (
	id INTEGER NOT NULL, 
	appointment_id VARCHAR(40) NOT NULL, 
	patient_id INTEGER, 
	walk_in_name VARCHAR(100), 
	doctor_id INTEGER NOT NULL, 
	slot_id INTEGER, 
	appointment_date VARCHAR(10) NOT NULL, 
	appointment_time VARCHAR(5) NOT NULL, 
	consultation_fee FLOAT NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	reason VARCHAR(500), 
	token_number INTEGER, 
	checked_in_at DATETIME, 
	called_at DATETIME, 
	started_at DATETIME, 
	completed_at DATETIME, 
	previous_status VARCHAR(16), 
	status_changed_at DATETIME, 
	priority VARCHAR(10) NOT NULL, 
	priority_at DATETIME, 
	cancelled_by VARCHAR(10), 
	track_token VARCHAR(32) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT appointments_patient_or_walk_in CHECK (patient_id IS NOT NULL OR walk_in_name IS NOT NULL), 
	UNIQUE (appointment_id), 
	FOREIGN KEY(patient_id) REFERENCES users (id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (id), 
	FOREIGN KEY(slot_id) REFERENCES doctor_slots (id) ON DELETE SET NULL, 
	UNIQUE (track_token)
);

CREATE INDEX appointments_date_idx ON appointments (appointment_date, doctor_id);
CREATE UNIQUE INDEX appointments_one_active_per_slot ON appointments (slot_id) WHERE status <> 'CANCELLED';
CREATE INDEX appointments_patient_idx ON appointments (patient_id);
CREATE UNIQUE INDEX appointments_unique_token ON appointments (doctor_id, appointment_date, token_number) WHERE token_number IS NOT NULL;

CREATE TABLE qr_codes (
	id INTEGER NOT NULL, 
	code VARCHAR(32) NOT NULL, 
	doctor_id INTEGER NOT NULL, 
	date VARCHAR(10) NOT NULL, 
	appointment_id INTEGER, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (code), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (id)
);

