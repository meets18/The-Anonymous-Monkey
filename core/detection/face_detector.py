import cv2

from core.models.face import Face


class FaceDetector:
    def __init__(self):
        cascade_dir = cv2.data.haarcascades
        self.frontal_detector = cv2.CascadeClassifier(
            cascade_dir + "haarcascade_frontalface_default.xml"
        )
        self.frontal_alt_detector = cv2.CascadeClassifier(
            cascade_dir + "haarcascade_frontalface_alt2.xml"
        )
        self.profile_detector = cv2.CascadeClassifier(
            cascade_dir + "haarcascade_profileface.xml"
        )
        self.next_id = 0

    def _run_detector(self, detector, image, *, scale_factor, min_neighbors):
        boxes = detector.detectMultiScale(
            image,
            scaleFactor=scale_factor,
            minNeighbors=min_neighbors,
            minSize=(28, 28),
        )
        return [tuple(int(value) for value in box) for box in boxes]

    def _rotate_image(self, image, angle):
        height, width = image.shape[:2]
        center = (width / 2, height / 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            image,
            matrix,
            (width, height),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE,
        )
        return rotated, matrix

    def _unrotate_box(self, bbox, matrix):
        x, y, w, h = bbox
        corners = [
            (x, y),
            (x + w, y),
            (x, y + h),
            (x + w, y + h),
        ]

        inverse_matrix = cv2.invertAffineTransform(matrix)
        original_points = []
        for corner_x, corner_y in corners:
            mapped_x = (
                inverse_matrix[0, 0] * corner_x
                + inverse_matrix[0, 1] * corner_y
                + inverse_matrix[0, 2]
            )
            mapped_y = (
                inverse_matrix[1, 0] * corner_x
                + inverse_matrix[1, 1] * corner_y
                + inverse_matrix[1, 2]
            )
            original_points.append((mapped_x, mapped_y))

        xs = [point[0] for point in original_points]
        ys = [point[1] for point in original_points]
        left = int(round(min(xs)))
        top = int(round(min(ys)))
        right = int(round(max(xs)))
        bottom = int(round(max(ys)))
        return left, top, right - left, bottom - top

    def _clip_box(self, bbox, width, height):
        x, y, w, h = bbox
        x = max(0, x)
        y = max(0, y)
        right = min(width, x + w)
        bottom = min(height, y + h)

        clipped_width = right - x
        clipped_height = bottom - y
        if clipped_width <= 0 or clipped_height <= 0:
            return None
        return x, y, clipped_width, clipped_height

    def _iou(self, box_a, box_b):
        ax, ay, aw, ah = box_a
        bx, by, bw, bh = box_b
        a_right = ax + aw
        a_bottom = ay + ah
        b_right = bx + bw
        b_bottom = by + bh

        inter_left = max(ax, bx)
        inter_top = max(ay, by)
        inter_right = min(a_right, b_right)
        inter_bottom = min(a_bottom, b_bottom)

        inter_width = max(0, inter_right - inter_left)
        inter_height = max(0, inter_bottom - inter_top)
        intersection = inter_width * inter_height
        if intersection == 0:
            return 0.0

        area_a = aw * ah
        area_b = bw * bh
        union = area_a + area_b - intersection
        return intersection / union if union else 0.0

    def _deduplicate(self, boxes):
        deduped = []
        for box in sorted(boxes, key=lambda item: item[2] * item[3], reverse=True):
            if any(self._iou(box, existing) > 0.35 for existing in deduped):
                continue
            deduped.append(box)
        return deduped

    def detect(self, image):
        self.next_id = 0
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        normalized = cv2.equalizeHist(gray)
        height, width = normalized.shape[:2]

        detections = []
        detector_runs = [
            (self.frontal_detector, normalized, 1.08, 4),
            (self.frontal_alt_detector, normalized, 1.05, 4),
            (self.profile_detector, normalized, 1.08, 3),
            (self.profile_detector, cv2.flip(normalized, 1), 1.08, 3),
        ]

        for detector, source, scale_factor, min_neighbors in detector_runs:
            boxes = self._run_detector(
                detector,
                source,
                scale_factor=scale_factor,
                min_neighbors=min_neighbors,
            )
            for x, y, w, h in boxes:
                if source is normalized:
                    detections.append((x, y, w, h))
                else:
                    detections.append((width - (x + w), y, w, h))

        for angle in (-20, -10, 10, 20):
            rotated, matrix = self._rotate_image(normalized, angle)
            for detector in (self.frontal_detector, self.frontal_alt_detector):
                boxes = self._run_detector(
                    detector,
                    rotated,
                    scale_factor=1.08,
                    min_neighbors=3,
                )
                for box in boxes:
                    restored_box = self._clip_box(
                        self._unrotate_box(box, matrix),
                        width,
                        height,
                    )
                    if restored_box is not None:
                        detections.append(restored_box)

        unique_boxes = self._deduplicate(detections)

        detected_faces = []
        for bbox in unique_boxes:
            face = Face(self.next_id, bbox)
            detected_faces.append(face)
            self.next_id += 1

        return detected_faces
