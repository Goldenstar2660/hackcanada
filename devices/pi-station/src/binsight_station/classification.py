from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
import importlib
import json
import math
from pathlib import Path
import re
from typing import Any, Callable

import numpy as np
from PIL import Image


class ClassificationSource(StrEnum):
    LOCAL = "local"
    DETERMINISTIC_DEMO = "deterministic_demo"
    LLM_FALLBACK = "llm_fallback"


@dataclass(slots=True)
class ClassificationResult:
    predicted_item: str
    confidence: float
    llm_fallback_used: bool = False
    source: ClassificationSource = ClassificationSource.LOCAL


@dataclass(slots=True)
class ClassificationRequest:
    image_source: str
    confidence_threshold: float


@dataclass(slots=True, frozen=True)
class ModelManifest:
    labels_file: str = "labels.txt"
    aliases_file: str | None = "aliases.json"
    input_layout: str = "auto"
    color_space: str = "RGB"
    resize_method: str = "bilinear"
    normalize_mean: tuple[float, ...] | None = None
    normalize_std: tuple[float, ...] | None = None
    output_activation: str = "auto"
    num_threads: int = 4


@dataclass(slots=True, frozen=True)
class ModelAssets:
    model_dir: Path
    model_path: Path
    manifest_path: Path
    labels_path: Path
    aliases_path: Path | None
    manifest: ModelManifest


@dataclass(slots=True, frozen=True)
class LocalPrediction:
    predicted_item: str
    confidence: float
    source: ClassificationSource


InterpreterFactory = Callable[[Path, int], Any]

_COMMON_MODEL_FILENAMES = (
    "model.tflite",
    "model_unquant.tflite",
    "model_quant.tflite",
)


class ClassificationPipeline:
    """Owns local inference and optional fallback selection."""

    def __init__(
        self,
        *,
        model_dir: str | Path | None = None,
        interpreter_factory: InterpreterFactory | None = None,
    ) -> None:
        self._model_dir = Path(model_dir).resolve() if model_dir is not None else None
        self._interpreter_factory = _default_interpreter_factory if interpreter_factory is None else interpreter_factory
        self._runtime: _TFLiteRuntime | None = None

    def classify(self, request: ClassificationRequest) -> ClassificationResult:
        local_prediction = self._infer_local_item(request.image_source)
        predicted_item = local_prediction.predicted_item
        confidence = local_prediction.confidence
        source = local_prediction.source
        llm_fallback_used = confidence < request.confidence_threshold
        if llm_fallback_used:
            predicted_item = self._infer_with_fallback(request.image_source)
            confidence = 0.75
            source = ClassificationSource.LLM_FALLBACK

        return ClassificationResult(
            predicted_item=predicted_item,
            confidence=confidence,
            llm_fallback_used=llm_fallback_used,
            source=source,
        )

    def _infer_local_item(self, image_source: str) -> LocalPrediction:
        deterministic_item = _deterministic_demo_item(image_source)
        if deterministic_item is not None:
            return LocalPrediction(
                predicted_item=deterministic_item,
                confidence=0.99,
                source=ClassificationSource.DETERMINISTIC_DEMO,
            )

        runtime = self._get_runtime()
        return runtime.predict(image_source)

    def _infer_with_fallback(self, image_source: str) -> str:
        del image_source
        return "fallback-item"

    def _get_runtime(self) -> _TFLiteRuntime:
        if self._runtime is None:
            if self._model_dir is None:
                raise FileNotFoundError("no TensorFlow Lite model directory is configured")
            assets = _load_model_assets(self._model_dir)
            self._runtime = _TFLiteRuntime(assets, interpreter_factory=self._interpreter_factory)
        return self._runtime


class _TFLiteRuntime:
    def __init__(self, assets: ModelAssets, *, interpreter_factory: InterpreterFactory) -> None:
        self._assets = assets
        self._labels = _load_labels(assets.labels_path)
        self._aliases = _load_aliases(assets.aliases_path)
        self._interpreter = interpreter_factory(assets.model_path, assets.manifest.num_threads)
        self._interpreter.allocate_tensors()
        self._input_detail = self._single_tensor_detail(self._interpreter.get_input_details(), "input")
        self._output_detail = self._single_tensor_detail(self._interpreter.get_output_details(), "output")

    def predict(self, image_source: str) -> LocalPrediction:
        input_tensor = _build_input_tensor(image_source, self._input_detail, self._assets.manifest)
        self._interpreter.set_tensor(self._input_detail["index"], input_tensor)
        self._interpreter.invoke()
        output_tensor = self._interpreter.get_tensor(self._output_detail["index"])
        confidence_scores = _extract_confidence_scores(
            output_tensor,
            self._output_detail,
            self._assets.manifest.output_activation,
        )
        top_index = int(np.argmax(confidence_scores))
        if top_index >= len(self._labels):
            raise ValueError(
                f"model output index {top_index} is out of range for {len(self._labels)} labels"
            )

        raw_label = self._labels[top_index]
        predicted_item = self._aliases.get(raw_label) or self._aliases.get(_normalize_label(raw_label)) or _normalize_label(raw_label)
        return LocalPrediction(
            predicted_item=predicted_item,
            confidence=float(confidence_scores[top_index]),
            source=ClassificationSource.LOCAL,
        )

    @staticmethod
    def _single_tensor_detail(details: list[dict[str, Any]], label: str) -> dict[str, Any]:
        if len(details) != 1:
            raise ValueError(f"expected exactly one {label} tensor, found {len(details)}")
        return details[0]


def _load_model_assets(model_dir: Path) -> ModelAssets:
    manifest_path = model_dir / "manifest.json"
    has_manifest = manifest_path.exists()
    manifest = _load_manifest(manifest_path) if has_manifest else ModelManifest()
    model_path = _resolve_model_path(model_dir)
    labels_path = model_dir / manifest.labels_file
    if not labels_path.exists():
        raise FileNotFoundError(f"model labels were not found at {labels_path}")
    aliases_path = _resolve_aliases_path(model_dir, manifest, has_manifest=has_manifest)

    return ModelAssets(
        model_dir=model_dir,
        model_path=model_path,
        manifest_path=manifest_path,
        labels_path=labels_path,
        aliases_path=aliases_path,
        manifest=manifest,
    )


def _resolve_model_path(model_dir: Path) -> Path:
    for filename in _COMMON_MODEL_FILENAMES:
        candidate = model_dir / filename
        if candidate.exists():
            return candidate

    tried_filenames = ", ".join(_COMMON_MODEL_FILENAMES)
    raise FileNotFoundError(
        f"TensorFlow Lite model was not found in {model_dir}. Tried: {tried_filenames}"
    )


def _resolve_aliases_path(
    model_dir: Path,
    manifest: ModelManifest,
    *,
    has_manifest: bool,
) -> Path | None:
    if manifest.aliases_file is None:
        return None

    aliases_path = model_dir / manifest.aliases_file
    if aliases_path.exists():
        return aliases_path
    if has_manifest:
        raise FileNotFoundError(f"model aliases were not found at {aliases_path}")
    return None


def _load_manifest(manifest_path: Path) -> ModelManifest:
    document = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(document, dict):
        raise ValueError(f"invalid model manifest at {manifest_path}")

    normalize_mean = _optional_numeric_sequence(document.get("normalizeMean"), "normalizeMean")
    normalize_std = _optional_numeric_sequence(document.get("normalizeStd"), "normalizeStd")
    if (normalize_mean is None) != (normalize_std is None):
        raise ValueError("model manifest must define both normalizeMean and normalizeStd together")

    return ModelManifest(
        labels_file=str(document.get("labelsFile", "labels.txt")).strip() or "labels.txt",
        aliases_file=_optional_manifest_file(document.get("aliasesFile"), default="aliases.json"),
        input_layout=_validate_choice(document.get("inputLayout", "auto"), {"auto", "nhwc", "nchw"}, "inputLayout"),
        color_space=_validate_choice(document.get("colorSpace", "RGB"), {"RGB", "L"}, "colorSpace"),
        resize_method=_validate_choice(
            document.get("resizeMethod", "bilinear"),
            {"nearest", "bilinear", "bicubic", "lanczos"},
            "resizeMethod",
        ).lower(),
        normalize_mean=normalize_mean,
        normalize_std=normalize_std,
        output_activation=_validate_choice(document.get("outputActivation", "auto"), {"auto", "identity", "softmax"}, "outputActivation"),
        num_threads=max(1, int(document.get("numThreads", 4))),
    )


def _optional_manifest_file(value: object, *, default: str) -> str | None:
    if value is None:
        return default
    text = str(value).strip()
    if not text:
        return None
    return text


def _optional_numeric_sequence(value: object, label: str) -> tuple[float, ...] | None:
    if value is None:
        return None
    if not isinstance(value, list) or not value:
        raise ValueError(f"{label} must be a non-empty numeric array")
    return tuple(float(entry) for entry in value)


def _validate_choice(value: object, allowed: set[str], label: str) -> str:
    resolved = str(value).strip()
    if resolved not in allowed:
        raise ValueError(f"{label} must be one of {sorted(allowed)}")
    return resolved


def _load_labels(labels_path: Path) -> tuple[str, ...]:
    labels: list[str] = []
    for raw_line in labels_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if re.match(r"^\d+\s+", line):
            _, line = line.split(maxsplit=1)
        labels.append(line)
    if not labels:
        raise ValueError(f"labels file {labels_path} does not contain any labels")
    return tuple(labels)


def _load_aliases(aliases_path: Path | None) -> dict[str, str]:
    if aliases_path is None:
        return {}
    document = json.loads(aliases_path.read_text(encoding="utf-8"))
    if not isinstance(document, dict):
        raise ValueError(f"invalid aliases document at {aliases_path}")
    return {str(key): _normalize_label(str(value)) for key, value in document.items()}


def _build_input_tensor(
    image_source: str,
    input_detail: dict[str, Any],
    manifest: ModelManifest,
) -> np.ndarray:
    image_path = _resolve_image_path(image_source)
    tensor_shape = tuple(int(value) for value in input_detail["shape"])
    layout = _resolve_input_layout(tensor_shape, manifest.input_layout)
    height, width, channels = _resolve_image_dimensions(tensor_shape, layout)
    resample = _PIL_RESAMPLE_BY_NAME[manifest.resize_method]

    with Image.open(image_path) as image:
        converted = image.convert(manifest.color_space)
        resized = converted.resize((width, height), resample=resample)
        pixel_array = np.asarray(resized)

    if pixel_array.ndim == 2:
        pixel_array = pixel_array[..., np.newaxis]
    if pixel_array.shape[-1] != channels:
        raise ValueError(
            f"image channel count {pixel_array.shape[-1]} does not match model input channel count {channels}"
        )

    if layout == "nchw":
        pixel_array = np.transpose(pixel_array, (2, 0, 1))

    batched_pixels = np.expand_dims(pixel_array, axis=0)
    return _cast_input_tensor(batched_pixels, input_detail, manifest)


def _resolve_image_path(image_source: str) -> Path:
    if image_source.startswith("file://"):
        resolved = Path(image_source.removeprefix("file://"))
    else:
        resolved = Path(image_source)
    if not resolved.exists():
        raise FileNotFoundError(f"classification image source was not found: {resolved}")
    return resolved


def _resolve_input_layout(tensor_shape: tuple[int, ...], manifest_layout: str) -> str:
    if manifest_layout != "auto":
        return manifest_layout
    if len(tensor_shape) != 4:
        raise ValueError(f"expected a 4D image input tensor, found shape {tensor_shape}")
    if tensor_shape[1] in {1, 3} and tensor_shape[-1] not in {1, 3}:
        return "nchw"
    return "nhwc"


def _resolve_image_dimensions(tensor_shape: tuple[int, ...], layout: str) -> tuple[int, int, int]:
    if len(tensor_shape) != 4:
        raise ValueError(f"expected a 4D image input tensor, found shape {tensor_shape}")
    if layout == "nhwc":
        _, height, width, channels = tensor_shape
        return height, width, channels
    _, channels, height, width = tensor_shape
    return height, width, channels


def _cast_input_tensor(
    pixel_array: np.ndarray,
    input_detail: dict[str, Any],
    manifest: ModelManifest,
) -> np.ndarray:
    dtype = np.dtype(input_detail["dtype"])
    float_pixels = pixel_array.astype(np.float32)
    if manifest.normalize_mean is not None and manifest.normalize_std is not None:
        channel_axis = _channel_axis(float_pixels)
        channel_count = int(float_pixels.shape[channel_axis])
        mean = _broadcast_vector(manifest.normalize_mean, channel_count, channel_axis)
        std = _broadcast_vector(manifest.normalize_std, channel_count, channel_axis)
        float_pixels = (float_pixels - mean) / std

    if np.issubdtype(dtype, np.floating):
        return float_pixels.astype(dtype)

    scale, zero_point = _quantization_parameters(input_detail)
    quantized = np.round(float_pixels / scale + zero_point)
    info = np.iinfo(dtype)
    return np.clip(quantized, info.min, info.max).astype(dtype)


def _broadcast_vector(values: tuple[float, ...], channel_count: int, channel_axis: int) -> np.ndarray:
    if len(values) == 1:
        broadcast_values = values * channel_count
    elif len(values) == channel_count:
        broadcast_values = values
    else:
        raise ValueError(
            f"normalization vector length {len(values)} does not match channel count {channel_count}"
        )
    if channel_axis == 1:
        return np.asarray(broadcast_values, dtype=np.float32).reshape((1, channel_count, 1, 1))
    return np.asarray(broadcast_values, dtype=np.float32).reshape((1, 1, 1, channel_count))


def _channel_axis(pixel_array: np.ndarray) -> int:
    if pixel_array.ndim != 4:
        raise ValueError(f"expected a batched image tensor, found shape {pixel_array.shape}")
    if pixel_array.shape[1] in {1, 3} and pixel_array.shape[-1] not in {1, 3}:
        return 1
    return -1


def _quantization_parameters(detail: dict[str, Any]) -> tuple[float, int]:
    quantization_parameters = detail.get("quantization_parameters") or {}
    scales = quantization_parameters.get("scales") or ()
    zero_points = quantization_parameters.get("zero_points") or ()
    if len(scales) and len(zero_points):
        scale = float(scales[0])
        if scale == 0:
            raise ValueError("tensor quantization scale must be non-zero")
        return scale, int(zero_points[0])

    legacy_scale, legacy_zero_point = detail.get("quantization", (0.0, 0))
    if legacy_scale == 0:
        raise ValueError("tensor is quantized but does not define valid quantization parameters")
    return float(legacy_scale), int(legacy_zero_point)


def _extract_confidence_scores(
    output_tensor: Any,
    output_detail: dict[str, Any],
    output_activation: str,
) -> np.ndarray:
    scores = np.asarray(output_tensor).astype(np.float32).reshape(-1)
    if np.issubdtype(np.dtype(output_detail["dtype"]), np.integer):
        scale, zero_point = _quantization_parameters(output_detail)
        scores = (scores - zero_point) * scale
    if output_activation == "softmax":
        return _softmax(scores)
    if output_activation == "identity":
        return scores
    if _looks_like_probabilities(scores):
        return scores
    return _softmax(scores)


def _looks_like_probabilities(scores: np.ndarray) -> bool:
    if scores.size == 0:
        return False
    if np.any(scores < 0) or np.any(scores > 1):
        return False
    score_sum = float(np.sum(scores))
    return math.isclose(score_sum, 1.0, rel_tol=1e-3, abs_tol=1e-3) or score_sum <= 1.0 + 1e-3


def _softmax(scores: np.ndarray) -> np.ndarray:
    shifted_scores = scores - np.max(scores)
    exponentials = np.exp(shifted_scores)
    return exponentials / np.sum(exponentials)


def _normalize_label(label: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", label.strip().lower())
    normalized = re.sub(r"-+", "-", normalized)
    return normalized.strip("-") or "unknown-item"


def _default_interpreter_factory(model_path: Path, num_threads: int) -> Any:
    import_targets = (
        ("tflite_runtime.interpreter", "Interpreter"),
        ("tensorflow.lite", "Interpreter"),
    )
    for module_name, attribute_name in import_targets:
        try:
            module = importlib.import_module(module_name)
        except ModuleNotFoundError:
            continue
        interpreter = getattr(module, attribute_name, None)
        if interpreter is None:
            continue
        return interpreter(model_path=str(model_path), num_threads=num_threads)

    raise ModuleNotFoundError(
        "TensorFlow Lite interpreter support is unavailable. Install 'tflite-runtime' on the Raspberry Pi "
        "or provide TensorFlow with tensorflow.lite.Interpreter support."
    )


_PIL_RESAMPLE_BY_NAME = {
    "nearest": Image.Resampling.NEAREST,
    "bilinear": Image.Resampling.BILINEAR,
    "bicubic": Image.Resampling.BICUBIC,
    "lanczos": Image.Resampling.LANCZOS,
}


def _deterministic_demo_item(image_source: str) -> str | None:
    prefix = "demo://"
    if not image_source.startswith(prefix):
        return None

    item_token = image_source.removeprefix(prefix).strip().strip("/")
    if not item_token:
        return None

    return item_token.replace("_", "-").lower()
