from pathlib import Path

from flask import Flask, send_from_directory

from app.routes.output import output_bp
from app.routes.process import process_bp
from app.routes.upload import upload_bp


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "output"


def create_app():
    app = Flask(
        __name__,
        static_folder=str(BASE_DIR / "static"),
        static_url_path="/static",
    )
    app.config["UPLOAD_FOLDER"] = str(UPLOAD_DIR)
    app.config["OUTPUT_FOLDER"] = str(OUTPUT_DIR)
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    app.register_blueprint(upload_bp)
    app.register_blueprint(process_bp)
    app.register_blueprint(output_bp)

    @app.route("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    return app
