#!/bin/bash
# Deploy ML Training Pipeline to Remote GPU Machine
# Usage: ./deploy.sh [REMOTE_USER@REMOTE_HOST]

set -e

REMOTE_HOST="${1:-gpu-server}"
REPO_URL="https://github.com/yourusername/hackcanada.git"
CONTAINER_NAME="waste-classifier-train"
IMAGE_NAME="waste-classifier:latest"

echo "=== Deploying ML Engine to $REMOTE_HOST ==="

# Step 1: Install Docker if not present
echo "[1/6] Installing Docker..."
ssh "$REMOTE_HOST" << 'EOF'
if ! command -v docker &> /dev/null; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
docker --version
EOF

# Step 2: Install NVIDIA Container Toolkit
echo "[2/6] Installing NVIDIA Container Toolkit..."
ssh "$REMOTE_HOST" << 'EOF'
if ! command -v nvidia-smi &> /dev/null; then
    echo "ERROR: No NVIDIA GPU detected on remote"
    exit 1
fi

distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/nvidia-docker/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-docker.gpg
curl -fsSL https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
    sed 's|deb|deb [signed-by=/usr/share/keyrings/nvidia-docker.gpg]|' > /etc/apt/sources.list.d/nvidia-docker.list

apt-get update
apt-get install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker
nvidia-smi
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

# Step 4: Build Docker image
echo "[4/6] Building Docker image..."
ssh "$REMOTE_HOST" << EOF
cd ~/hackcanada
docker build -t $IMAGE_NAME .
echo "Image built: $IMAGE_NAME"
EOF

# Step 5: Start tmux session and run container
echo "[5/6] Starting training container in tmux..."
ssh "$REMOTE_HOST" << EOF
# Kill existing session if exists
tmux kill-session -t training 2>/dev/null || true

# Start new tmux session
tmux new-session -d -s training "docker run --gpus all --runtime nvidia \\
    -v \$(pwd)/hackcanada/data:/data \\
    -v \$(pwd)/hackcanada/models:/models \\
    -v \$(pwd)/hackcanada/training.log:/workspace/training.log \\
    --name $CONTAINER_NAME \\
    $IMAGE_NAME \\
    python3 src/train.py --epochs 10 --batch-size 32"

echo "Container started in tmux session 'training'"
EOF

# Step 6: Verify deployment
echo "[6/6] Verifying deployment..."
ssh "$REMOTE_HOST" << 'EOF'
echo "=== Container Status ==="
docker ps | grep waste-classifier || echo "Container starting..."

echo "=== Tmux Session ==="
tmux list-sessions 2>/dev/null || echo "No tmux sessions"

echo "=== GPU Available ==="
nvidia-smi --query-gpu=name,memory.total --format=csv

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "To monitor training:"
echo "  ssh $REMOTE_HOST 'docker logs -f $CONTAINER_NAME'"
echo "  ssh $REMOTE_HOST 'tmux attach -t training'"
echo ""
echo "To check logs:"
echo "  tail -f ~/hackcanada/training.log"
EOF

echo "Done! ML Engine is ready for transport."
