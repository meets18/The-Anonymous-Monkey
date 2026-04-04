# Base image
FROM python:3.10-slim

# Environment
ENV PYTHONUNBUFFERED=1

# Working directory
WORKDIR /app

# System dependencies (CRITICAL for OpenCV)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (cache optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . .

# Create runtime directories inside container
RUN mkdir -p runtime/uploads runtime/outputs

# Expose port
EXPOSE 5000

# Run using gunicorn (IMPORTANT: run.py entry)
CMD ["gunicorn", "-b", "0.0.0.0:5000", "run:app"]