from pathlib import Path

from flask import Blueprint, current_app, jsonify, send_from_directory

from app.services.anonymizer_service import purge_stale_outputs


output_bp = Blueprint("output", __name__)

@output_bp.route("/output/<path:filename>", methods=["GET"])
def get_output_file(filename):
    safe_name = Path(filename).name
    if not safe_name or safe_name != filename:
        return jsonify({"error": "Invalid output file reference"}), 400

    output_dir = Path(current_app.config["OUTPUT_FOLDER"])
    purge_stale_outputs(
        output_dir,
        ttl_seconds=current_app.config.get("OUTPUT_TTL_SECONDS", 0),
    )
    target_path = output_dir / safe_name

    if not target_path.exists():
        return jsonify({"error": "Output file not found"}), 404

    response = send_from_directory(output_dir, safe_name)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0, private"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response
