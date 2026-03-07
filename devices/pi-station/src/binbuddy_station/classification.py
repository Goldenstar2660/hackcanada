from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ClassificationResult:
    predicted_item: str
    confidence: float
    llm_fallback_used: bool = False


@dataclass(slots=True)
class ClassificationRequest:
    image_source: str
    confidence_threshold: float


class ClassificationPipeline:
    """Owns local inference and optional fallback selection."""

    def classify(self, request: ClassificationRequest) -> ClassificationResult:
        predicted_item = self._infer_local_item(request.image_source)
        confidence = 0.92
        llm_fallback_used = confidence < request.confidence_threshold
        if llm_fallback_used:
            predicted_item = self._infer_with_fallback(request.image_source)
            confidence = 0.75

        return ClassificationResult(
            predicted_item=predicted_item,
            confidence=confidence,
            llm_fallback_used=llm_fallback_used,
        )

    def _infer_local_item(self, image_source: str) -> str:
        del image_source
        return "unknown-item"

    def _infer_with_fallback(self, image_source: str) -> str:
        del image_source
        return "fallback-item"
