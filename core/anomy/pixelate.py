import cv2


def _standard_pixelate(roi, width, height):
    pixel_size = max(5, max(width, height) // 10)
    small = cv2.resize(roi, (pixel_size, pixel_size), interpolation=cv2.INTER_LINEAR)
    return cv2.resize(small, (width, height), interpolation=cv2.INTER_NEAREST)


def _bw_block_pixelate(roi, width, height):
    pixel_size = max(6, max(width, height) // 8)
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, (pixel_size, pixel_size), interpolation=cv2.INTER_LINEAR)
    _, thresholded = cv2.threshold(small, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    bw = cv2.resize(thresholded, (width, height), interpolation=cv2.INTER_NEAREST)
    return cv2.cvtColor(bw, cv2.COLOR_GRAY2BGR)


def apply_pixelation(image, faces, selected_ids, options=None):
    output = image.copy()
    process_options = options or {}
    pixelate_style = process_options.get("pixelate_style", "standard")

    for face in faces:
        if face.id not in selected_ids:
            continue

        x, y, w, h = face.bbox
        roi = output[y:y + h, x:x + w]
        if roi.size == 0:
            continue

        if pixelate_style == "bw_blocks":
            pixelated = _bw_block_pixelate(roi, w, h)
        else:
            pixelated = _standard_pixelate(roi, w, h)

        output[y:y + h, x:x + w] = pixelated

    return output
