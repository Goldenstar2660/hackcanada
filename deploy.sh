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

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Deploying ML Engine to ${TARGET} (runtime: $RUNTIME) ==="

if [[ "$TARGET" == *@* ]]; then
    # Remote execution
    SSH_HOST="$TARGET"
    
    # Step 1: Install deps on remote
    echo "[1/4] Installing dependencies..."
    ssh "$SSH_HOST" '
    if [ "$RUNTIME" = "docker" ]; then
        if ! command -v docker &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y ca-certificates curl gnupg lsb-release
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io
        fi
    else
        if ! command -v pip3 &> /dev/null; then
            sudo apt-get install -y python3 python3-pip
        fi
        pip3 install --user -r requirements.txt
    fi
    '
    
    # Step 2: Check repo on remote
    echo "[2/4] Checking repository..."
    ssh "$SSH_HOST" 'if [ ! -d ~/hackcanada ]; then echo "ERROR: Clone repo first"; exit 1; fi'
    
    # Step 3: Start training on remote
    echo "[3/4] Starting training..."
    ssh "$SSH_HOST" '
    cd ~/hackcanada
    tmux kill-session -t training 2>/dev/null || true
    if [ "$RUNTIME" = "docker" ]; then
        docker build -t waste-classifier:latest .
        tmux new-session -d -s training "docker run --gpus all --runtime nvidia -v $(pwd)/data:/data -v $(pwd)/models:/models -v $(pwd)/training.log:/workspace/training.log --name waste-classifier-train waste-classifier:latest python3 src/train.py --epochs 10 --batch-size 32"
    else
        tmux new-session -d -s training "python3 src/train.py --epochs 10 --batch-size 32"
    fi
    '
    
    # Step 4: Verify
    echo "[4/4] Verifying..."
    ssh "$SSH_HOST" 'tmux list-sessions 2>/dev/null || echo "No sessions"'

else
    # Local execution - use current directory
    cd "$SCRIPT_DIR"
    
    # Step 1: Install deps
    echo "[1/4] Installing dependencies..."
    if [ "$RUNTIME" = "docker" ]; then
        if ! command -v docker &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io
        fi
    else
        pip3 install --user --no-cache-dir -r requirements.txt 2>/dev/null || pip3 install --no-cache-dir -r requirements.txt
    fi
    
    # Step 2: Already in repo
    echo "[2/4] Repository ready: $(pwd)"
    
    # Step 3: Start training
    echo "[3/4] Starting training..."
    tmux kill-session -t training 2>/dev/null || true
    
    if [ "$RUNTIME" = "docker" ]; then
        docker build -t "$IMAGE_NAME" .
        tmux new-session -d -s training "docker run --gpus all --runtime nvidia -v $(pwd)/data:/data -v $(pwd)/models:/models -v $(pwd)/training.log:/workspace/training.log --name $CONTAINER_NAME $IMAGE_NAME python3 src/train.py --epochs 10 --batch-size 32"
    else
        tmux new-session -d -s training "python3 src/train.py --epochs 10 --batch-size 32"
    fi
    
    # Step 4: Verify
    echo "[4/4] Verifying..."
    tmux list-sessions 2>/dev/null || echo "No tmux sessions"
fi

echo "Done! Monitor with: tmux attach -t training"
