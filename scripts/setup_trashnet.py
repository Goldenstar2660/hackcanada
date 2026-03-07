#!/usr/bin/env python3
"""Download and prepare TrashNet (resized) for classifier training."""
import argparse
import random
import shutil
import zipfile
from pathlib import Path

DATASET_REPO = "garythung/trashnet"
DATASET_FILE = "dataset-resized.zip"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare TrashNet dataset")
    parser.add_argument("--output", type=str, default="data/trashnet", help="Output dataset directory")
    parser.add_argument("--val-ratio", type=float, default=0.2, help="Validation split ratio")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for split")
    parser.add_argument("--force", action="store_true", help="Overwrite output directory if it exists")
    return parser.parse_args()


def copy_split(files, train_dir: Path, val_dir: Path, val_ratio: float, rng: random.Random):
    files = sorted(files)
    rng.shuffle(files)
    val_count = max(1, int(len(files) * val_ratio)) if len(files) > 1 else 0
    val_files = set(files[:val_count])

    for src in files:
        dst_base = val_dir if src in val_files else train_dir
        shutil.copy2(src, dst_base / src.name)


def main() -> None:
    args = parse_args()
    from huggingface_hub import hf_hub_download
    out_dir = Path(args.output)

    if out_dir.exists() and args.force:
        shutil.rmtree(out_dir)

    imagefolder_train = out_dir / "imagefolder" / "train"
    imagefolder_val = out_dir / "imagefolder" / "val"
    raw_dir = out_dir / "raw"
    imagefolder_train.mkdir(parents=True, exist_ok=True)
    imagefolder_val.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading {DATASET_REPO}/{DATASET_FILE} ...")
    zip_path = Path(
        hf_hub_download(
            repo_id=DATASET_REPO,
            filename=DATASET_FILE,
            repo_type="dataset",
        )
    )
    print(f"Downloaded: {zip_path}")

    extracted_root = raw_dir / "dataset-resized"
    if extracted_root.exists():
        shutil.rmtree(extracted_root)

    print("Extracting archive ...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(raw_dir)

    if not extracted_root.exists():
        # Some zips may extract without top-level folder.
        candidates = [p for p in raw_dir.iterdir() if p.is_dir()]
        if len(candidates) == 1:
            extracted_root = candidates[0]

    class_dirs = sorted([p for p in extracted_root.iterdir() if p.is_dir()])
    if not class_dirs:
        raise RuntimeError("No class directories found after extraction.")

    rng = random.Random(args.seed)
    summary = {}

    for class_dir in class_dirs:
        class_name = class_dir.name
        files = [p for p in class_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
        if not files:
            continue

        train_class_dir = imagefolder_train / class_name
        val_class_dir = imagefolder_val / class_name
        train_class_dir.mkdir(parents=True, exist_ok=True)
        val_class_dir.mkdir(parents=True, exist_ok=True)

        copy_split(files, train_class_dir, val_class_dir, args.val_ratio, rng)

        train_count = len(list(train_class_dir.iterdir()))
        val_count = len(list(val_class_dir.iterdir()))
        summary[class_name] = {"train": train_count, "val": val_count}

    classes = sorted(summary.keys())
    print("Prepared ImageFolder dataset:")
    print(f"  Train dir: {imagefolder_train}")
    print(f"  Val dir:   {imagefolder_val}")
    print(f"  Classes ({len(classes)}): {', '.join(classes)}")
    total_train = sum(v["train"] for v in summary.values())
    total_val = sum(v["val"] for v in summary.values())
    print(f"  Samples: train={total_train}, val={total_val}")


if __name__ == "__main__":
    main()
