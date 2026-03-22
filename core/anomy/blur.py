import cv2
import numpy as np


def _build_face_mask(width, height):
    mask = np.zeros((height, width), dtype=np.uint8)

    center = (width // 2, int(height * 0.48))
    axes = (
        max(1, int(width * 0.42)),
        max(1, int(height * 0.52)),
    )
    cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)

    feather = max(9, ((max(width, height) // 6) | 1))
    return cv2.GaussianBlur(mask, (feather, feather), 0)


def apply_blur(image, faces, selected_ids):
    output = image.copy()

    for face in faces:
        if face.id not in selected_ids:
            continue

        x, y, w, h = face.bbox
        roi = output[y:y + h, x:x + w]
        if roi.size == 0:
            continue

        kernel = max(15, (max(w, h) // 2) | 1)
        blurred = cv2.GaussianBlur(roi, (kernel, kernel), 0)

        mask = _build_face_mask(w, h).astype(np.float32) / 255.0
        mask = mask[..., None]

        blended = (blurred.astype(np.float32) * mask) + (roi.astype(np.float32) * (1.0 - mask))
        output[y:y + h, x:x + w] = blended.astype(np.uint8)

    return output
