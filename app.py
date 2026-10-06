"""Starts MediQ, the Smart Queue Management System:  python app.py

One process serves both the API and the interface, using the Waitress
production server. The database is a single SQLite file that is created, and
brought up to date, on start. Settings are in config.py.
"""
import socket

from waitress import serve

from config import DEFAULT_CLINIC_CODE
from server import create_app

app = create_app()


def _is_free(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        try:
            probe.bind((host, port))
            return True
        except OSError:
            return False


def _pick_port(host, preferred, attempts=20):
    """The configured port, or the next free one when something else has it."""
    for port in range(preferred, preferred + attempts):
        if _is_free(host, port):
            return port
    raise SystemExit(f"No free port between {preferred} and {preferred + attempts - 1}. Set PORT to another value.")


def _network_address():
    """This computer's address on the local network, for other devices."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("10.255.255.255", 1))  # no data is sent
            return probe.getsockname()[0]
    except OSError:
        return None


if __name__ == "__main__":
    host = app.config["HOST"]
    port = _pick_port(host, app.config["PORT"])
    if port != app.config["PORT"]:
        print(f" * Port {app.config['PORT']} is in use by another program, so using {port} instead.")
    print(f" * Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f" * MediQ is running at http://localhost:{port}")
    if host == "0.0.0.0":
        address = _network_address()
        if address:
            print(f" * Other devices on this network: http://{address}:{port}")
    else:
        print(" * Only this computer can open it. Set HOST=0.0.0.0 to let phones and other computers in.")
    if app.config["CLINIC_CODE"] == DEFAULT_CLINIC_CODE:
        print(" * Warning: the clinic code is still the default. Set CLINIC_CODE before real use,")
        print("   or anyone who has read the documentation can create a staff account.")
    print(" * Press Ctrl+C to stop.", flush=True)
    serve(app, host=host, port=port, threads=8, ident="MediQ")
