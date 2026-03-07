from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from .rules import RulesPreset
from .session import SessionSnapshot


DEVICE_PAYLOAD_VERSION = "device.v1"


@dataclass(slots=True)
class DisposalEvent:
    station_id: str
    timestamp: str
    predicted_item: str
    correct_disposal_method: str
    actual_disposal_zone: str
    attempt_result: Literal["success", "failure"]
    model_confidence: float
    llm_fallback_used: bool
    payload_version: str = DEVICE_PAYLOAD_VERSION

    def to_ingress_payload(self) -> dict[str, object]:
        return {
            "payload_version": self.payload_version,
            "station_id": self.station_id,
            "timestamp": self.timestamp,
            "predicted_item": self.predicted_item,
            "correct_disposal_method": self.correct_disposal_method,
            "actual_disposal_zone": self.actual_disposal_zone,
            "success": self.success,
            "model_confidence": self.model_confidence,
            "llm_fallback_used": self.llm_fallback_used,
        }

    @property
    def success(self) -> bool:
        return self.attempt_result == "success"

    def to_payload(self) -> dict[str, object]:
        return {
            "stationId": self.station_id,
            "timestamp": self.timestamp,
            "predictedItem": self.predicted_item,
            "correctDisposalMethod": self.correct_disposal_method,
            "actualDisposalZone": self.actual_disposal_zone,
            "attemptResult": self.attempt_result,
            "modelConfidence": self.model_confidence,
            "llmFallbackUsed": self.llm_fallback_used,
        }


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

    attempt_result: Literal["success", "failure"]
    if snapshot.correct_disposal_method == actual_disposal_method:
        attempt_result = "success"
    else:
        attempt_result = "failure"

    return DisposalEvent(
        station_id=station_id,
        timestamp=datetime.now(tz=timezone.utc).isoformat(),
        predicted_item=snapshot.predicted_item,
        correct_disposal_method=snapshot.correct_disposal_method,
        actual_disposal_zone=snapshot.actual_disposal_zone,
        attempt_result=attempt_result,
        model_confidence=snapshot.model_confidence,
        llm_fallback_used=snapshot.llm_fallback_used,
        payload_version=DEVICE_PAYLOAD_VERSION,
    )
