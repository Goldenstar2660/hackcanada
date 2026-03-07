#!/usr/bin/env python3
"""ML Training Engine for Waste Sorting Station."""
import argparse
import logging
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torch.optim import AdamW
from torchvision import datasets, transforms
from tqdm import tqdm

DEFAULT_CLASSES = [
    "plastic bottle", "aluminum can", "paper", "cardboard",
    "pizza box", "paper cup", "coffee cup", "plastic wrapper",
    "food waste", "glass bottle", "styrofoam", "batteries"
]

class DummyDataset(Dataset):
    """Mock dataset for dry-run and testing."""
    def __init__(self, num_samples=100, img_size=224, num_classes=12):
        self.num_samples = num_samples
        self.img_size = img_size
        self.num_classes = num_classes
    
    def __len__(self):
        return self.num_samples
    
    def __getitem__(self, idx):
        img = torch.randn(3, self.img_size, self.img_size)
        label = torch.randint(0, self.num_classes, (1,)).item()
        return img, label

class WasteClassifier(nn.Module):
    """Simple CNN classifier for waste items."""
    def __init__(self, num_classes=12):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(128, 256, 3, padding=1), nn.ReLU(), nn.AdaptiveAvgPool2d(1)
        )
        self.classifier = nn.Linear(256, num_classes)
    
    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)


def build_imagefolder_datasets(data_path: Path):
    """Load ImageFolder datasets from train/val directories."""
    train_dir = data_path / "train"
    val_dir = data_path / "val"

    if not train_dir.exists() or not val_dir.exists():
        raise FileNotFoundError(f"Expected ImageFolder at {train_dir} and {val_dir}")

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ])

    train_dataset = datasets.ImageFolder(root=str(train_dir), transform=transform)
    val_dataset = datasets.ImageFolder(root=str(val_dir), transform=transform)

    if train_dataset.classes != val_dataset.classes:
        raise ValueError("Train/val classes do not match")

    return train_dataset, val_dataset, train_dataset.classes

def setup_logging(log_file: str = "training.log"):
    """Configure logging to file and console."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def train_epoch(model, dataloader, criterion, optimizer, device, logger):
    """Train for one epoch."""
    model.train()
    total_loss = 0
    correct = 0
    total = 0
    
    pbar = tqdm(dataloader, desc="Training")
    for batch_idx, (images, labels) in enumerate(pbar):
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        if batch_idx % 10 == 0:
            pbar.set_postfix({"loss": f"{loss.item():.4f}", "acc": f"{100*correct/total:.1f}%"})
    
    return total_loss / len(dataloader), 100. * correct / total

def validate(model, dataloader, criterion, device, logger):
    """Validate model."""
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
    
    return total_loss / len(dataloader), 100. * correct / total

def main():
    parser = argparse.ArgumentParser(description="Train waste classifier")
    parser.add_argument("--dry-run", action="store_true", help="Test architecture without loading data")
    parser.add_argument("--epochs", type=int, default=1, help="Number of epochs (ignored in dry-run)")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--data-path", type=str, default="data", help="Path to dataset")
    parser.add_argument("--models-dir", type=str, default="models", help="Checkpoint output directory")
    parser.add_argument("--log-file", type=str, default="training.log", help="Log file path")
    args = parser.parse_args()
    
    logger = setup_logging(args.log_file)
    logger.info(f"Starting training with args: {args}")
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    class_names = DEFAULT_CLASSES
    train_dataset = None
    val_dataset = None

    if not args.dry_run:
        data_path = Path(args.data_path)
        train_dir = data_path / "train"
        val_dir = data_path / "val"

        if train_dir.exists() and val_dir.exists():
            logger.info(f"Loading ImageFolder dataset from {data_path}")
            train_dataset, val_dataset, class_names = build_imagefolder_datasets(data_path)
        else:
            logger.warning(f"No ImageFolder dataset at {data_path} (train/val), using dummy dataset")
            train_dataset = DummyDataset(num_samples=100, num_classes=len(DEFAULT_CLASSES))
            val_dataset = DummyDataset(num_samples=50, num_classes=len(DEFAULT_CLASSES))

    # Create model
    model = WasteClassifier(num_classes=len(class_names)).to(device)
    logger.info(f"Model created: {sum(p.numel() for p in model.parameters())} parameters")
    logger.info(f"Class count: {len(class_names)}")
    
    # Dry-run mode - just test architecture
    if args.dry_run:
        logger.info("DRY-RUN MODE: Testing model architecture with dummy input")
        dummy_input = torch.randn(1, 3, 224, 224).to(device)
        output = model(dummy_input)
        logger.info(f"Dry-run successful: input shape {dummy_input.shape} -> output shape {output.shape}")
        logger.info("Model architecture verified. Exiting dry-run.")
        
        # Save dummy checkpoint
        models_dir = Path(args.models_dir)
        models_dir.mkdir(parents=True, exist_ok=True)
        torch.save(model.state_dict(), models_dir / "dry_run_checkpoint.pt")
        logger.info(f"Dry-run checkpoint saved to {models_dir / 'dry_run_checkpoint.pt'}")
        return
    
    # Normal training mode
    logger.info(f"Training with dataset path: {args.data_path}")

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    
    logger.info(f"Train batches: {len(train_loader)}, Val batches: {len(val_loader)}")
    
    criterion = nn.CrossEntropyLoss()
    optimizer = AdamW(model.parameters(), lr=args.lr)
    
    best_val_acc = 0
    models_dir = Path(args.models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)
    
    for epoch in range(args.epochs):
        logger.info(f"\n=== Epoch {epoch+1}/{args.epochs} ===")
        
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device, logger)
        logger.info(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
        
        val_loss, val_acc = validate(model, val_loader, criterion, device, logger)
        logger.info(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%")
        
        # Save checkpoint
        checkpoint_path = models_dir / f"checkpoint_epoch_{epoch+1}.pt"
        torch.save({
            "epoch": epoch + 1,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "train_acc": train_acc,
            "val_acc": val_acc,
            "classes": class_names,
        }, checkpoint_path)
        logger.info(f"Checkpoint saved to {checkpoint_path}")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_path = models_dir / "best_model.pt"
            torch.save({"model_state_dict": model.state_dict(), "classes": class_names}, best_path)
            logger.info(f"New best model saved to {best_path}")
    
    logger.info(f"\nTraining complete. Best val accuracy: {best_val_acc:.2f}%")
    logger.info(f"Checkpoints saved to: {models_dir.absolute()}")

if __name__ == "__main__":
    main()
