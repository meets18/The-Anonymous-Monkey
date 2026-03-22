from pathlib import Path

from flask import Blueprint, current_app, jsonify, send_from_directory


output_bp = Blueprint("output", __name__)

@output_bp.route("/output/<path:filename>", methods=["GET"])
def get_output_file(filename):
    output_dir = Path(current_app.config["OUTPUT_FOLDER"])
    target_path = output_dir / filename

    if not target_path.exists():
        return jsonify({"error": "Output file not found"}), 404

    return send_from_directory(output_dir, filename)
