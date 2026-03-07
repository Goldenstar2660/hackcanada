#!/bin/bash
# Deploy ML Training Pipeline to Remote Machine (Docker or uDocker)
# Usage: ./deploy.sh [REMOTE_USER@REMOTE_HOST] [CONTAINER_RUNTIME]
#   CONTAINER_RUNTIME: docker (default) or udocker

set -e

REMOTE_HOST="${1:-gpu-server}"
RUNTIME="${2:-docker}"
REPO_URL="https://github.com/yourusername/hackcanada.git"
CONTAINER_NAME="waste-classifier-train"
IMAGE_NAME="waste-classifier:latest"

echo "=== Deploying ML Engine to $REMOTE_HOST (runtime: $RUNTIME) ==="

# Step 1: Install container runtime
echo "[1/6] Installing container runtime..."
ssh "$REMOTE_HOST" << EOF
if [ "$RUNTIME" = "udocker" ]; then
    if ! command -v udocker &> /dev/null; then
        apt-get update
        apt-get install -y python3 python3-pip
        pip3 install udocker
        udocker install
    fi
    udocker --version
elif [ "$RUNTIME" = "docker" ]; then
    if ! command -v docker &> /dev/null; then
        apt-get update
        apt-get install -y ca-certificates curl gnupg lsb-release
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
    docker --version
fi
EOF

# Step 2: Install NVIDIA tools (if GPU available)
echo "[2/6] Checking GPU availability..."
ssh "$REMOTE_HOST" << 'EOF'
if command -v nvidia-smi &> /dev/null; then
    echo "GPU detected:"
    nvidia-smi --query-gpu=name,memory.total --format=csv
    
    if [ "$RUNTIME" = "docker" ]; then
        # Install NVIDIA Container Toolkit for Docker
        distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
        curl -fsSL https://nvidia.github.io/nvidia-docker/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-docker.gpg 2>/dev/null || true
        curl -fsSL https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
            sed 's|deb|deb [signed-by=/usr/share/keyrings/nvidia-docker.gpg]|' > /etc/apt/sources.list.d/nvidia-docker.list 2>/dev/null || true
        apt-get update 2>/dev/null
        apt-get install -y nvidia-container-toolkit 2>/dev/null || true
        nvidia-ctk runtime configure --runtime=docker 2>/dev/null || true
        systemctl restart docker 2>/dev/null || true
    fi
else
    echo "No GPU detected - training will use CPU"
fi
EOF

# Step 3: Clone repository
echo "[3/6] Cloning repository..."
ssh "$REMOTE_HOST" << EOF
if [ ! -d ~/hackcanada ]; then
    git clone $REPO_URL ~/hackcanada
else
    cd ~/hackcanada && git pull
fi
ls -la ~/hackcanada
EOF

# Step 4: Build image
echo "[4/6] Building container image..."
ssh "$REMOTE_HOST" << EOF
cd ~/hackcanada

if [ "$RUNTIME" = "udocker" ]; then
    # uDocker: import instead of build
    udocker pull ubuntu:22.04
    udocker create --name=$IMAGE_NAME ubuntu:22.04
    # Install deps in container
    udocker run $IMAGE_NAME apt-get update
    udocker run $IMAGE_NAME apt-get install -y python3 python3-pip git curl tesseract-ocr libgl1-mesa-glx libglib2.0-0
    udocker run $IMAGE_NAME pip3 install --no-cache-dir -r requirements.txt
    echo "Image prepared for udocker"
elif [ "$RUNTIME" = "docker" ]; then
    docker build -t $IMAGE_NAME .
    echo "Docker image built: $IMAGE_NAME"
fi
EOF

# Step 5: Start container
echo "[5/6] Starting training container..."
ssh "$REMOTE_HOST" << EOF
cd ~/hackcanada
tmux kill-session -t training 2>/dev/null || true

if [ "$RUNTIME" = "udocker" ]; then
    # uDocker: use --nv flag for GPU, set env vars
    tmux new-session -d -s training "udocker run --nv \\
        -e NVIDIA_VISIBLE_DEVICES=all \\
        -e CUDA_VISIBLE_DEVICES=0 \\
        -v \$(pwd)/hackcanada/data:/data \\
        -v \$(pwd)/hackcanada/models:/models \\
        -v \$(pwd)/hackcanada/training.log:/workspace/training.log \\
        --name $CONTAINER_NAME \\
        $IMAGE_NAME \\
        python3 src/train.py --epochs 10 --batch-size 32"
elif [ "$RUNTIME" = "docker" ]; then
    tmux new-session -d -s training "docker run --gpus all --runtime nvidia \\
        -v \$(pwd)/hackcanada/data:/data \\
        -v \$(pwd)/hackcanada/models:/models \\
        -v \$(pwd)/hackcanada/training.log:/workspace/training.log \\
        --name $CONTAINER_NAME \\
        $IMAGE_NAME \\
        python3 src/train.py --epochs 10 --batch-size 32"
fi

echo "Container started in tmux session 'training'"
EOF

# Step 6: Verify
echo "[6/6] Verifying deployment..."
ssh "$REMOTE_HOST" << 'EOF'
echo "=== Tmux Session ==="
tmux list-sessions 2>/dev/null || echo "No tmux sessions"

if command -v nvidia-smi &> /dev/null; then
    echo "=== GPU Available ==="
    nvidia-smi --query-gpu=name,memory.total --format=csv
fi

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Runtime: $RUNTIME"
echo ""
echo "To monitor training:"
echo "  ssh $REMOTE_HOST 'tmux attach -t training'"
echo ""
echo "To check logs:"
echo "  tail -f ~/hackcanada/training.log"
EOF

echo "Done! ML Engine ready."
