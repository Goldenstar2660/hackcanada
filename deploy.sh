#!/bin/bash
# Deploy ML Training Pipeline - Local or Remote
# Usage: 
#   Local:  ./deploy.sh
#   Remote: ./deploy.sh user@host

set -e

TARGET="${1:-local}"
RUNTIME="${2:-native}"
REPO_URL="https://github.com/yourusername/hackcanada.git"
CONTAINER_NAME="waste-classifier-train"
IMAGE_NAME="waste-classifier:latest"

# Determine if remote
is_remote() {
    [[ "$TARGET" == *@* ]]
}

run_cmd() {
    if is_remote; then
        ssh "$TARGET" "$1"
    else
        eval "$1"
    fi
}

# Use sudo for local apt commands
SUDO=""
if ! is_remote && [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
fi

echo "=== Deploying ML Engine to ${TARGET} (runtime: $RUNTIME) ==="

# Step 1: Install deps
echo "[1/4] Installing dependencies..."
run_cmd '
if [ "$RUNTIME" = "docker" ]; then
    if ! command -v docker &> /dev/null; then
        $SUDO apt-get update
        $SUDO apt-get install -y ca-certificates curl gnupg lsb-release
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        $SUDO apt-get update
        $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io
    fi
    docker --version
else
    # Native/udocker: install Python deps on host
    if [ "$RUNTIME" = "native" ] || [ "$RUNTIME" = "udocker" ]; then
        $SUDO apt-get update
        $SUDO apt-get install -y python3 python3-pip git curl tesseract-ocr libgl1-mesa-glx libglib2.0-0
        pip3 install --no-cache-dir -r requirements.txt
    fi
fi
'

# Step 2: Clone repo
echo "[2/4] Setting up repository..."
run_cmd '
if [ ! -d ~/hackcanada ]; then
    git clone $REPO_URL ~/hackcanada
else
    cd ~/hackcanada && git pull
fi
cd ~/hackcanada
'

# Step 3: Build/run
echo "[3/4] Starting training..."
run_cmd '
cd ~/hackcanada
tmux kill-session -t training 2>/dev/null || true

if [ "$RUNTIME" = "docker" ]; then
    docker build -t $IMAGE_NAME .
    tmux new-session -d -s training "docker run --gpus all --runtime nvidia \
        -v \$(pwd)/data:/data \
        -v \$(pwd)/models:/models \
        -v \$(pwd)/training.log:/workspace/training.log \
        --name $CONTAINER_NAME \
        $IMAGE_NAME \
        python3 src/train.py --epochs 10 --batch-size 32"
else
    # Native/udocker: run directly
    tmux new-session -d -s training "python3 src/train.py --epochs 10 --batch-size 32"
fi
'

# Step 4: Verify
echo "[4/4] Verifying..."
run_cmd '
echo "=== Tmux Session ==="
tmux list-sessions 2>/dev/null || echo "No tmux sessions"

if command -v nvidia-smi &> /dev/null; then
    echo "=== GPU ==="
    nvidia-smi --query-gpu=name,memory.total --format=csv
fi

echo ""
echo "=== DONE ==="
echo "Monitor: tmux attach -t training"
'

echo "Done!"
