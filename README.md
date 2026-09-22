
# The Anonymous Monkey — Face Anonymizer

A full-stack AI-powered web application that detects faces in images and selectively anonymizes them using blur, pixelation, or masking techniques.

---

## Features

* Upload images securely
* Automatic face detection
* Select specific faces to anonymize
* Multiple anonymization modes:

  * Blur
  * Pixelation
  * Mask
* Real-time preview + download
* Privacy-focused (temporary uploads, cleanup system)

---

## Tech Stack

**Frontend**

* HTML, CSS, JavaScript
* Custom UI + glassmorphism dashboard

**Backend**

* Python, Flask


**Computer Vision**

* OpenCV (face detection, processing)
* MediaPipe (enhanced detection support)



## How It Works

1. User uploads an image
2. Backend stores it temporarily (`runtime/uploads`)
3. Face detection runs and returns bounding boxes
4. User selects which faces to keep visible
5. Processing pipeline applies anonymization
6. Output is generated and served for preview/download

The system separates concerns cleanly:

* `app/` → API + routing
* `core/` → CV pipeline
* `static/` → frontend

---

## Run Locally

```bash
git clone <repo>
cd The-Anonymous-Monkey

pip install -r requirements.txt
python run.py
```

Open:

```
http://127.0.0.1:5000
```

## Future Improvements

* Real-time video anonymization
* Face tracking across frames
* Clickable face selection directly on image
* Streaming output (no disk storage)


