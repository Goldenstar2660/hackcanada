#!/bin/bash
# Deploy ML Training Pipeline - Local or Remote
# Usage: 
#   Local:  ./deploy.sh
#   Remote: ./deploy.sh user@host

set -e

TARGET="${1:-local}"
RUNTIME="${2:-native}"
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

# Check for sudo / virtualenv
SUDO=""
if ! is_remote && [ "$(id -u)" -ne 0 ]; then
    if sudo -n true 2>/dev/null; then
        SUDO="sudo"
    elif [ -n "$VIRTUAL_ENV" ]; then
        SUDO=""
    else
        echo "WARNING: No sudo, not in venv - using pip --user"
    fi
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
    # Native/udocker: install Python deps (no sudo = pip --user)
    if [ "$RUNTIME" = "native" ] || [ "$RUNTIME" = "udocker" ]; then
        PIP_FLAGS=""
        # Check for virtualenv
        if [ -n "$VIRTUAL_ENV" ] || [ -n "$venv" ]; then
            PIP_FLAGS=""
        elif [ -n "$SUDO" ]; then
            $SUDO apt-get update
            $SUDO apt-get install -y python3 python3-pip git curl libgl1-mesa-glx libglib2.0-0 || true
        else
            PIP_FLAGS="--user"
        fi
        pip3 install $PIP_FLAGS --no-cache-dir -r requirements.txt
    fi
fi
'

# Step 2: Setup repo
echo "[2/4] Setting up repository..."
run_cmd '
if is_remote; then
    if [ ! -d ~/hackcanada ]; then
        echo "ERROR: Remote setup requires repo to be cloned manually or use GitHub"
        exit 1
    fi
    cd ~/hackcanada
else
    # Local: use current directory
    cd "$(cd "$(dirname "$0")" && pwd)"
fi
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
