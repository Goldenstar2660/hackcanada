from __future__ import annotations

from dataclasses import dataclass, replace
from enum import StrEnum


class SessionPhase(StrEnum):
    IDLE = "idle"
    PRESENCE_ARMING = "presence_arming"
    IDENTIFYING = "identifying"
    GUIDING = "guiding"
    WAITING_FOR_DISPOSAL = "waiting_for_disposal"
    EMIT_RESULT = "emit_result"
    RESETTING = "resetting"


@dataclass(slots=True)
class SessionTimingConfig:
    presence_debounce_seconds: float = 0.35
    disposal_timeout_seconds: float = 12.0
    reset_cooldown_seconds: float = 1.5


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
    latest_result_success: bool | None = None
    total_attempts: int = 0
    total_correct_sorts: int = 0
    phase_started_at_monotonic: float | None = None
    presence_confirm_at_monotonic: float | None = None
    disposal_timeout_at_monotonic: float | None = None
    reset_ready_at_monotonic: float | None = None


class SessionStateMachine:
    def __init__(self, timing: SessionTimingConfig | None = None) -> None:
        self._timing = timing or SessionTimingConfig()
        self._snapshot = SessionSnapshot()

    @property
    def snapshot(self) -> SessionSnapshot:
        return replace(self._snapshot)

    @property
    def timing(self) -> SessionTimingConfig:
        return replace(self._timing)

    def begin_presence_arming(self, now_monotonic: float) -> SessionSnapshot:
        self._snapshot = SessionSnapshot(
            phase=SessionPhase.PRESENCE_ARMING,
            total_attempts=self._snapshot.total_attempts,
            total_correct_sorts=self._snapshot.total_correct_sorts,
            phase_started_at_monotonic=now_monotonic,
            presence_confirm_at_monotonic=now_monotonic + self._timing.presence_debounce_seconds,
        )
        return self.snapshot

    def is_presence_confirmed(self, now_monotonic: float) -> bool:
        if self._snapshot.phase is not SessionPhase.PRESENCE_ARMING:
            return False

        confirm_at = self._snapshot.presence_confirm_at_monotonic
        return confirm_at is not None and now_monotonic >= confirm_at

    def begin_identification(self, now_monotonic: float) -> SessionSnapshot:
        if self._snapshot.phase is not SessionPhase.PRESENCE_ARMING:
            raise ValueError("presence must be armed before identification begins")

        self._snapshot = replace(
            self._snapshot,
            phase=SessionPhase.IDENTIFYING,
            phase_started_at_monotonic=now_monotonic,
        )
        return self.snapshot

    def set_guidance(
        self,
        predicted_item: str,
        disposal_method: str,
        model_confidence: float,
        llm_fallback_used: bool,
        now_monotonic: float,
    ) -> SessionSnapshot:
        if self._snapshot.phase is not SessionPhase.IDENTIFYING:
            raise ValueError("identification must begin before guidance is set")

        self._snapshot = replace(
            self._snapshot,
            phase=SessionPhase.GUIDING,
            predicted_item=predicted_item,
            correct_disposal_method=disposal_method,
            model_confidence=model_confidence,
            llm_fallback_used=llm_fallback_used,
            phase_started_at_monotonic=now_monotonic,
        )
        return self.snapshot

    def begin_waiting_for_disposal(self, now_monotonic: float) -> SessionSnapshot:
        if self._snapshot.phase is not SessionPhase.GUIDING:
            raise ValueError("guidance must be active before disposal tracking begins")

        self._snapshot = replace(
            self._snapshot,
            phase=SessionPhase.WAITING_FOR_DISPOSAL,
            phase_started_at_monotonic=now_monotonic,
            disposal_timeout_at_monotonic=now_monotonic + self._timing.disposal_timeout_seconds,
        )
        return self.snapshot

    def is_disposal_wait_expired(self, now_monotonic: float) -> bool:
        if self._snapshot.phase is not SessionPhase.WAITING_FOR_DISPOSAL:
            return False

        timeout_at = self._snapshot.disposal_timeout_at_monotonic
        return timeout_at is not None and now_monotonic >= timeout_at

    def track_hand(
        self,
        zone: str | None,
        hand_present: bool,
        now_monotonic: float,
    ) -> SessionSnapshot:
        if self._snapshot.phase is not SessionPhase.WAITING_FOR_DISPOSAL:
            raise ValueError("hand tracking is only available while waiting for disposal")

        actual_disposal_zone = self._snapshot.actual_disposal_zone
        if self._snapshot.hand_present and not hand_present:
            actual_disposal_zone = self._snapshot.latest_hand_zone

        phase = self._snapshot.phase
        if actual_disposal_zone is not None:
            phase = SessionPhase.EMIT_RESULT

        self._snapshot = replace(
            self._snapshot,
            phase=phase,
            latest_hand_zone=zone or self._snapshot.latest_hand_zone,
            hand_present=hand_present,
            actual_disposal_zone=actual_disposal_zone,
            phase_started_at_monotonic=now_monotonic,
        )
        return self.snapshot

    def record_result(self, success: bool) -> SessionSnapshot:
        if self._snapshot.phase is not SessionPhase.EMIT_RESULT:
            raise ValueError("result recording requires a resolved disposal event")

        self._snapshot = replace(
            self._snapshot,
            latest_result_success=success,
            total_attempts=self._snapshot.total_attempts + 1,
            total_correct_sorts=self._snapshot.total_correct_sorts + int(success),
        )
        return self.snapshot

    def begin_resetting(self, now_monotonic: float) -> SessionSnapshot:
        if self._snapshot.phase not in {SessionPhase.WAITING_FOR_DISPOSAL, SessionPhase.EMIT_RESULT}:
            raise ValueError("resetting requires an active or completed session")

        self._snapshot = replace(
            self._snapshot,
            phase=SessionPhase.RESETTING,
            hand_present=False,
            phase_started_at_monotonic=now_monotonic,
            reset_ready_at_monotonic=now_monotonic + self._timing.reset_cooldown_seconds,
        )
        return self.snapshot

    def is_reset_ready(self, now_monotonic: float) -> bool:
        if self._snapshot.phase is not SessionPhase.RESETTING:
            return False

        ready_at = self._snapshot.reset_ready_at_monotonic
        return ready_at is not None and now_monotonic >= ready_at

    def complete_reset(self, now_monotonic: float) -> SessionSnapshot:
        if not self.is_reset_ready(now_monotonic):
            raise ValueError("reset cooldown has not elapsed")

        self._snapshot = SessionSnapshot(
            phase=SessionPhase.IDLE,
            latest_result_success=self._snapshot.latest_result_success,
            total_attempts=self._snapshot.total_attempts,
            total_correct_sorts=self._snapshot.total_correct_sorts,
            phase_started_at_monotonic=now_monotonic,
        )
        return self.snapshot
