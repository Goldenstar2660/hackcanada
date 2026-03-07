from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from .rules import RulesPreset
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
    rules_preset: RulesPreset,
) -> DisposalEvent:
    if (
        snapshot.correct_disposal_method is None
        or snapshot.actual_disposal_zone is None
        or snapshot.predicted_item is None
        or snapshot.model_confidence is None
    ):
        raise ValueError("session snapshot is incomplete")

    actual_disposal_method = rules_preset.disposal_method_for_zone(snapshot.actual_disposal_zone)
    if actual_disposal_method is None:
        raise ValueError("actual disposal zone is not mapped by the active rules preset")

    return DisposalEvent(
        station_id=station_id,
        timestamp=datetime.now(tz=timezone.utc).isoformat(),
        predicted_item=snapshot.predicted_item,
        correct_disposal_method=snapshot.correct_disposal_method,
        actual_disposal_zone=snapshot.actual_disposal_zone,
        success=snapshot.correct_disposal_method == actual_disposal_method,
        model_confidence=snapshot.model_confidence,
        llm_fallback_used=snapshot.llm_fallback_used,
    )
