import cv2
from core.detection.face_detector import FaceDetector
from core.anomy.blur import apply_blur
from core.anomy.pixelate import apply_pixelation
from core.anomy.mask import apply_mask


class Processor:
    def __init__(self):
        self.detector = FaceDetector()

    def detect_faces(self, image_path):
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Unable to read image from the provided path.")

        return self.detector.detect(image)

    def process_image(self, image_path, selected_ids, mode="blur"):
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Unable to read image from the provided path.")


        faces = self.detector.detect(image)

        if mode == "blur":
            output = apply_blur(image, faces, selected_ids)
        elif mode == "pixelate":
            output = apply_pixelation(image, faces, selected_ids)
        elif mode == "mask":
            output = apply_mask(image, faces, selected_ids)
        else:
            output = image

        return output, faces
