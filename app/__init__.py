from pathlib import Path

from flask import Flask, send_from_directory

from app.routes.output import output_bp
from app.routes.process import process_bp
from app.routes.upload import upload_bp
from app.services.anonymizer_service import (
    STALE_OUTPUT_TTL_SECONDS,
    purge_stale_outputs,
    purge_stale_uploads,
)


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "runtime" / "uploads"
OUTPUT_DIR = BASE_DIR / "runtime" / "outputs"
LEGACY_UPLOAD_DIR = BASE_DIR / "uploads"
LEGACY_OUTPUT_DIR = BASE_DIR / "output"


def create_app():
    app = Flask(
        __name__,
        static_folder=str(BASE_DIR / "static"),
        static_url_path="/static",
    )
    app.config["UPLOAD_FOLDER"] = str(UPLOAD_DIR)
    app.config["OUTPUT_FOLDER"] = str(OUTPUT_DIR)
    app.config["OUTPUT_TTL_SECONDS"] = STALE_OUTPUT_TTL_SECONDS
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    purge_stale_uploads(UPLOAD_DIR)
    purge_stale_outputs(OUTPUT_DIR, ttl_seconds=app.config["OUTPUT_TTL_SECONDS"])
    purge_stale_uploads(LEGACY_UPLOAD_DIR, ttl_seconds=0)
    purge_stale_outputs(LEGACY_OUTPUT_DIR, ttl_seconds=0)

    app.register_blueprint(upload_bp)
    app.register_blueprint(process_bp)
    app.register_blueprint(output_bp)

    @app.route("/")
    def index():
        return send_from_directory(app.static_folder, "face-anonymizer.html")

    return app
