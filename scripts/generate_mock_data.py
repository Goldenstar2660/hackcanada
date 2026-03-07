#!/usr/bin/env python3
"""Generate mock waste dataset for local testing (~5MB)."""
import os
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

CLASSES = [
    "plastic bottle", "aluminum can", "paper", "cardboard",
    "pizza box", "paper cup", "coffee cup", "plastic wrapper",
    "food waste", "glass bottle", "styrofoam", "batteries"
]

CLASS_COLORS = {
    "plastic bottle": (0, 128, 255),
    "aluminum can": (192, 192, 192),
    "paper": (255, 255, 240),
    "cardboard": (139, 69, 19),
    "pizza box": (255, 165, 0),
    "paper cup": (245, 245, 220),
    "coffee cup": (210, 180, 140),
    "plastic wrapper": (173, 216, 230),
    "food waste": (34, 139, 34),
    "glass bottle": (0, 191, 255),
    "styrofoam": (240, 240, 240),
    "batteries": (128, 128, 0)
}

def generate_mock_image(class_name: str, idx: int, size: tuple = (224, 224)) -> Image.Image:
    """Generate a simple colored rectangle as mock item image."""
    color = CLASS_COLORS.get(class_name, (128, 128, 128))
    img = Image.new('RGB', size, color)
    draw = ImageDraw.Draw(img)
    
    # Add some variation
    noise = np.random.randint(-20, 20, (*size[::-1], 3), dtype=np.int16)
    img_array = np.array(img, dtype=np.int16)
    img_array = np.clip(img_array + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(img_array)
    
    # Add bounding box-like pattern
    margin = 20
    draw.rectangle([margin, margin, size[0]-margin, size[1]-margin], outline=(255,255,255), width=3)
    
    return img

def generate_yolo_annotation(bbox: tuple = (40, 40, 184, 184)) -> str:
    """Generate YOLO format annotation (class_idx, x_center, y_center, width, height) normalized."""
    x1, y1, x2, y2 = bbox
    x_center = ((x1 + x2) / 2) / 224
    y_center = ((y1 + y2) / 2) / 224
    width = (x2 - x1) / 224
    height = (y2 - y1) / 224
    return f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n"

def main():
    data_dir = Path("data")
    images_dir = data_dir / "images" / "train"
    labels_dir = data_dir / "labels" / "train"
    
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)
    
    # Target ~5MB: ~50 images at ~100KB each
    num_images = 48
    images_per_class = num_images // len(CLASSES)
    
    print(f"Generating {num_images} mock images (~5MB)...")
    
    for class_idx, class_name in enumerate(CLASSES):
        for i in range(images_per_class):
            img = generate_mock_image(class_name, i)
            
            img_filename = f"{class_name.replace(' ', '_')}_{i:03d}.jpg"
            img_path = images_dir / img_filename
            img.save(img_path, quality=85, optimize=True)
            
            label_filename = img_filename.replace(".jpg", ".txt")
            label_path = labels_dir / label_filename
            with open(label_path, 'w') as f:
                f.write(generate_yolo_annotation())
    
    # Create dataset.yaml for YOLO
    dataset_yaml = {
        "path": str(data_dir.absolute()),
        "train": "images/train",
        "val": "images/train",
        "names": {i: name for i, name in enumerate(CLASSES)}
    }
    
    with open(data_dir / "dataset.yaml", 'w') as f:
        f.write(f"path: {data_dir.absolute()}\n")
        f.write("train: images/train\n")
        f.write("val: images/train\n")
        f.write("names:\n")
        for i, name in enumerate(CLASSES):
            f.write(f"  {i}: {name}\n")
    
    # Create metadata.json
    metadata = {
        "classes": CLASSES,
        "num_images": num_images,
        "classes_per_image": 1,
        "format": "yolo",
        "generated_for": "local_testing"
    }
    
    with open(data_dir / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Report size
    total_size = sum(f.stat().st_size for f in images_dir.rglob("*") if f.is_file())
    print(f"Dataset generated: {num_images} images, {total_size / 1024 / 1024:.2f} MB")
    print(f"Location: {data_dir.absolute()}")
    print(f"Classes: {', '.join(CLASSES)}")

if __name__ == "__main__":
    main()
