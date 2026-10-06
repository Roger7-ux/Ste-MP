from flask import request


def body():
    """The JSON request body as a dict; anything else counts as empty."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}
