from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


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


class ClassificationPipeline:
    """Owns local inference and optional fallback selection."""

    def classify(self, request: ClassificationRequest) -> ClassificationResult:
        predicted_item, source = self._infer_local_item(request.image_source)
        confidence = 0.99 if source is ClassificationSource.DETERMINISTIC_DEMO else 0.92
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

    def _infer_local_item(self, image_source: str) -> tuple[str, ClassificationSource]:
        deterministic_item = _deterministic_demo_item(image_source)
        if deterministic_item is not None:
            return deterministic_item, ClassificationSource.DETERMINISTIC_DEMO

        del image_source
        return "unknown-item", ClassificationSource.LOCAL

    def _infer_with_fallback(self, image_source: str) -> str:
        del image_source
        return "fallback-item"


def _deterministic_demo_item(image_source: str) -> str | None:
    prefix = "demo://"
    if not image_source.startswith(prefix):
        return None

    item_token = image_source.removeprefix(prefix).strip().strip("/")
    if not item_token:
        return None

    return item_token.replace("_", "-").lower()
