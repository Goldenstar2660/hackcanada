FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_VERSION=12.1

WORKDIR /workspace

# Install Python, CUDA libraries, and essentials
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3.10-dev \
    git \
    curl \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    # CUDA runtime libraries for GPU support
    libcuda1 \
    libcudnn8 \
    libnccl2 \
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
