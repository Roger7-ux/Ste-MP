# MediQ — Smart Queue Management System

**Wait at home, not in the waiting room.**

A clinic appointment and queue system with three interfaces: patients, doctors and front-desk staff. Patients book a doctor's time slot or take a token at the desk, then follow their place in the queue live. Staff run the day from one board, and each call is announced in English and then Hindi.

This is the Logic Leakage hackathon project, kept whole and rebuilt as the Smart Queue Management System microproject: the backend is now Python (Flask, SQLAlchemy, SQLite) and the microproject's features are built into it. The interface is the original React app with its design, animations and transitions.

## Features

**Visitors (no account needed)**

- An opening animation, then a landing page with a dark hero band, live clinic figures, each doctor's real pace today and an animated preview of the queue tracker
- Doctor directory with search, specialty filters, sorting and an "Available today" switch; doctor profiles; specialty, About and Contact pages
- Light and dark themes

**Patients**

- Create an account, sign in, edit profile
- Book in three steps: choose a day and time, add an optional reason, review and confirm
- A confirmation ticket with the appointment ID and a calendar (.ics) download
- Ticket sharing: every appointment has a tracking link that opens the live ticket without an account and shows no personal details
- My appointments in Upcoming, Past and Cancelled tabs; cancel or reschedule while still Booked
- A live queue tracker: queue number, place in line, estimated wait, the doctor's delay and the time to expect
- A pop-up, a chime and a spoken announcement when called, on whichever page of the site is open; a message when next, and when an emergency goes ahead
- On-site booking by scanning a QR code at the front desk

**Doctors**

- Their own sign-in and dashboard: the patient called in, the waiting list in order, and the day's statistics
- One button, "Call next patient": it marks the current patient complete and calls the next; the staff board and waiting-room display show and announce the call
- "Skip: did not come" records a no-show; "Mark treatment complete" finishes without calling

**Staff**

- Dashboard for today as a board (Booked, Waiting, In consultation, Completed) with one-click status changes and Undo
- Walk-in tokens (normal or emergency) and QR codes for on-site booking
- Patient records: every patient with their visit history (completed, not arrived, cancelled), searchable
- Mark a patient as not arrived, and restore them to the queue in the place they had
- End-of-day reset
- Emergency priority, headline numbers with hour-by-hour trend lines, each doctor's pace
- Doctor-wise analytics over 7, 30 or 90 days; appointment lookup (Ctrl+K); weekly schedule
- Doctor profiles and time-slot management
- Time slots that renew themselves: patients can always book two weeks ahead, because each new day is filled in from the doctor's own timetable
- A full-screen waiting-room display (`/display`) with spoken announcements, showing IDs and queue numbers only, never names

**Rules enforced on the server**

- A slot can be booked by only one patient: a unique index allows at most one non-cancelled appointment per slot.
- Patients see and change only their own appointments. Every route checks the signed-in user's role.
- Status moves only along allowed steps: Booked → Waiting → Called → In consultation → Completed, with Cancelled and Not arrived as exits. Staff can undo the latest change for 30 seconds.
- Queue numbers run per doctor, per day, and start again at 1 each day. A unique index rejects a duplicate number.
- Emergency cases go first in a doctor's queue.
- Passwords are stored hashed. Sessions expire after 8 hours without use. Every request that changes data needs a CSRF token.
- Tracking links use a random token, never the appointment ID, and return no patient details.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask 3, Flask-SQLAlchemy |
| Database | SQLite, created and migrated automatically on start |
| Sign-in | Flask-Login sessions, Werkzeug password hashing, Flask-WTF CSRF protection |
| Live updates | Timed background requests (polling) |
| QR codes | `qrcode` (JavaScript) |
| Announcements | Web Speech API, English then Hindi |
| Interface | React 19, Vite, Tailwind CSS 4, Motion |
| Tests | pytest |

## Running it

Requires Python 3.9 or newer. Nothing else: no Node.js, no database server.

**On Windows:** double-click `run.bat`. It installs the Python packages the first time and starts the system.

**On any computer:**

```bash
pip install -r requirements.txt
python app.py
```

Then open http://localhost:5000. That one command starts the API and the interface.

A database made from nothing starts empty: no demo accounts, doctors or appointments. `MediQ.zip` comes with the six doctors and their time slots already loaded, and no accounts or appointments. To set the clinic up:

1. **Staff** create an account at `/staff/register` with the clinic code (default `CLINIC-2026`; change it, see Configuration).
2. Staff add doctors under **Doctors** and their time slots under **Availability**. Or load six doctors and two weeks of slots in one go (see below).
3. **Doctors** create an account at `/staff/register`, choose "Doctor", and pick their profile from the list (or start a new one).
4. **Patients** create an account at `/register` and book.

### Loading the doctors

```bash
python seed_doctors.py
```

This adds six doctors, one per specialty, with their fee, room, languages and bio, and their time slots for the next two weeks. It creates no accounts and no appointments. It is safe to run again: existing doctors are left alone and only missing future slots are added. The list is at the top of `seed_doctors.py`.

### Time slots renew themselves

Patients can book up to two weeks ahead. The app keeps that window full without anyone adding slots by hand: when it starts, and on the first visit of each new day while it stays running, it adds the days that are missing at the far end. Each new day repeats the doctor's own timetable: the times they had on the same weekday a week earlier, or on their latest working day if that weekday had none.

It only ever adds days after a doctor's last slot. Days that already have slots are left as they are, a day staff emptied on purpose stays empty, closed days are skipped, and a doctor who has never been given a slot gets none. To change a doctor's timetable, edit their latest week under **Availability** and the following weeks copy it. To take a doctor off the booking pages, remove all their upcoming slots: a doctor with none left is not renewed. (If no doctor at all has an upcoming slot, the app has not been run for a while, and everyone's timetable is resumed.)

### Where the data is kept

Everything is inside the project folder. The database is one file, `data/clinic.db`, created on the first start. To start again from nothing, stop the app and delete the `data` folder.

### Sharing the project

Send `MediQ.zip`, or copy the whole folder, to another computer and start it there the same way. The zip holds the project and a database with the doctors and their time slots only: no accounts, no appointments. However much later it is opened, the app brings the slots up to date on start.

Leave these out when you copy the folder by hand (the zip already does):

- `.git`, and `node_modules` if you have rebuilt the interface: large, and not needed to run the project.
- `data/secret.key`: this computer's session secret. A new one is made on the first start.
- `data/clinic.db`, unless you mean to hand over your accounts and appointments with it. Without it, the other computer starts with an empty database.

Each computer keeps its own database. To let several people use one shared system instead, run it on one computer with `HOST=0.0.0.0` and have the others open that computer's network address.

### If port 5000 is busy

The app does not fail. It uses the next free port and prints the address it chose.

## Deployment

`python app.py` already runs the Waitress production server, so the same command serves a demonstration on one laptop and a clinic's network.

### Before real use

| Do this | How |
|---|---|
| Change the clinic code | Set `CLINIC_CODE` to your own value. With the default, anyone who has read this file can create a staff account. The app prints a warning at start while the default is in use. |
| Start with an empty database | Delete the `data` folder. It is recreated empty on the next start. |
| Replace the placeholders | The clinic's address, phone and email are in `server/config/clinic.py`. |
| Back up the data | Copy the `data` folder while the app is stopped. It holds every account, appointment and patient record. |

### On the clinic's network (one computer serves everyone)

```bash
set HOST=0.0.0.0
set CLINIC_CODE=your-own-code
python app.py
```

On macOS or Linux use `export` in place of `set`. The app prints the address other devices should open, for example `http://192.168.1.20:5000`. Staff, doctors, the waiting-room screen and patients' phones on the same Wi-Fi all use that address. Windows may ask once to allow Python through the firewall; choose "Private networks". QR codes and shared ticket links then work from phones, as long as the staff page was opened with the network address rather than `localhost`.

### On a hosting service

The repository includes what most Python hosts look for:

| File | Purpose |
|---|---|
| `requirements.txt` | The packages to install |
| `Procfile` | The start command: `waitress-serve --host=0.0.0.0 --port=$PORT wsgi:app` |
| `wsgi.py` | The application object, for any WSGI server |

Set these in the host's environment settings:

| Variable | Value |
|---|---|
| `CLINIC_CODE` | Your own code |
| `SECRET_KEY` | A long random string, so sign-ins survive a redeploy |
| `HTTPS` | `1`, so the session cookie is only sent over https |
| `TRUST_PROXY` | `1`, because the host's proxy sits in front of the app |
| `CLINIC_DATA_DIR` | A folder on the host's **persistent disk** |

The last one matters: many hosts wipe the app's own folder on every deploy or restart, which would erase the database. Point `CLINIC_DATA_DIR` at storage the host keeps. Run one instance only; SQLite is a single file and is not shared between several.

The built interface (`client/dist`) is part of the repository, so the host needs Python only, not Node.js.

## Configuration

Settings live in `config.py`. Each can be overridden with an environment variable of the same name; none needs to be set.

| Setting | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Port to listen on |
| `HOST` | `127.0.0.1` | Set to `0.0.0.0` to let phones on the same network open the site, which QR booking needs |
| `CLINIC_CODE` | `CLINIC-2026` | The code doctors and staff need to create an account. Empty switches that sign-up off. |
| `SESSION_HOURS` | `8` | Session timeout |
| `HTTPS` | off | Set to `1` when served over https |
| `TRUST_PROXY` | off | Set to `1` behind a hosting service or reverse proxy |
| `CLINIC_DATA_DIR` | `data` in the project | Folder for the database and the session secret |
| `DATABASE_URL` | SQLite file in the folder above | Any SQLAlchemy database URL |
| `SECRET_KEY` | generated once and saved | Signs session cookies |

The clinic's name, address, contact details and opening hours are in `server/config/clinic.py`; the address and contact details there are placeholders. Announcement wording and languages are in `client/src/utils/announce.js`.

## Project structure

```text
├── run.bat                 Windows: double-click to install and start
├── app.py                  Start here: python app.py
├── seed_doctors.py         Optional: load the doctors and two weeks of slots
├── add_today_slots.py      For testing: bookable slots for the rest of today
├── config.py               Settings
├── wsgi.py, Procfile       For hosting services
├── requirements.txt        Packages to run; requirements-dev.txt adds pytest
├── server/
│   ├── __init__.py         App factory, error handling, serves the interface
│   ├── migrate.py          Automatic schema migration
│   ├── config/             Clinic details and opening hours
│   ├── models/             User, Doctor, DoctorSlot, Appointment, QrCode
│   ├── routes/             auth, public, patient, doctor, staff
│   ├── services/           Sign-in, booking and status changes, queue figures, slot renewal
│   ├── middleware/         Role-based access
│   ├── utils/              Validation, constants, errors, time
│   └── tests/              pytest
├── database/schema.sql     Reference copy of the schema
├── data/                   This computer's database (created on first start)
└── client/
    ├── src/                React source: pages, components, hooks, utils
    └── dist/               Built interface that Flask serves
```

## API

All routes are under `/api`. Errors are returned as `{ "message": "...", "errors": { "field": "..." } }`.

**From the microproject description** (the POST routes also answer without the `/api` prefix):

| Method | Route | Who | Purpose |
|---|---|---|---|
| GET | `/staff/queue-status` | staff | Today's queue with the day's figures (same as `/staff/queue`) |
| POST | `/staff/generate-token` | staff | Walk-in token: `name`, `doctorId`, optional `reason`, `priority` |
| POST | `/staff/generate-qr-token` | staff | One-time QR booking link for `doctorId` |
| POST | `/staff/call-next-token` | staff | Calls the first waiting patient of `doctorId`, on the doctor's behalf |
| POST | `/staff/mark-not-arrived` | staff | `appointmentId` → Not arrived |
| POST | `/staff/restore-token` | staff | `appointmentId` back to Waiting, in its place |
| POST | `/staff/reset-tokens` | staff | End-of-day reset |
| GET | `/doctor/next-token` | doctor | Current patient, next patient and the waiting list |
| GET | `/doctor/stats` | doctor | The doctor's figures for today |
| POST | `/doctor/release-token` | doctor | Mark treatment complete |
| POST | `/doctor/call-next-token` | doctor | Complete the current patient and call the next |
| POST | `/doctor/skip-token` | doctor | The called patient did not come: record as not arrived |
| GET | `/patient/token-status` | patient | The patient's visit for today, with queue position |
| POST | `/patient/book-token` | patient | Book (same as `POST /appointments`) |

**From the original project:**

| Method | Route | Who | Purpose |
|---|---|---|---|
| GET | `/clinic`, `/stats`, `/display` | anyone | Clinic details; landing figures; waiting-room board |
| GET | `/track/:token` | anyone | Live status behind a tracking link, without patient details |
| GET, POST | `/qr/:code`, `/qr/:code/book` | anyone | What a scanned QR code is for; confirm the booking |
| GET | `/doctors`, `/doctors/:id`, `/doctors/:id/slots` | anyone | Directory, one doctor, and slots for the next 14 days |
| GET | `/auth/csrf`, `/auth/me` | anyone | CSRF token; the signed-in user |
| POST | `/auth/register`, `/auth/register-staff`, `/auth/login`, `/auth/logout` | anyone | Accounts and sessions |
| PATCH | `/auth/me` | signed in | Update own profile |
| POST, GET | `/appointments`, `/appointments/:id` | patient | Book; own appointments |
| POST | `/appointments/:id/cancel`, `/appointments/:id/reschedule` | patient | Change an appointment that is still Booked |
| GET, POST, PATCH | `/staff/doctors`, `/staff/doctors/:id` | staff | Doctors and their profiles |
| GET, POST | `/staff/doctors/:id/slots` | staff | A doctor's slots |
| PATCH, DELETE | `/staff/slots/:id` | staff | Edit or remove an unbooked slot |
| GET | `/staff/queue`, `/staff/schedule`, `/staff/analytics` | staff | One day's queue; a week of slots; doctor-wise figures |
| GET | `/staff/patients` | staff | Patient records with visit history |
| GET | `/staff/appointments`, `/staff/appointments/:id` | staff | All appointments (`?q=` searches); one appointment |
| PATCH, POST | `/staff/appointments/:id/status`, `.../undo`, `.../priority` | staff | Change status; undo; emergency mark |
| POST | `/staff/walk-ins` | staff | Same as `generate-token` |
| POST | `/doctor/start-consultation` | doctor | The called patient has come in |

## Testing

```bash
pip install -r requirements-dev.txt
python -m pytest server/tests -q
```

41 tests cover sign-in and role checks, CSRF, doctors and slots, booking and double-booking, cancel and reschedule, the full visit flow, queue numbers, emergencies, walk-in and QR flows, not-arrived and restore, the reset, analytics, slot renewal and the schema migration. Each test uses its own temporary database.

## Changing the interface

`client/dist` is already built, so Python alone runs the project. To change the React source you need Node.js; `npm install` downloads the build tools into `node_modules`, which is not kept in the project:

```bash
npm install
npm run build        # rebuild client/dist
npm run client       # or: a live-reloading dev server on :5173, with python app.py running
```

## What changed from the hackathon version

| | Hackathon version | Now |
|---|---|---|
| Backend | Node.js, Express | Python, Flask, SQLAlchemy |
| Database | PostgreSQL server on its own port | One SQLite file |
| Start | `npm run dev` (three processes) | `python app.py` (one) |
| Sign-in | JWT in browser storage | Session cookies with CSRF protection |
| Roles | Patient, Staff | Patient, Doctor, Staff |
| Walk-ins | Emergency only | Normal or emergency |
| Not arrived | Final | Can be restored to the queue |
| Calling | Staff | The doctor, with one button that also completes the current patient |
| Added | | Queue numbers, doctor dashboard, QR booking, bilingual announcements, patient records, end-of-day reset |
| Demo data | Seed script | None; starts empty |

## Known limitations

- Live views refresh by polling every 5 to 10 seconds, not instantly.
- Wait estimates use the doctor's average consultation length that day, or 15 minutes until one has finished.
- A patient hears their call only while the site is open in their browser; there is no app, SMS or push notification, so a closed browser or locked phone gets nothing.
- Browsers only play sound after a click on the page, so the waiting-room display has a "Turn on announcements" button. A Hindi voice must be installed on the device for the Hindi announcement to sound natural.
- Scanning a QR code from a phone needs the server reachable on the network (`HOST=0.0.0.0`) and the staff page opened by the computer's network address rather than `localhost`.
- Testimonials and the About page text are placeholders, labelled as sample on screen. The contact form validates but does not send anywhere.
- The staff sign-up lockout is held in memory, so it resets when the server restarts.
- One running copy serves one clinic. SQLite is a single file, so the app cannot be spread over several servers.
