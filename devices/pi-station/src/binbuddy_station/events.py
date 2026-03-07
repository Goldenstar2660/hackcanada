from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from .classification import ClassificationResult
from .session import SessionSnapshot


@dataclass(slots=True)
class DisposalEvent:
    station_id: str
    timestamp: str
    predicted_item: str
    correct_disposal_method: str
    actual_disposal_zone: str
    success: bool
    model_confidence: float
    llm_fallback_used: bool


def create_disposal_event(
    station_id: str,
    snapshot: SessionSnapshot,
    classification: ClassificationResult,
) -> DisposalEvent:
    if snapshot.correct_disposal_method is None or snapshot.actual_disposal_zone is None:
        raise ValueError("session snapshot is incomplete")

    return DisposalEvent(
        station_id=station_id,
        timestamp=datetime.now(tz=timezone.utc).isoformat(),
        predicted_item=classification.predicted_item,
        correct_disposal_method=snapshot.correct_disposal_method,
        actual_disposal_zone=snapshot.actual_disposal_zone,
        success=snapshot.correct_disposal_method == snapshot.actual_disposal_zone,
        model_confidence=classification.confidence,
        llm_fallback_used=classification.llm_fallback_used,
    )
