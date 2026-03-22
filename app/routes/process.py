from flask import Blueprint, current_app, jsonify, request

from app.services.anonymizer_service import analyze_image, process_image

process_bp = Blueprint("process", __name__)

@process_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    filepath = data.get("filepath")

    if not filepath:
        return jsonify({"error": "filepath is required"}), 400

    try:
        result = analyze_image(filepath)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(result), 200


@process_bp.route("/process", methods=["POST"])
def process():
    data = request.get_json(silent=True) or {}

    filepath = data.get("filepath")
    if not filepath:
        return jsonify({"error": "filepath is required"}), 400

    allowed_ids = data.get("allowed_ids", [])
    mode = data.get("mode", "blur")
    options = data.get("options", {})

    if not isinstance(allowed_ids, list):
        return jsonify({"error": "allowed_ids must be a list"}), 400
    if not isinstance(options, dict):
        return jsonify({"error": "options must be an object"}), 400

    try:
        result = process_image(
            filepath=filepath,
            allowed_ids=allowed_ids,
            mode=mode,
            options=options,
            output_dir=current_app.config["OUTPUT_FOLDER"],
        )
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except (ValueError, RuntimeError) as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(
        {
            "output": result["output_path"],
            "faces": result["faces"],
            "face_count": result["face_count"],
            "mode": result["mode"],
            "processed_ids": result["processed_ids"],
        }
    ), 200
