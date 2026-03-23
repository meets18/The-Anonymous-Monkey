from flask import Blueprint, current_app, jsonify, request

from app.services.anonymizer_service import analyze_image, process_image

process_bp = Blueprint("process", __name__)

@process_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    file_id = data.get("file_id") or data.get("filepath")

    if not file_id:
        return jsonify({"error": "file_id is required"}), 400

    try:
        result = analyze_image(file_id, current_app.config["UPLOAD_FOLDER"])
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(result), 200


@process_bp.route("/process", methods=["POST"])
def process():
    data = request.get_json(silent=True) or {}

    file_id = data.get("file_id") or data.get("filepath")
    if not file_id:
        return jsonify({"error": "file_id is required"}), 400

    allowed_ids = data.get("allowed_ids", [])
    mode = data.get("mode", "blur")
    options = data.get("options", {})

    if not isinstance(allowed_ids, list):
        return jsonify({"error": "allowed_ids must be a list"}), 400
    if not isinstance(options, dict):
        return jsonify({"error": "options must be an object"}), 400

    try:
        result = process_image(
            file_id=file_id,
            allowed_ids=allowed_ids,
            mode=mode,
            options=options,
            upload_dir=current_app.config["UPLOAD_FOLDER"],
            output_dir=current_app.config["OUTPUT_FOLDER"],
        )
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except (ValueError, RuntimeError) as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(
        {
            "output": result["output_file"],
            "output_file": result["output_file"],
            "output_url": f"/output/{result['output_file']}",
            "faces": result["faces"],
            "face_count": result["face_count"],
            "mode": result["mode"],
            "processed_ids": result["processed_ids"],
        }
    ), 200
