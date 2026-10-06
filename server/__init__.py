from pathlib import Path

from flask import Flask, send_from_directory
from flask_wtf.csrf import CSRFError
from sqlalchemy import event
from sqlalchemy.engine import Engine
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config

from .extensions import csrf, db, login_manager
from .migrate import ensure_schema
from .models import User
from .routes import BLUEPRINTS
from .services import slot_service
from .utils.errors import HttpError


@event.listens_for(Engine, "connect")
def _sqlite_pragmas(connection, _record):
    """Foreign keys on. The journal is the plain rollback kind, which keeps
    the database a single file: write-ahead logging adds two side files that
    folder-sync tools such as OneDrive tend to lock."""
    if connection.__class__.__module__.startswith("sqlite3"):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute("PRAGMA journal_mode = DELETE")
        cursor.close()


def create_app(overrides=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    app.config.update(overrides or {})
    if not app.config.get("SECRET_KEY"):
        app.config["SECRET_KEY"] = Config.secret_key()

    uri = app.config["SQLALCHEMY_DATABASE_URI"]
    if uri.startswith("sqlite:///") and ":memory:" not in uri:
        Path(uri.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)

    if app.config.get("TRUST_PROXY"):
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    db.init_app(app)
    csrf.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)

    with app.app_context():
        ensure_schema()
        slot_service.top_up_once_a_day()

    # While the app stays running, each new day gets its slots on the first request.
    app.before_request(slot_service.top_up_once_a_day)

    _register_error_handlers(app)
    _register_frontend(app)
    return app


def _register_error_handlers(app):
    @app.errorhandler(HttpError)
    def api_error(error):
        return {"message": error.message, "errors": error.errors}, error.status

    @app.errorhandler(CSRFError)
    def csrf_error(_error):
        return {"message": "Your session has expired. Please try again.", "code": "csrf", "errors": {}}, 400

    @app.errorhandler(HTTPException)
    def http_error(error):
        return {"message": error.description, "errors": {}}, error.code

    @app.errorhandler(Exception)
    def unexpected(error):
        app.logger.exception(error)
        db.session.rollback()
        return {"message": "Something went wrong on the server. Please try again.", "errors": {}}, 500


def _register_frontend(app):
    """Serves the built React app, so one command and one port run everything."""
    dist = Path(app.config["CLIENT_DIST"])

    @app.get("/")
    @app.get("/<path:path>")
    def frontend(path=""):
        if path.startswith("api/"):
            return {"message": "Not found.", "errors": {}}, 404
        if not (dist / "index.html").exists():
            return (
                "<h1>MediQ</h1><p>The API is running, but the interface has not been built yet. "
                "Run <code>npm install</code> and <code>npm run build</code> in the project folder, "
                "then reload this page.</p>",
                503,
            )
        if path and (dist / path).is_file():
            return send_from_directory(dist, path)
        # Every other address belongs to the React router.
        return send_from_directory(dist, "index.html")
