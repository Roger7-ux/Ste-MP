"""Two kinds of time are kept apart.

Clinic time (slot dates and times, "today") is the server's local wall clock,
handled as plain strings: 'YYYY-MM-DD' and 'HH:MM'. They sort and compare
correctly as text and never shift with a time zone.

Event timestamps (checked in, called, completed) are stored in UTC and sent to
the browser as ISO strings.
"""
from datetime import date, datetime, timedelta, timezone


def utcnow():
    """The current instant in UTC, without tzinfo, as SQLite stores it."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value):
    """A stored UTC timestamp as an ISO string the browser can parse."""
    return value.isoformat(timespec="seconds") + "Z" if value else None


def to_local(value):
    """A stored UTC timestamp as a local, naive datetime."""
    return value.replace(tzinfo=timezone.utc).astimezone().replace(tzinfo=None)


def minutes_between(start, end):
    return (end - start).total_seconds() / 60


def round_half_up(value):
    """Rounds like the browser does, so both ends agree on every figure."""
    return int(value + 0.5) if value >= 0 else -int(-value + 0.5)


def now_stamp():
    """Current clinic time as 'YYYY-MM-DD HH:MM'."""
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def today_date(offset_days=0):
    """Today's clinic date as 'YYYY-MM-DD', optionally offset by whole days."""
    return (date.today() + timedelta(days=offset_days)).isoformat()


def add_days(date_str, days):
    return (date.fromisoformat(date_str) + timedelta(days=days)).isoformat()


def stamp(date_str, time_str):
    """A slot's start as text that compares with now_stamp()."""
    return f"{date_str} {time_str}"


def is_in_future(date_str, time_str):
    return stamp(date_str, time_str) > now_stamp()


def scheduled_at(date_str, time_str):
    """A clinic date and time as a local datetime."""
    return datetime.strptime(stamp(date_str, time_str), "%Y-%m-%d %H:%M")


def add_minutes(time_str, minutes):
    """Adds minutes to 'HH:MM'. Returns None if the result passes midnight."""
    hours, mins = map(int, time_str.split(":"))
    total = hours * 60 + mins + minutes
    if total >= 24 * 60:
        return None
    return f"{total // 60:02d}:{total % 60:02d}"
