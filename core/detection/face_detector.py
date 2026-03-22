import cv2
from core.models.face import Face


class FaceDetector:
    def __init__(self):
        self.detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.next_id = 0

    def detect(self, image):
        self.next_id = 0
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.detector.detectMultiScale(gray, 1.3, 5)

        detected_faces = []
        for (x, y, w, h) in faces:
            face = Face(self.next_id, (x, y, w, h))
            detected_faces.append(face)
            self.next_id += 1

        return detected_faces
