"""The application object for hosting services and WSGI servers:

    waitress-serve --host=0.0.0.0 --port=8000 wsgi:app
    gunicorn wsgi:app

On your own computer, `python app.py` is simpler and does the same job.
"""
from server import create_app

app = create_app()
