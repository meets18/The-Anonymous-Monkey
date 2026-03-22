import cv2


def apply_blur(image, faces, selected_ids):
    output = image.copy()

    for face in faces:
        if face.id in selected_ids:
            x, y, w, h = face.bbox
            roi = output[y:y+h, x:x+w]

            
            k = max(w, h) // 3   

           
            if k % 2 == 0:
                k += 1

            blurred = cv2.GaussianBlur(roi, (k, k), 0)
            output[y:y+h, x:x+w] = blurred

    return output