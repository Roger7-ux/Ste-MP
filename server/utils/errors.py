from .constants import MESSAGES


class HttpError(Exception):
    """An error with an HTTP status. `errors` maps field names to messages.
    Sent to the client as { "message": "...", "errors": { "field": "..." } }."""

    def __init__(self, status, message, errors=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.errors = errors or {}


def assert_valid(errors):
    """Raises a 400 if any field error was collected."""
    if errors:
        raise HttpError(400, MESSAGES.fix_fields, errors)
