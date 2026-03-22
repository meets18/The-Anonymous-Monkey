from pathlib import Path
from uuid import uuid4

import cv2
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from core.pipeline.processor import Processor


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

processor = Processor()


def _validate_image_path(filepath: str) -> Path:
    path = Path(filepath)
    if not path.is_absolute():
        path = Path.cwd() / path

    if not path.exists() or not path.is_file():
        raise FileNotFoundError("Image file was not found.")

    return path


def _build_output_path(output_dir: str | Path, source_path: Path) -> Path:
    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    return output_root / f"output_{source_path.stem}_{uuid4().hex[:8]}{source_path.suffix}"


def _face_payload(faces):
    return [face.to_dict() for face in faces]


def save_uploaded_file(file: FileStorage, upload_dir: str | Path) -> Path:
    filename = secure_filename(file.filename or "")
    if not filename:
        raise ValueError("Filename is missing.")

    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type.")

    upload_root = Path(upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)

    saved_path = upload_root / f"{uuid4().hex}{extension}"
    file.save(saved_path)
    return saved_path


def analyze_image(filepath: str):
    source_path = _validate_image_path(filepath)
    faces = processor.detect_faces(str(source_path))

    return {
        "filepath": str(source_path),
        "faces": _face_payload(faces),
        "face_count": len(faces),
    }


def process_image(filepath: str, allowed_ids=None, mode="blur", output_dir="output"):
    source_path = _validate_image_path(filepath)
    selected_ids = allowed_ids or []

    output_image, faces = processor.process_image(
        str(source_path),
        selected_ids,
        mode=mode,
    )

    if output_image is None:
        raise ValueError("Processor could not read the input image.")

    output_path = _build_output_path(output_dir, source_path)
    success = cv2.imwrite(str(output_path), output_image)
    if not success:
        raise RuntimeError("Failed to save processed image.")

    return {
        "filepath": str(source_path),
        "output_path": str(output_path),
        "faces": _face_payload(faces),
        "face_count": len(faces),
        "mode": mode,
        "processed_ids": selected_ids,
    }
