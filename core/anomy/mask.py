from pathlib import Path

import cv2


def _load_overlay_image(path_value, width, height):
    if not path_value:
        return None

    image_path = Path(path_value)
    if not image_path.is_absolute():
        image_path = Path.cwd() / image_path

    overlay = cv2.imread(str(image_path))
    if overlay is None:
        return None

    return cv2.resize(overlay, (width, height), interpolation=cv2.INTER_LINEAR)


def apply_mask(image, faces, selected_ids, options=None):
    output = image.copy()
    process_options = options or {}
    mask_style = process_options.get("mask_style", "black_box")
    overlay_path = process_options.get("mask_image_path")

    for face in faces:
        if face.id not in selected_ids:
            continue

        x, y, w, h = face.bbox
        roi = output[y:y + h, x:x + w]
        if roi.size == 0:
            continue

        if mask_style == "image_overlay":
            overlay = _load_overlay_image(overlay_path, w, h)
            if overlay is not None:
                output[y:y + h, x:x + w] = overlay
                continue

        square_size = min(max(w, h), output.shape[0], output.shape[1])
        center_x = x + (w // 2)
        center_y = y + (h // 2)
        square_x = max(0, center_x - (square_size // 2))
        square_y = max(0, center_y - (square_size // 2))
        square_x2 = min(output.shape[1], square_x + square_size)
        square_y2 = min(output.shape[0], square_y + square_size)
        output[square_y:square_y2, square_x:square_x2] = 0

    return output
