import cv2


def apply_pixelation(image, faces, selected_ids):
    output = image.copy()

    for face in faces:
        if face.id in selected_ids:
            x, y, w, h = face.bbox
            roi = output[y:y+h, x:x+w]

         
            pixel_size = max(w, h) // 10   

            if pixel_size < 5:
                pixel_size = 5

      
            small = cv2.resize(roi, (pixel_size, pixel_size))
            pixelated = cv2.resize(
                small, (w, h), interpolation=cv2.INTER_NEAREST
            )

            output[y:y+h, x:x+w] = pixelated

    return output