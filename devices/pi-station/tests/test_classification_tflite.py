from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
import pytest

from binsight_station.classification import ClassificationPipeline, ClassificationRequest
from binsight_station.camera_capture import CapturedImageSource
from binsight_station.esp_client import EspClient, MemoryEspTransport
from binsight_station.main import StationRuntime, load_runtime_settings
from binsight_station.publishers import PublicationAdapter
from binsight_station.session import SessionPhase


class FakeInterpreter:
    def __init__(
        self,
        *,
        output_tensor: np.ndarray,
        input_detail: dict[str, object],
        output_detail: dict[str, object],
        model_path: str,
        num_threads: int,
    ) -> None:
        self.output_tensor = output_tensor
        self.input_detail = input_detail
        self.output_detail = output_detail
        self.model_path = model_path
        self.num_threads = num_threads
        self.input_tensor = None

    def allocate_tensors(self) -> None:
        return None

    def get_input_details(self) -> list[dict[str, object]]:
        return [self.input_detail]

    def get_output_details(self) -> list[dict[str, object]]:
        return [self.output_detail]

    def set_tensor(self, index: int, value: np.ndarray) -> None:
        assert index == self.input_detail["index"]
        self.input_tensor = value

    def invoke(self) -> None:
        return None

    def get_tensor(self, index: int) -> np.ndarray:
        assert index == self.output_detail["index"]
        return self.output_tensor


class StaticImageSourceProvider:
    def __init__(self, image_source: str) -> None:
        self.image_source = image_source
        self.calls = 0

    def capture_image_source(self) -> CapturedImageSource:
        self.calls += 1
        return CapturedImageSource(self.image_source)


def _write_model_assets(
    tmp_path: Path,
    *,
    manifest: dict[str, object] | None = None,
    labels: tuple[str, ...] = ("plastic bottle", "banana peel", "apple core"),
    aliases: dict[str, str] | None = None,
) -> Path:
    model_dir = tmp_path / "item_classifier"
    model_dir.mkdir()
    (model_dir / "model.tflite").write_bytes(b"fake-model")
    (model_dir / "manifest.json").write_text(
        json.dumps(
            {
                "labelsFile": "labels.txt",
                "aliasesFile": "aliases.json",
                "numThreads": 2,
                **(manifest or {}),
            }
        ),
        encoding="utf-8",
    )
    (model_dir / "labels.txt").write_text("\n".join(labels), encoding="utf-8")
    (model_dir / "aliases.json").write_text(
        json.dumps(aliases or {"plastic bottle": "plastic-bottle", "banana peel": "banana-peel", "apple core": "apple-core"}),
        encoding="utf-8",
    )
    return model_dir


def _write_image(path: Path, *, color: tuple[int, int, int]) -> Path:
    Image.new("RGB", (4, 4), color=color).save(path)
    return path


def test_classification_pipeline_supports_demo_sources_without_model_assets() -> None:
    pipeline = ClassificationPipeline()

    result = pipeline.classify(
        ClassificationRequest(image_source="demo://banana-peel", confidence_threshold=0.65)
    )

    assert result.predicted_item == "banana-peel"
    assert result.confidence == 0.99
    assert result.llm_fallback_used is False


def test_classification_pipeline_loads_manifest_aliases_and_uint8_input(tmp_path: Path) -> None:
    model_dir = _write_model_assets(tmp_path)
    image_path = _write_image(tmp_path / "frame.jpg", color=(200, 100, 50))
    interpreter_holder: dict[str, FakeInterpreter] = {}

    def interpreter_factory(model_path: Path, num_threads: int) -> FakeInterpreter:
        interpreter = FakeInterpreter(
            output_tensor=np.array([[0.05, 0.9, 0.05]], dtype=np.float32),
            input_detail={
                "index": 0,
                "shape": np.array([1, 2, 2, 3]),
                "dtype": np.uint8,
                "quantization_parameters": {"scales": np.array([1.0]), "zero_points": np.array([0])},
                "quantization": (1.0, 0),
            },
            output_detail={
                "index": 1,
                "shape": np.array([1, 3]),
                "dtype": np.float32,
                "quantization_parameters": {"scales": np.array([]), "zero_points": np.array([])},
                "quantization": (0.0, 0),
            },
            model_path=str(model_path),
            num_threads=num_threads,
        )
        interpreter_holder["interpreter"] = interpreter
        return interpreter

    pipeline = ClassificationPipeline(model_dir=model_dir, interpreter_factory=interpreter_factory)

    result = pipeline.classify(
        ClassificationRequest(image_source=str(image_path), confidence_threshold=0.65)
    )

    assert result.predicted_item == "banana-peel"
    assert result.confidence == pytest.approx(0.9)
    assert result.llm_fallback_used is False
    assert interpreter_holder["interpreter"].num_threads == 2
    assert interpreter_holder["interpreter"].input_tensor is not None
    assert interpreter_holder["interpreter"].input_tensor.shape == (1, 2, 2, 3)
    assert interpreter_holder["interpreter"].input_tensor.dtype == np.uint8


def test_classification_pipeline_quantizes_int8_inputs_from_manifest_normalization(tmp_path: Path) -> None:
    model_dir = _write_model_assets(
        tmp_path,
        manifest={
            "normalizeMean": [127.5],
            "normalizeStd": [127.5],
        },
    )
    image_path = _write_image(tmp_path / "white.jpg", color=(255, 255, 255))
    interpreter_holder: dict[str, FakeInterpreter] = {}

    def interpreter_factory(model_path: Path, num_threads: int) -> FakeInterpreter:
        del model_path, num_threads
        interpreter = FakeInterpreter(
            output_tensor=np.array([[0.8, 0.1, 0.1]], dtype=np.float32),
            input_detail={
                "index": 0,
                "shape": np.array([1, 1, 1, 3]),
                "dtype": np.int8,
                "quantization_parameters": {"scales": np.array([0.5]), "zero_points": np.array([0])},
                "quantization": (0.5, 0),
            },
            output_detail={
                "index": 1,
                "shape": np.array([1, 3]),
                "dtype": np.float32,
                "quantization_parameters": {"scales": np.array([]), "zero_points": np.array([])},
                "quantization": (0.0, 0),
            },
            model_path="unused",
            num_threads=1,
        )
        interpreter_holder["interpreter"] = interpreter
        return interpreter

    pipeline = ClassificationPipeline(model_dir=model_dir, interpreter_factory=interpreter_factory)
    pipeline.classify(ClassificationRequest(image_source=str(image_path), confidence_threshold=0.65))

    assert interpreter_holder["interpreter"].input_tensor is not None
    assert interpreter_holder["interpreter"].input_tensor.dtype == np.int8
    assert interpreter_holder["interpreter"].input_tensor.tolist() == [[[[2, 2, 2]]]]


def test_classification_pipeline_normalizes_nchw_inputs_from_manifest(tmp_path: Path) -> None:
    model_dir = _write_model_assets(
        tmp_path,
        manifest={
            "inputLayout": "nchw",
            "normalizeMean": [127.5],
            "normalizeStd": [127.5],
        },
    )
    image_path = _write_image(tmp_path / "white-nchw.jpg", color=(255, 255, 255))
    interpreter_holder: dict[str, FakeInterpreter] = {}

    def interpreter_factory(model_path: Path, num_threads: int) -> FakeInterpreter:
        del model_path, num_threads
        interpreter = FakeInterpreter(
            output_tensor=np.array([[0.8, 0.1, 0.1]], dtype=np.float32),
            input_detail={
                "index": 0,
                "shape": np.array([1, 3, 1, 1]),
                "dtype": np.int8,
                "quantization_parameters": {"scales": np.array([0.5]), "zero_points": np.array([0])},
                "quantization": (0.5, 0),
            },
            output_detail={
                "index": 1,
                "shape": np.array([1, 3]),
                "dtype": np.float32,
                "quantization_parameters": {"scales": np.array([]), "zero_points": np.array([])},
                "quantization": (0.0, 0),
            },
            model_path="unused",
            num_threads=1,
        )
        interpreter_holder["interpreter"] = interpreter
        return interpreter

    pipeline = ClassificationPipeline(model_dir=model_dir, interpreter_factory=interpreter_factory)
    pipeline.classify(ClassificationRequest(image_source=str(image_path), confidence_threshold=0.65))

    assert interpreter_holder["interpreter"].input_tensor is not None
    assert interpreter_holder["interpreter"].input_tensor.dtype == np.int8
    assert interpreter_holder["interpreter"].input_tensor.tolist() == [[[[2]], [[2]], [[2]]]]


def test_classification_pipeline_uses_rules_threshold_for_low_confidence_fallback(tmp_path: Path) -> None:
    model_dir = _write_model_assets(tmp_path)
    image_path = _write_image(tmp_path / "frame.jpg", color=(25, 25, 25))

    def interpreter_factory(model_path: Path, num_threads: int) -> FakeInterpreter:
        del model_path, num_threads
        return FakeInterpreter(
            output_tensor=np.array([[0.5, 0.3, 0.2]], dtype=np.float32),
            input_detail={
                "index": 0,
                "shape": np.array([1, 2, 2, 3]),
                "dtype": np.uint8,
                "quantization_parameters": {"scales": np.array([1.0]), "zero_points": np.array([0])},
                "quantization": (1.0, 0),
            },
            output_detail={
                "index": 1,
                "shape": np.array([1, 3]),
                "dtype": np.float32,
                "quantization_parameters": {"scales": np.array([]), "zero_points": np.array([])},
                "quantization": (0.0, 0),
            },
            model_path="unused",
            num_threads=1,
        )

    pipeline = ClassificationPipeline(model_dir=model_dir, interpreter_factory=interpreter_factory)

    result = pipeline.classify(
        ClassificationRequest(image_source=str(image_path), confidence_threshold=0.65)
    )

    assert result.predicted_item == "fallback-item"
    assert result.llm_fallback_used is True
    assert result.confidence == 0.75


def test_classification_pipeline_fails_when_required_assets_are_missing(tmp_path: Path) -> None:
    image_path = _write_image(tmp_path / "frame.jpg", color=(10, 10, 10))
    pipeline = ClassificationPipeline(model_dir=tmp_path)

    with pytest.raises(FileNotFoundError):
        pipeline.classify(ClassificationRequest(image_source=str(image_path), confidence_threshold=0.65))


def test_runtime_uses_image_source_provider_when_no_explicit_image_source() -> None:
    transport = MemoryEspTransport()
    provider = StaticImageSourceProvider("demo://apple-core")
    runtime = StationRuntime(
        load_runtime_settings(),
        monotonic_clock=iter([0.0, 0.4, 0.5, 0.6]).__next__,
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=PublicationAdapter("test-project"),
        image_source_provider=provider,
    )

    transport.queue_incoming("presence present=1 zone=off stable=1 seq=1")
    arming_snapshot, _ = runtime.start_session()
    transport.queue_incoming("presence present=1 zone=off stable=1 seq=2")
    waiting_snapshot, _ = runtime.start_session()

    assert arming_snapshot.phase is SessionPhase.PRESENCE_ARMING
    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert waiting_snapshot.predicted_item == "apple-core"
    assert provider.calls == 1