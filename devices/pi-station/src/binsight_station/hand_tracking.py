from __future__ import annotations

from collections import deque
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import numpy as np
from PIL import Image

from .camera_capture import ImageSourceProvider
from .session import SessionSnapshot


@dataclass(slots=True, frozen=True)
class HandTrackingObservation:
    zone: str | None
    hand_present: bool


class HandTrackingInput(Protocol):
    def observe(self, *, snapshot: SessionSnapshot) -> HandTrackingObservation | None: ...

    def close(self) -> None: ...


@dataclass(slots=True, frozen=True)
class HandLandmarkObservation:
    hand_present: bool
    zone: str | None = None
    normalized_x: float | None = None


class HandLandmarkDetector(Protocol):
    def detect(self, image_source: str) -> HandLandmarkObservation: ...

    def close(self) -> None: ...


class DeterministicHandTracker:
    def __init__(self, zones: Sequence[str] = ("left",)) -> None:
        resolved_zones = tuple(zone.strip().lower() for zone in zones if zone.strip())
        if not resolved_zones:
            raise ValueError("deterministic hand tracker requires at least one zone")
        for zone in resolved_zones:
            if zone not in {"left", "middle", "right"}:
                raise ValueError(f"unsupported deterministic hand-tracking zone: {zone}")

        self._zones = deque(resolved_zones)
        self._active_zone: str | None = None

    def observe(self, *, snapshot: SessionSnapshot) -> HandTrackingObservation | None:
        if not snapshot.hand_present:
            self._active_zone = self._zones[0]
            if len(self._zones) > 1:
                self._zones.rotate(-1)
            return HandTrackingObservation(zone=self._active_zone, hand_present=True)

        if self._active_zone is None:
            return None

        self._active_zone = None
        return HandTrackingObservation(zone=None, hand_present=False)

    def close(self) -> None:
        return None


class MediaPipeHandsTracker:
    def __init__(
        self,
        *,
        image_source_provider: ImageSourceProvider,
        detector: HandLandmarkDetector | None = None,
        absence_frame_threshold: int = 2,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        max_num_hands: int = 1,
    ) -> None:
        self._image_source_provider = image_source_provider
        self._detector = detector or MediaPipeHandLandmarkDetector(
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            max_num_hands=max_num_hands,
        )
        self._absence_frame_threshold = max(1, absence_frame_threshold)
        self._consecutive_absent_frames = 0
        self._last_visible_zone: str | None = None

    def observe(self, *, snapshot: SessionSnapshot) -> HandTrackingObservation | None:
        captured_image = self._image_source_provider.capture_image_source()
        try:
            detection = self._detector.detect(captured_image.image_source)
        finally:
            captured_image.cleanup()

        if detection.hand_present:
            self._consecutive_absent_frames = 0
            resolved_zone = _require_hand_zone(detection.zone)
            self._last_visible_zone = resolved_zone
            return HandTrackingObservation(zone=resolved_zone, hand_present=True)

        if not snapshot.hand_present:
            self._consecutive_absent_frames = 0
            self._last_visible_zone = None
            return None

        self._consecutive_absent_frames += 1
        if self._consecutive_absent_frames < self._absence_frame_threshold:
            return HandTrackingObservation(
                zone=self._last_visible_zone or snapshot.latest_hand_zone,
                hand_present=True,
            )

        self._consecutive_absent_frames = 0
        self._last_visible_zone = None
        return HandTrackingObservation(zone=None, hand_present=False)

    def close(self) -> None:
        self._detector.close()


class MediaPipeHandLandmarkDetector:
    def __init__(
        self,
        *,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        max_num_hands: int = 1,
    ) -> None:
        self._min_detection_confidence = min_detection_confidence
        self._min_tracking_confidence = min_tracking_confidence
        self._max_num_hands = max_num_hands
        self._hands: Any | None = None

    def detect(self, image_source: str) -> HandLandmarkObservation:
        hands = self._get_hands_runtime()
        with Image.open(_resolve_image_path(image_source)) as image:
            rgb_pixels = np.asarray(image.convert("RGB"))

        result = hands.process(rgb_pixels)
        if not result.multi_hand_landmarks:
            return HandLandmarkObservation(hand_present=False)

        primary_landmarks = result.multi_hand_landmarks[0]
        xs = [float(landmark.x) for landmark in primary_landmarks.landmark]
        normalized_x = min(max(sum(xs) / len(xs), 0.0), 1.0)
        return HandLandmarkObservation(
            hand_present=True,
            zone=_zone_for_normalized_x(normalized_x),
            normalized_x=normalized_x,
        )

    def close(self) -> None:
        if self._hands is None:
            return
        self._hands.close()
        self._hands = None

    def _get_hands_runtime(self) -> Any:
        if self._hands is not None:
            return self._hands

        try:
            import mediapipe as mp  # type: ignore[import-not-found]
        except ImportError as error:
            raise RuntimeError(
                "MediaPipe Hands is not installed. Install the configured mediapipe dependency first."
            ) from error

        self._hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=self._max_num_hands,
            min_detection_confidence=self._min_detection_confidence,
            min_tracking_confidence=self._min_tracking_confidence,
        )
        return self._hands


def _resolve_image_path(image_source: str) -> Path:
    if image_source.startswith("file://"):
        resolved = Path(image_source.removeprefix("file://"))
    else:
        resolved = Path(image_source)
    if not resolved.exists():
        raise FileNotFoundError(f"hand-tracking image source was not found: {resolved}")
    return resolved


def _zone_for_normalized_x(normalized_x: float) -> str:
    if normalized_x < (1.0 / 3.0):
        return "left"
    if normalized_x < (2.0 / 3.0):
        return "middle"
    return "right"


def _require_hand_zone(zone: str | None) -> str:
    if zone not in {"left", "middle", "right"}:
        raise ValueError(f"hand tracker returned unsupported zone: {zone}")
    return zone