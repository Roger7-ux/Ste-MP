"""The single source of truth for the clinic's details and opening hours.
Slot creation, booking, the footer and the contact page all read from here.

TODO: replace the placeholder address and contact details with real ones.
"""
from datetime import date

WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

_OPEN = {"open": "09:00", "close": "18:00"}

CLINIC = {
    "name": "MediQ",
    "tagline": "Book. Track. Consult.",
    "address": {
        "line1": "12 Example Street",
        "city": "Sample City",
        "postcode": "000000",
        "isPlaceholder": True,
    },
    "phone": "+00 0000 000 000",
    "email": "hello@mediq.example",
    # Index 0 is Sunday. `None` means closed.
    "hours": [
        {
            "day": day,
            "label": WEEKDAYS[day],
            "open": hours["open"] if hours else None,
            "close": hours["close"] if hours else None,
        }
        for day, hours in enumerate([None, _OPEN, _OPEN, _OPEN, _OPEN, _OPEN, _OPEN])
    ],
}


def _weekday(date_str):
    """0 for Sunday to 6 for Saturday, matching CLINIC['hours']."""
    return (date.fromisoformat(date_str).weekday() + 1) % 7


def hours_on(date_str):
    """Opening hours for a 'YYYY-MM-DD' date, or None when the clinic is closed."""
    entry = CLINIC["hours"][_weekday(date_str)]
    return entry if entry["open"] else None


def weekday_label(date_str):
    return WEEKDAYS[_weekday(date_str)]
