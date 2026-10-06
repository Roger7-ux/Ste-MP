# MediQ — Smart Queue Management System

## Product Requirements Document

| | |
|---|---|
| **Product** | MediQ |
| **Document type** | Product Requirements Document |
| **Version** | 4.4 |
| **Date** | 6 October 2026 |
| **Status** | Implemented and tested |
| **Supersedes** | All earlier versions of this file, and `docs/prd-hackathon-v1.md` |

This document describes the system as it is built. Every requirement listed is implemented. Requirement IDs are for use in the project report and in testing.

**Contents:** 1 Overview · 2 Users and roles · 3 How a visit works · 4 Functional requirements · 5 Appointment lifecycle · 6 Business rules · 7 Data model · 8 Interfaces · 9 Non-functional requirements · 10 Technology · 11 Design decisions · 12 Acceptance criteria · 13 Known limitations · 14 Future enhancements

---

## 1. Overview

### 1.1 Product summary

MediQ is a web-based appointment and queue management system for a clinic with several doctors. A patient books a doctor's time slot online, or takes a token at the front desk, and receives a ticket. On the day of the visit that ticket is live: it shows the patient's queue number, their place in line and an estimated wait, and it can be shared as a link with anyone.

The doctor decides when to call. One button on the doctor's screen finishes the patient who is with them and calls the next. The call appears on the front desk's screens, on the waiting-room display and on the patient's own device, and is announced aloud in English and then Hindi. Front-desk staff manage everything else: doctors, time slots, check-in, walk-in and QR tokens, exceptions, and a permanent record of every patient.

### 1.2 Problem

With paper tokens, patients do not know how long they will wait or whose turn it is, and family members phone to ask. Staff lose track of late patients, the doctor has no view of the queue, and nobody has figures for the day or a history of who came.

### 1.3 Goals

| # | Goal |
|---|---|
| G1 | Reduce perceived waiting time by showing every patient their place in line and an estimated wait. |
| G2 | Remove confusion over whose turn it is, with a call that is seen and heard. |
| G3 | Put the decision to call in the doctor's hands, with a single action per patient. |
| G4 | Let a patient share their live ticket with family, without accounts and without exposing personal details. |
| G5 | Handle the exceptions of a real clinic: walk-ins, emergencies, patients who do not come, cancellations, rescheduling. |
| G6 | Keep a record of every patient and visit, and give the clinic figures on waits, cancellations and no-shows. |
| G7 | Run on any computer with only Python installed, from one folder and one command. |

### 1.4 Out of scope

Online payment, SMS or email or push notifications, clinical notes and prescriptions, video consultation, integration with hospital information systems, multi-clinic support, and native mobile apps.

---

## 2. Users and roles

| Role | Who | What they do | Gets an account by |
|---|---|---|---|
| **Visitor** | Anyone, no account | Browses doctors and availability; opens a shared ticket link; scans a QR code at the desk; views the waiting-room screen | — |
| **Patient** | A person visiting the clinic | Books, reschedules or cancels a visit; keeps and shares their ticket; follows their place in the queue; is alerted when called | Open registration |
| **Doctor** | A consulting doctor | Calls the next patient; skips a patient who did not come; marks treatment complete; sees who is waiting and the day's figures | Registration with the clinic code, linked to a doctor profile |
| **Staff** | Front-desk staff | Manages doctors and slots; checks patients in; issues walk-in and QR tokens; handles exceptions; keeps patient records; views the schedule and analytics | Registration with the clinic code |

Each role sees only its own area. A user who opens another role's page is shown an explanation with a link back to their own dashboard, and the server refuses the request.

---

## 3. How a visit works

### 3.1 Booked visit

1. The patient finds a doctor, picks a day and time, and confirms. They receive a ticket with an appointment ID.
2. On the day, the patient arrives and quotes the ID. Staff press **Check in**; the patient joins the doctor's queue and gets a queue number ("Token 7").
3. The patient's ticket shows their position and estimated wait, updating by itself.
4. The doctor presses **Call next patient**. The patient's status becomes Called. The staff screens, the waiting-room display and the patient's device show it and announce it.
5. The patient goes in. When the doctor presses the button again, this patient is marked Completed and the next is called.
6. The completed visit is kept on the patient's record.

### 3.2 Walk-in

Staff issue a token at the desk with the patient's name and the doctor. The patient is in the queue at once, with no account. From step 3 the flow is the same.

### 3.3 QR code

Staff show a one-time QR code for a doctor. The patient scans it with their phone, confirms, and is in the queue with the next token number. Their phone lands on the live ticket page. From step 3 the flow is the same.

### 3.4 Patient does not come when called

The doctor presses **Skip: did not come**. The visit is recorded as Not arrived and the doctor calls the next patient. If the patient turns up later, staff press **Restore to queue**: they keep their token number and return to the place they had.

### 3.5 End of day

Staff run the end-of-day reset. Anyone still booked or waiting is marked Not arrived, and the visit of anyone with a doctor is completed. Token numbers start again at 1 the next day.

---

## 4. Functional requirements

Priority: **M** = must have, **S** = should have.

### 4.1 Accounts and access

| ID | Requirement | Pri |
|---|---|---|
| A1 | A patient registers with full name, phone (10 to 15 digits), email and password (at least 6 characters), and is signed in straight after. | M |
| A2 | Sign in and sign out. Patients use one sign-in screen; doctors and staff use another. An account used on the wrong screen is refused with the same message as a wrong password. | M |
| A3 | Doctors and staff register with the clinic code. A wrong code is refused; after five wrong codes from one address, further attempts are blocked for 15 minutes. | M |
| A4 | A doctor's account is linked to a profile in the doctor directory: one that staff have added and no doctor has claimed, or a new profile with a chosen specialization. Each profile has at most one account. | M |
| A5 | A signed-in user can edit their name, phone and email. Phone is required for patients only. | S |
| A6 | Sessions end after 8 hours without use. An expired session returns the user to sign-in. | M |
| A7 | A visitor sent to sign in from a protected page is returned to that page afterwards. | S |
| A8 | Doctor and staff sign-up can be switched off by clearing the clinic code; the "Create account" option then disappears. | S |
| A9 | Email addresses are unique regardless of letter case. | M |

### 4.2 Doctor directory and availability

| ID | Requirement | Pri |
|---|---|---|
| D1 | Anyone can browse the doctor directory without an account. | M |
| D2 | Search matches a doctor's name, specialty, description, bio and languages. | M |
| D3 | Filter by specialty, with chips showing how many doctors each would give; sort by next available time, fee or name; an "Available today" switch. | M |
| D4 | Search, filter and sort choices are kept in the page address, so they survive a refresh, the back button and sharing the link. | S |
| D5 | Each doctor card shows specialty, short description, consultation fee, room, the next open time with the number of slots open this week, and today's pace when patients are waiting or the doctor is running late. | M |
| D5a | Open-slot counts across the site are **per week**: today and the six days after it. This applies to the landing-page figures, the hero panel, doctor cards and the staff's doctor list. Booking itself still reaches 14 days ahead. | M |
| D6 | A doctor's profile shows photo or initials, experience, room, languages, bio, common reasons to visit for the specialty, and open slots for each of the next seven days. | M |
| D7 | Specialty pages cover the six specialties (Cardiology, Dermatology, ENT, General Medicine, Orthopedics, Pediatrics): what each treats, common reasons to visit, and its doctors. | S |
| D8 | "Book appointment" is disabled for a doctor with no open slots in the next two weeks. | M |

### 4.3 Booking

| ID | Requirement | Pri |
|---|---|---|
| B1 | Booking has three steps: choose a day and time; confirm contact details and add an optional reason (up to 500 characters); review and confirm. A running summary shows the choice throughout. | M |
| B2 | The day strip covers the next 14 days. Days the clinic is closed and days with no open slots cannot be chosen. | M |
| B3 | Times are grouped into morning and afternoon. Taken and already-passed times are shown struck through and cannot be chosen. | M |
| B4 | Day and time choices can be moved through with the arrow keys. | S |
| B5 | A slot can be held by only one patient. If it is taken while the patient is deciding, the booking is refused with a clear message and the patient is returned to choose again with fresh availability. | M |
| B6 | Each appointment gets a unique ID that starts with the doctor's initials, for example `RS-261006-0004`. The ID never changes. | M |
| B7 | The consultation fee is copied onto the appointment at booking and does not change if the doctor's fee later changes. The fee is displayed only; no payment is taken. | M |
| B8 | A patient can cancel their own appointment while it is still Booked, after a confirmation prompt. The slot reopens if it is still in the future. | M |
| B9 | A patient can reschedule a Booked appointment to another open slot of the same doctor. The ID and the fee stay the same; the old slot reopens. | S |
| B10 | A patient sees only their own appointments, in Upcoming, Past and Cancelled tabs with counts. | M |
| B11 | The patient dashboard greets the patient, shows their next appointment, and links to the directory, their appointments and their profile. | S |

### 4.4 The ticket and ticket sharing

| ID | Requirement | Pri |
|---|---|---|
| T1 | On confirmation the patient sees a ticket: appointment ID with a copy button, status, patient, doctor, specialty, date, time, room and fee, with a short celebration animation. | M |
| T2 | **Add to calendar:** the ticket can be downloaded as a calendar (.ics) file with the doctor, time, appointment ID and clinic address, from the confirmation screen and from the appointment's page. | S |
| T3 | **Share tracking link:** every appointment has its own link. One button copies it to the clipboard and confirms with a message; if the clipboard is unavailable, the link is shown to copy by hand. | M |
| T4 | The share button appears on the confirmation ticket, on each active appointment card, and on the appointment's page, while the appointment is Booked, Waiting, Called or In consultation. | M |
| T5 | Anyone with the link can open it **without an account**. | M |
| T6 | The shared page shows the appointment ID, status, doctor, specialty, date, time and room, and on the day of the visit the live queue tracker: queue number, place in line, estimated wait, the doctor's delay and the time to expect. | M |
| T7 | The shared page shows **no** patient name, contact details or reason for the visit, and says so on screen. | M |
| T8 | The link uses a random 32-character token, never the appointment ID, so it cannot be guessed from another ticket. A wrong or incomplete link shows "This tracking link is not valid". | M |
| T9 | The shared page updates by itself and gives the same alerts as the patient's own pages: a message when next, and a pop-up with a spoken announcement when called. | M |
| T10 | Before the day of the visit the shared page says live tracking starts on the day; after the visit it says the visit is no longer in the queue. | S |
| T11 | A walk-in or QR patient, who may have no account, is taken to this same page as their ticket. | M |

### 4.5 Tokens and the queue

| ID | Requirement | Pri |
|---|---|---|
| Q1 | When a patient is checked in they receive a queue number ("Token 7"). Numbers run per doctor, per day, and start again at 1 each day. | M |
| Q2 | Staff can issue a walk-in token to a patient with no booking: patient name, doctor, optional reason. The patient joins the queue at once, with no account. | M |
| Q3 | A walk-in is marked Normal (joins the end of the queue) or Emergency (goes to the front). | M |
| Q4 | Staff can generate a one-time QR code for a doctor. A patient who scans it sees the doctor, room, fee and how many are waiting, confirms on their own phone, and joins that doctor's queue for today. A signed-in patient gets the visit on their account; anyone else gives a name. | M |
| Q5 | A QR code works once, on the day it was made. Staff can generate the next code without closing the dialog. | M |
| Q6 | Queue order is: emergencies first, then by check-in time. | M |
| Q7 | A waiting patient sees their position, how many are ahead, and an estimated wait. | M |
| Q8 | The wait estimate uses the doctor's average consultation length that day, or 15 minutes until one visit has finished, and counts a patient already with the doctor. | M |
| Q9 | Staff can mark any Booked, Waiting or Called patient as an emergency, or clear the mark, until the consultation starts. Other waiting patients are told and their wait is re-estimated. | S |
| Q10 | A patient not yet checked in sees the doctor's current delay and the time they can expect to be seen. | S |

### 4.6 Doctor's dashboard: calling, skipping, completing

| ID | Requirement | Pri |
|---|---|---|
| C1 | The doctor sees the patient currently with them (queue number, name, appointment ID, reason, emergency and walk-in flags, time called) and the waiting list in order, with each patient's estimated wait. | M |
| C2 | **Call next patient** is the doctor's main button. One press marks the patient currently with the doctor as Completed **and** calls the next patient in the queue. | M |
| C3 | The button adapts: with nobody with the doctor it only calls ("Call next patient"); with a patient and others waiting it does both ("Complete and call next"); with a patient and nobody waiting it only completes ("Complete this patient"). It is disabled when there is nobody with the doctor and nobody waiting. | M |
| C4 | **Skip: did not come** is offered for a patient who has been called. It records the visit as Not arrived; the doctor then calls the next patient. | M |
| C5 | **Mark treatment complete** finishes the current patient without calling anyone, for example before a break. | M |
| C6 | A doctor acts only on their own queue. | M |
| C7 | The doctor sees their own figures for the day: still to arrive, waiting, completed, not arrived, average wait, average visit length, and whether they are on time or running behind. | S |
| C8 | The doctor is told if the front desk calls a patient in on their behalf. | S |

### 4.7 What happens when a patient is called or completed

| ID | Requirement | Pri |
|---|---|---|
| E1 | A call changes the patient's status to Called everywhere: the staff board moves the card to "In consultation", the waiting-room display shows the patient under "Now serving", and the patient's ticket and shared link show the call. | M |
| E2 | Staff are told of every call on **whichever staff page they have open**, with a message naming the doctor and token. | M |
| E3 | A completion changes the status to Completed on the staff board and on the patient's pages, and the visit is stored on the patient's record. | M |
| E4 | A skip changes the status to Not arrived on the staff board and the patient's pages, and is stored on the patient's record as a visit not attended. | M |

### 4.8 Announcements and alerts

| ID | Requirement | Pri |
|---|---|---|
| N1 | When a patient is called, an announcement is spoken in English and then Hindi, after a short chime, giving the queue number, room and doctor. No patient name is spoken. | M |
| N2 | **Staff:** the announcement plays on whichever staff page is open. A switch on the dashboard turns the sound off; the choice is remembered on that device. Staff can repeat the announcement for a called patient. | M |
| N3 | **Waiting-room display:** the announcement plays once "Turn on announcements" has been pressed. | M |
| N4 | **Patient:** a signed-in patient gets, on whichever page of the site they have open, a pop-up with the room and token when called, a message when they become next, and a message when an emergency is put ahead of them. The pop-up comes with the spoken announcement. | M |
| N5 | Staff and signed-in patients keep being checked for calls while the browser tab is in the background, so a call is still heard when another window is in front. | M |
| N6 | Each call is announced once on each screen, whoever made it. When two doctors call within the same few seconds, both calls are announced. | M |
| N7 | A call is heard on a device only while the site is open in a browser there. Nothing opens by itself. | M |

### 4.9 Front desk: running the day

| ID | Requirement | Pri |
|---|---|---|
| F1 | Staff see today's appointments as a board with columns Booked, Waiting, In consultation and Completed, and a collapsible list of Not arrived and Cancelled. Cards move between columns with animation. | M |
| F2 | One click checks a booked patient in. Staff can also start and complete a visit from the board. | M |
| F3 | Staff do not have a one-click Call button, because calling is the doctor's decision. From a waiting patient's menu they can "Call for the doctor", for a doctor with no login or away from their screen. | M |
| F4 | A status change made by staff can be undone for 30 seconds, from the message that confirms it or from the appointment's page. | S |
| F5 | Staff can mark a Booked, Waiting or Called patient as not arrived. | M |
| F6 | Staff can restore a patient marked as not arrived today. The patient keeps their queue number and, if they had checked in, returns to the place they had. | M |
| F7 | Staff can cancel an appointment that has not started. It is recorded as cancelled by the clinic, and the slot reopens if still in the future. | M |
| F8 | The board can be filtered by doctor. | S |
| F9 | Staff can find an appointment by ID or patient name with Ctrl+K, and move through results with the keyboard. | S |
| F10 | Staff have a list of every appointment, most recent first, with search by ID, patient or doctor and a status filter, and a page for each appointment with all its actions. | M |
| F11 | End-of-day reset, after a confirmation prompt: every patient still booked or waiting is marked as not arrived, the visit of a patient who is with a doctor (called or in consultation) is completed, and unused QR codes stop working. | M |

### 4.10 Patient records

| ID | Requirement | Pri |
|---|---|---|
| PR1 | Every visit is stored permanently in the database with how it ended (Completed, Not arrived or Cancelled), the doctor, date and time, queue number, reason, how long the patient waited and how long the consultation took. | M |
| PR2 | Staff have a Patient records page listing every patient, with the number of completed visits, the number of visits not attended, and the date last seen. | M |
| PR3 | Registered patients are shown with phone and email. Walk-in and QR patients, who have no account, are kept under the name given at the desk. | M |
| PR4 | Opening a patient shows their full visit history, each visit linked to its appointment page. | M |
| PR5 | Records can be searched by name, phone, email or appointment ID, and filtered to patients seen, patients who did not arrive, and walk-ins. | S |
| PR6 | Patient records are visible to staff only. | M |

### 4.11 Doctor and slot management

| ID | Requirement | Pri |
|---|---|---|
| M1 | Staff can add and edit a doctor: name, specialty and consultation fee (required), and room, years of experience, languages, short description, bio and photo address (optional). | M |
| M2 | Staff can add time slots for a doctor by date, start time and optional end time. A blank end time means 30 minutes. Several slots can be added for the same day in a row. | M |
| M3 | A slot must be in the future, inside opening hours, on a day the clinic is open, end after it starts, and not duplicate another slot of that doctor. | M |
| M4 | An unbooked slot can be edited or removed. A booked slot cannot. | M |
| M5 | Slots are listed by day, marked Available or Booked, with past dates folded away. | S |
| M6 | A weekly schedule shows, for every doctor and day, how many slots are booked and how many are open, with previous and next week, and links to that doctor's slots. | S |
| M7 | `python seed_doctors.py` loads six doctors, one per specialty, with two weeks of slots. It creates no accounts and no appointments. | S |
| M8 | `python add_today_slots.py` gives every doctor slots for the rest of today, outside opening hours if need be, so the same-day flow can be tested at any time. | S |

### 4.12 Waiting-room display

| ID | Requirement | Pri |
|---|---|---|
| W1 | A full-screen display shows, per doctor, who is being served and the next three in line, by appointment ID and queue number only, with the room, the clock and the date. | M |
| W2 | It never shows a patient's name. | M |
| W3 | It needs no sign-in and refreshes by itself. | M |

### 4.13 Figures and analytics

| ID | Requirement | Pri |
|---|---|---|
| R1 | The staff board shows today's totals: appointments, waiting now, average wait, completed, not arrived and emergencies, each with an hour-by-hour trend line. | S |
| R2 | Each doctor's delay against schedule is shown to staff, on the doctor's own dashboard, on doctor cards and on the landing page. | S |
| R3 | Analytics over the last 7, 30 or 90 days show clinic totals, a chart of appointments per day with the cancelled share, and a row per doctor with completions, cancellations split by patient and clinic, no-shows, emergencies and average wait. Doctors can be sorted by volume, cancellation rate, no-show rate or wait. | S |
| R4 | The landing page shows live clinic figures: doctors, specialties, open slots this week, and average wait. | S |

### 4.14 Public site and presentation

| ID | Requirement | Pri |
|---|---|---|
| P1 | A landing page with an opening animation (once per browser session); a dark hero band with a three-line headline, two actions and a panel showing the queue at the centre of the three screens that share it; a "Book appointment" button in the navigation bar; live figures, each doctor's pace today, an animated preview of the queue tracker, a how-it-works section, specialties, featured doctors, opening hours and location, and frequently asked questions. | S |
| P2 | About and Contact pages. The contact form checks its fields but does not send the message. | S |
| P3 | Light, dark and follow-the-device themes, remembered in the browser. | S |
| P3a | The colour scheme is a clinical teal on cool neutrals with a warm coral accent for small labels, in both themes. Every text and button colour meets the 4.5:1 contrast level. | S |
| P4 | Pages fade and slide between routes; lists and cards animate when they change. Movement is reduced to simple fades for users whose device asks for reduced motion. | S |
| P4a | Landing-page motion is restrained and purposeful: the headline rises line by line; the queue panel draws its connections and sends a small signal along each in turn; figures arrive one after another and count up; sections lift in as they are scrolled to; comparison rows fade in in order; a thin progress line under the header fills as the page is scrolled; the header gains a shadow once the page moves; a scroll cue fades away on the first scroll. Nothing loops quickly or moves on its own in the reader's line of sight. | S |
| P5 | The layout adapts to phone, tablet and desktop, including a menu drawer and a fixed booking bar on phones. | M |
| P6 | Loading states show placeholders, failures show a message with a retry button, and empty lists explain what will appear there. | M |

---

## 5. Appointment lifecycle

```text
                    ┌────────────── restore ──────────────┐
                    ▼                                     │
BOOKED ──► WAITING ──► CALLED ──► IN CONSULTATION ──► COMPLETED
   │          │           │  └──────────────────────────► COMPLETED
   │          │           │
   ├──────────┴───────────┴──► NOT ARRIVED ────────────────┘ (today only)
   │          │           │
   └──────────┴───────────┴──► CANCELLED (final)
```

| Status | Meaning | Set by |
|---|---|---|
| Booked | A slot is reserved; the patient has not arrived | The patient, by booking |
| Waiting | Checked in and in the queue, with a queue number | Staff check-in; walk-in token; QR scan; restore |
| Called | The patient has been called to the doctor | The doctor's Call next (or staff on the doctor's behalf) |
| In consultation | The patient is with the doctor | Staff, optionally; the doctor's flow does not need this step |
| Completed | Treatment is finished | The doctor, by calling the next patient or marking complete; or staff |
| Not arrived | The patient did not come when expected or called | The doctor's Skip; staff; the end-of-day reset |
| Cancelled | The visit will not happen | The patient (while Booked) or staff |

Walk-in and QR patients start at Waiting. When the doctor completes a patient who was Called, the consultation is taken to have started when they were called.

---

## 6. Business rules

1. A slot has at most one appointment that is not cancelled. The database enforces this.
2. Two patients of the same doctor cannot hold the same queue number on the same day. The database enforces this.
3. Status moves only along the arrows in section 5. Any other change is refused.
4. A patient can change only their own appointment, and only while it is Booked. Another patient's appointment is reported as not found.
5. A doctor's Call next always completes whoever is with them before calling the next patient, in one transaction.
6. Only a called patient can be skipped. A skipped visit is never counted as completed.
7. Only a patient marked as not arrived today can be restored.
8. Priority can be changed only before the consultation starts.
9. A QR code works once, on the day it was made.
10. Cancelling reopens the slot only if the slot is still in the future. Undoing a cancellation fails if someone else has since booked the slot.
11. A shared ticket link never reveals the patient's name, contact details or reason for the visit.
12. The appointment ID and the fee agreed at booking never change.
13. Slots can be created through the front desk only in the future, on open days, within opening hours (Monday to Saturday, 09:00 to 18:00).
14. Patients can book up to 14 days ahead.
15. No visit is ever deleted: completed, not-arrived and cancelled visits all stay on record.
16. The database starts empty, with no accounts or appointments. Only doctors and their slots can be loaded, on request.

---

## 7. Data model

| Table | Holds | Key fields |
|---|---|---|
| `users` | Every account | name, email, phone, password hash, role (PATIENT, DOCTOR, STAFF), linked doctor profile |
| `doctors` | The doctor directory | name, specialization, consultation fee, room, description, bio, experience, languages, photo |
| `doctor_slots` | Bookable times | doctor, date, start and end time, status (AVAILABLE, BOOKED) |
| `appointments` | Every visit, booked or walk-in; this is also the patient record | appointment ID, patient or walk-in name, doctor, slot, date, time, fee, status, reason, queue number, priority, a timestamp for check-in, call, start and completion, previous status (for undo), who cancelled, tracking token |
| `qr_codes` | One-time on-site booking codes | code, doctor, date, the appointment it produced |

The full schema is in `database/schema.sql`. The database is a single SQLite file, `data/clinic.db`, inside the project folder.

---

## 8. Interfaces

### 8.1 Screens

| Screen | Address | For |
|---|---|---|
| Landing page | `/` | Visitors |
| Doctor directory and profiles | `/doctors`, `/doctors/:id` | Visitors |
| Specialties | `/specialties`, `/specialties/:slug` | Visitors |
| About, Contact | `/about`, `/contact` | Visitors |
| Patient sign-in and registration | `/login`, `/register` | Patients |
| Patient dashboard | `/patient` | Patients |
| Booking and rescheduling | `/patient/doctors/:id/book` | Patients |
| My appointments, appointment page | `/patient/appointments`, `/patient/appointments/:id` | Patients |
| Profile | `/patient/profile` | Patients |
| Shared ticket (tracking link) | `/track/:token` | Anyone with the link |
| QR booking | `/book/:code` | A patient who scanned a code |
| Doctor and staff sign-in and registration | `/staff/login`, `/staff/register` | Doctors, staff |
| Doctor dashboard | `/doctor` | Doctors |
| Front desk board | `/staff` | Staff |
| Appointments, appointment page | `/staff/appointments`, `/staff/appointments/:id` | Staff |
| Patient records | `/staff/patients` | Staff |
| Analytics, Schedule | `/staff/analytics`, `/staff/schedule` | Staff |
| Doctors, Availability | `/staff/doctors`, `/staff/availability` | Staff |
| Waiting-room display | `/display` | A screen in the waiting room |

### 8.2 API

All routes are under `/api`. The full list is in `README.md`. The routes most specific to the queue:

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `/doctor/call-next-token` | doctor | Complete the current patient and call the next |
| POST | `/doctor/skip-token` | doctor | The called patient did not come: record as not arrived |
| POST | `/doctor/release-token` | doctor | Mark treatment complete |
| GET | `/doctor/next-token`, `/doctor/stats` | doctor | The doctor's queue; the doctor's figures |
| GET | `/staff/queue-status` | staff | Today's queue with the day's figures |
| POST | `/staff/generate-token` | staff | Walk-in token |
| POST | `/staff/generate-qr-token` | staff | One-time QR booking link |
| POST | `/staff/call-next-token` | staff | Call on a doctor's behalf |
| POST | `/staff/mark-not-arrived`, `/staff/restore-token` | staff | Not arrived; restore to the queue |
| POST | `/staff/reset-tokens` | staff | End-of-day reset |
| GET | `/staff/patients` | staff | Patient records |
| GET | `/patient/token-status` | patient | The patient's visit for today |
| POST | `/patient/book-token` | patient | Book a slot |
| GET | `/track/:token` | anyone | A shared ticket, without patient details |
| GET | `/display` | anyone | The waiting-room board and the latest call |

---

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| **Security** | Passwords stored hashed. Role check on every protected route. CSRF token required on every request that changes data. Session cookies are HTTP-only. All input validated and length-limited on the server. The clinic code is compared in constant time and guesses are rate-limited. |
| **Privacy** | The waiting-room display, the announcements and shared ticket links never reveal a patient's name, contact details or reason for visiting. Patient records are for staff only. |
| **Reliability** | Booking and queue-number allocation are protected by unique indexes, so concurrent requests cannot double-book or duplicate a number. Each change is one database transaction. |
| **Live updates** | Screens refresh by background requests: calls reach staff within about 5 seconds, the waiting-room display and the doctor's dashboard within 5, and patients within about 8 to 10. |
| **Portability** | Runs with Python 3.9+ and five Python packages. No database server and no Node.js needed to run. Everything, including the database, is in one folder. |
| **Startup** | One command (`python app.py`) or one double-click (`run.bat`). If the port is busy, the next free port is used. |
| **Deployment** | Served by the Waitress production server. With `HOST=0.0.0.0` one computer serves the clinic's network. `wsgi.py` and `Procfile` are provided for hosting services, with settings for https, a proxy in front, and where the data is kept. |
| **Upgrades** | The database schema is created and upgraded automatically on start. |
| **Usability** | Responsive layout. Light and dark themes. Reduced motion respected. The doctor's work is one button per patient. |
| **Accessibility** | Statuses are shown with a symbol as well as colour. Forms have labelled fields and inline errors. Live changes are announced to screen readers. Dialogs trap focus and close with Escape. A skip-to-content link is provided. Buttons are at least 44 pixels tall on touch screens. |

---

## 10. Technology

| Layer | Technology |
|---|---|
| Backend | Python, Flask, Flask-SQLAlchemy, served by Waitress |
| Database | SQLite |
| Authentication | Flask-Login sessions, Werkzeug password hashing, Flask-WTF CSRF protection |
| Frontend | React, Vite, Tailwind CSS, Motion |
| QR codes | `qrcode` JavaScript library |
| Announcements | Web Speech API |
| Tests | pytest (38 automated tests) |

---

## 11. Design decisions

| # | Decision | Reason |
|---|---|---|
| 1 | The doctor calls the next patient, and the same press completes the current one | The doctor knows when they are ready. One button keeps the doctor's part to a single action per patient. |
| 2 | Staff keep a fallback "Call for the doctor" in a menu, not a button | A doctor may have no login or be away from the screen, but calling should not be the desk's routine. |
| 3 | A patient who does not come is skipped, not completed | Otherwise the one-button flow would record a no-show as a completed visit. |
| 4 | The shared link uses a random token, not the appointment ID | Appointment IDs are sequential and are shown on the waiting-room screen, so they must not open anyone's ticket. |
| 5 | A queue number is issued when the QR code is scanned, not when it is generated | Two patients can never be given the same number, and an unscanned code leaves no gap. |
| 6 | Queue numbers restart by date | The daily reset needs no manual step. |
| 7 | The appointment table doubles as the patient record | Every visit is already stored with its outcome and timings; a separate copy could disagree with it. |
| 8 | Updates by polling, not push | It needs no extra server or secure hosting, and a few seconds' delay is acceptable in a waiting room. |
| 9 | SQLite instead of a PostgreSQL server | The earlier embedded PostgreSQL server crashed on Windows and left its port busy. A single file has no server to fail and makes the project easy to share. |
| 10 | No seeded accounts or appointments | The clinic sets itself up. Only doctors and slots can be loaded, on request. |
| 11 | React interface kept, served by Flask | Preserves the original design and animations while the backend is Python. |
| 12 | Sign-in by email | Kept from the original interface. |

---

## 12. Acceptance criteria

The system is accepted when this scenario works from an empty database, without editing the database by hand:

1. Staff register with the clinic code and add a doctor with a fee and room.
2. Staff add two future slots for the doctor.
3. The doctor registers and claims that profile.
4. A patient registers, finds the doctor, books a slot, and receives a ticket with an appointment ID.
5. A second patient cannot book the same slot.
6. The patient copies the tracking link. Opened in a browser with nobody signed in, it shows the live status and no patient name.
7. Staff check the booked patient in and issue two walk-in tokens and one emergency walk-in. The emergency is first in line.
8. Staff generate a QR code. A patient scans it, joins the queue, and lands on the live ticket.
9. The doctor presses **Call next patient**. The call appears on the staff board and the waiting-room display and is announced. Staff on another staff page are told too.
10. The doctor presses the button again. The first patient is Completed and the next is Called, in one step.
11. A called patient does not come. The doctor presses **Skip**; the visit is recorded as Not arrived. Staff restore the patient, who returns with the same number.
12. A signed-in patient who is called gets the pop-up and the spoken call on whichever page of the site they have open.
13. Staff open Patient records and see each patient with their completed and not-attended visits.
14. The patient reschedules one booking and cancels another. The freed slots become available again.
15. A patient cannot open staff or doctor pages, and the reverse.
16. Staff run the end-of-day reset and the queue is closed.

### How this was verified

The server-side behaviour of every step is covered by the 38 automated tests.

Exercised on screen in a browser: patient registration; the three-step booking and its ticket; the staff board with queue numbers and the emergency first; generating a QR code, joining by QR and landing on the ticket page; the doctor's Call next, Complete and call next, Skip and Complete buttons; the staff board without a one-click Call button; the Patient records page; a doctor's call reaching staff on a page other than the dashboard, and a patient on a page other than their appointments, both with the tab in the background.

Also exercised on screen in the final review: every screen opened as a visitor, a patient, a doctor and a staff member (about forty pages, including each refused area), with data in every state; the "Share tracking link" button; the "Restore to queue" button, which returned the patient ahead of those who checked in later; and the end-of-day reset.

Not exercised on screen: the rescheduling screens were opened but the reschedule itself was made through the API. For the announcements, the browser was confirmed to be given the correct English and Hindi sentences, but the audio itself was not listened to. The layout was looked at on a desktop-width window only, not on a phone.

---

## 13. Known limitations

- **A patient is alerted only while the site is open in their browser.** There is no app and no SMS or push notification, so a closed browser or a locked phone gets nothing. A phone may also suspend a tab left in the background for a long time. The waiting-room display and its announcement are the fallback.
- Updates arrive by polling every few seconds, not instantly.
- Browsers play sound only after a click on the page, so the waiting-room display needs "Turn on announcements" pressed once. The Hindi announcement needs a Hindi voice installed on the device.
- Scanning a QR code, or opening a shared ticket link, from another device needs the server reachable on the network (`HOST=0.0.0.0`) and the link to use the computer's network address rather than `localhost`.
- Anyone who has a ticket link can view that ticket; it cannot be revoked.
- A walk-in's record is kept under the name given at the desk, so two walk-ins with the same name share a record, and one person giving different spellings has two.
- Each computer that runs the project has its own database; data is not shared between copies.
- The contact form does not send anywhere. About text and testimonials are placeholders, labelled as sample on screen. The clinic's address and contact details are placeholders.
- One running copy serves one clinic. SQLite is a single file, so the app cannot be spread over several servers, and on a hosting service the data folder must be on a persistent disk.

## 14. Future enhancements

SMS or push notifications so a patient is alerted with the site closed; clinical notes on a patient's record; a phone number for walk-ins so their records can be matched; patient feedback and ratings; integration with hospital information and health-record systems; multi-clinic support; transfer of a patient between doctors; revocable ticket links.
