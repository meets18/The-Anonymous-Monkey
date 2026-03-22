import cv2


def apply_mask(image, faces, selected_ids):
    output = image.copy()

    for face in faces:
        if face.id in selected_ids:
            x, y, w, h = face.bbox

            roi = output[y:y+h, x:x+w]

   
            black = roi * 0

         
            masked = cv2.addWeighted(roi, 0.2, black, 0.8, 0)

            output[y:y+h, x:x+w] = masked

    return output