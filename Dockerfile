# Use Python 3.11 slim as the base image
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Set environment variables for unbuffered logging and data directory caching
ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/app/cache \
    MNE_DATA=/app/mne_data \
    NILEARN_DATA=/app/nilearn_data \
    SUBJECTS_DIR=/app/mne_data \
    PORT=8080 \
    PATH="/root/.local/bin:${PATH}"


# Install system dependencies required for scientific libraries and audio/video feature extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    build-essential \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install uv (provides uvx for tribev2 whisperx transcription)
RUN pip install --no-cache-dir --upgrade pip uv

# Install server dependencies and essential scientific helpers
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    python-multipart \
    mne \
    pydantic \
    jinja2

# Clone tribev2 from GitHub (required for TRIBE v2 inference pipeline)
RUN git clone --depth 1 https://github.com/facebookresearch/tribev2.git /app/tribev2_repo

# Install tribev2 package in editable mode along with its plotting dependencies (nilearn, nibabel, etc.)
RUN pip install -e "/app/tribev2_repo[plotting]"

# Pre-install whisperx for CPU transcription (avoids uvx bootstrap + CUDA downloads at runtime)
RUN uv tool install --python 3.11 whisperx

# Copy pre-download caching script and application server code
COPY pre_download.py /app/pre_download.py
COPY server.py /app/server.py

# Run the pre-download script during the build phase to bake weights and datasets into the image.
# This prevents runtime download delays on cold start.
RUN python /app/pre_download.py

# Expose port
EXPOSE 8080

# Start FastAPI server, binding to the port injected by Google Cloud Run ($PORT)
CMD uvicorn server:app --host 0.0.0.0 --port $PORT
