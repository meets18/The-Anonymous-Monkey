import time
from pathlib import Path
from uuid import uuid4

import cv2
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from core.pipeline.processor import Processor


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
STALE_UPLOAD_TTL_SECONDS = 60 * 5

processor = Processor()


def _resolve_upload_path(file_id: str, upload_dir: str | Path) -> Path:
    filename = Path(file_id or "").name
    if not filename or filename != file_id:
        raise ValueError("Invalid file reference.")

    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type.")

    upload_root = Path(upload_dir).resolve()
    path = (upload_root / filename).resolve()

    if path.parent != upload_root:
        raise ValueError("Invalid file reference.")

    if not path.exists() or not path.is_file():
        raise FileNotFoundError("Image file was not found.")

    return path


def _build_output_path(output_dir: str | Path, source_path: Path) -> Path:
    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    return output_root / f"output_{source_path.stem}_{uuid4().hex[:8]}{source_path.suffix}"


def _face_payload(faces):
    return [face.to_dict() for face in faces]


def _delete_file(path: Path | None):
    if not path:
        return

    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def purge_stale_uploads(upload_dir: str | Path, ttl_seconds: int = STALE_UPLOAD_TTL_SECONDS):
    upload_root = Path(upload_dir)
    if not upload_root.exists():
        return

    cutoff = time.time() - ttl_seconds
    for path in upload_root.iterdir():
        if not path.is_file():
            continue
        try:
            if path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
        except OSError:
            continue


def save_uploaded_file(file: FileStorage, upload_dir: str | Path) -> Path:
    filename = secure_filename(file.filename or "")
    if not filename:
        raise ValueError("Filename is missing.")

    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type.")

    upload_root = Path(upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    purge_stale_uploads(upload_root)

    saved_path = upload_root / f"{uuid4().hex}{extension}"
    file.save(saved_path)
    return saved_path


def analyze_image(file_id: str, upload_dir: str | Path):
    source_path = _resolve_upload_path(file_id, upload_dir)
    faces = processor.detect_faces(str(source_path))

    return {
        "file_id": source_path.name,
        "faces": _face_payload(faces),
        "face_count": len(faces),
    }


def process_image(file_id: str, allowed_ids=None, mode="blur", options=None, upload_dir="uploads", output_dir="output"):
    source_path = _resolve_upload_path(file_id, upload_dir)
    selected_ids = allowed_ids or []
    process_options = dict(options or {})
    overlay_path = None

    mask_image_id = process_options.get("mask_image_id") or process_options.get("mask_image_path")
    if mask_image_id:
        overlay_path = _resolve_upload_path(mask_image_id, upload_dir)
        process_options["mask_image_path"] = str(overlay_path)
    else:
        process_options.pop("mask_image_path", None)

    try:
        output_image, faces = processor.process_image(
            str(source_path),
            selected_ids,
            mode=mode,
            options=process_options,
        )

        if output_image is None:
            raise ValueError("Processor could not read the input image.")

        output_path = _build_output_path(output_dir, source_path)
        success = cv2.imwrite(str(output_path), output_image)
        if not success:
            raise RuntimeError("Failed to save processed image.")
    finally:
        _delete_file(source_path)
        _delete_file(overlay_path)

    return {
        "file_id": source_path.name,
        "output_file": output_path.name,
        "faces": _face_payload(faces),
        "face_count": len(faces),
        "mode": mode,
        "options": process_options,
        "processed_ids": selected_ids,
    }
