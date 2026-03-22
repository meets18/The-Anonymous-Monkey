from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from app.services.anonymizer_service import save_uploaded_file


upload_bp = Blueprint("upload", __name__)

@upload_bp.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "No file selected"}), 400

    try:
        saved_path = save_uploaded_file(file, current_app.config["UPLOAD_FOLDER"])
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(
        {
            "filepath": str(saved_path),
            "filename": Path(saved_path).name,
        }
    ), 201
