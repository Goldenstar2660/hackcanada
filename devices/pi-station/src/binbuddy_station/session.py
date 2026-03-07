from __future__ import annotations

from dataclasses import dataclass, replace
from enum import StrEnum


class SessionPhase(StrEnum):
    IDLE = "idle"
    DETECTING = "detecting"
    GUIDING = "guiding"
    WAITING_FOR_DISPOSAL = "waiting_for_disposal"
    COMPLETE = "complete"


@dataclass(slots=True)
class SessionSnapshot:
    phase: SessionPhase = SessionPhase.IDLE
    predicted_item: str | None = None
    correct_disposal_method: str | None = None
    model_confidence: float | None = None
    llm_fallback_used: bool = False
    latest_hand_zone: str | None = None
    hand_present: bool = False
    actual_disposal_zone: str | None = None


class SessionStateMachine:
    def __init__(self) -> None:
        self._snapshot = SessionSnapshot()

    @property
    def snapshot(self) -> SessionSnapshot:
        return replace(self._snapshot)

    def begin_detection(self) -> SessionSnapshot:
        self._snapshot = SessionSnapshot(phase=SessionPhase.DETECTING)
        return self.snapshot

    def set_guidance(
        self,
        predicted_item: str,
        disposal_method: str,
        model_confidence: float,
        llm_fallback_used: bool,
    ) -> SessionSnapshot:
        self._snapshot = replace(
            self._snapshot,
            phase=SessionPhase.WAITING_FOR_DISPOSAL,
            predicted_item=predicted_item,
            correct_disposal_method=disposal_method,
            model_confidence=model_confidence,
            llm_fallback_used=llm_fallback_used,
        )
        return self.snapshot

    def track_hand(self, zone: str | None, hand_present: bool) -> SessionSnapshot:
        actual_disposal_zone = self._snapshot.actual_disposal_zone
        if self._snapshot.hand_present and not hand_present:
            actual_disposal_zone = self._snapshot.latest_hand_zone

        phase = self._snapshot.phase
        if actual_disposal_zone is not None:
            phase = SessionPhase.COMPLETE

        self._snapshot = replace(
            self._snapshot,
            phase=phase,
            latest_hand_zone=zone or self._snapshot.latest_hand_zone,
            hand_present=hand_present,
            actual_disposal_zone=actual_disposal_zone,
        )
        return self.snapshot
