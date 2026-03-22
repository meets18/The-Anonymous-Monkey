class Face:
    def __init__(self, face_id, bbox, confidence=1.0):
        self.id = face_id            
        self.bbox = bbox             
        self.confidence = confidence

    def to_dict(self):
        return {
            "id": int(self.id),
            "bbox": [int(value) for value in self.bbox],
            "confidence": self.confidence
        }
