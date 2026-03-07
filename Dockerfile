FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

WORKDIR /workspace

# Install Python and essential packages
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    git \
    curl \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Create directories
RUN mkdir -p /data /models /logs

# Copy source
COPY src/ /workspace/src/
COPY scripts/ /workspace/scripts/
COPY data/ /workspace/data/

# Set environment
ENV PYTHONPATH=/workspace:$PYTHONPATH
ENV LOG_DIR=/logs
ENV MODELS_DIR=/models

# Default command
CMD ["python3", "src/train.py", "--help"]
