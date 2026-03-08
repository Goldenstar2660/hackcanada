from __future__ import annotations

import argparse
from collections.abc import Sequence
import json
from dataclasses import dataclass
from time import sleep

from .events import DisposalEvent
from .main import StationRuntime, load_runtime_settings
from .publishers import PublicationAdapter
from .session import SessionPhase, SessionSnapshot


VALID_ZONES = ("left", "middle", "right")


@dataclass(slots=True)
class LiveDemoStep:
    predicted_item: str
    actual_disposal_zone: str | None = None
    guidance_hold_seconds: float = 5.0
    hand_present_seconds: float = 1.0
    result_hold_seconds: float = 2.0
    reset_after_result: bool = True


@dataclass(slots=True)
class LiveDemoResult:
    predicted_item: str
    guidance_zone: str
    actual_disposal_zone: str
    final_phase: str
    event: DisposalEvent | None
    esp_health_status: str
    esp_transport_error: str | None
    published_live_status_count: int
    published_event_count: int
    live_status_count_delta: int
    event_count_delta: int
    cloud_sync_status: str
    station_total_attempts: int
    station_total_correct_sorts: int
    success: bool

    def to_payload(self) -> dict[str, object]:
        return {
            "predictedItem": self.predicted_item,
            "guidanceZone": self.guidance_zone,
            "actualDisposalZone": self.actual_disposal_zone,
            "finalPhase": self.final_phase,
            "event": None if self.event is None else self.event.to_payload(),
            "espHealthStatus": self.esp_health_status,
            "espTransportError": self.esp_transport_error,
            "publishedLiveStatusCount": self.published_live_status_count,
            "publishedEventCount": self.published_event_count,
            "liveStatusCountDelta": self.live_status_count_delta,
            "eventCountDelta": self.event_count_delta,
            "cloudSyncStatus": self.cloud_sync_status,
            "stationTotalAttempts": self.station_total_attempts,
            "stationTotalCorrectSorts": self.station_total_correct_sorts,
            "success": self.success,
        }


@dataclass(slots=True)
class LiveSequenceResult:
    steps: list[LiveDemoResult]
    total_attempts: int
    total_correct_sorts: int
    final_phase: str
    success: bool

    def to_payload(self) -> dict[str, object]:
        return {
            "steps": [step.to_payload() for step in self.steps],
            "totalAttempts": self.total_attempts,
            "totalCorrectSorts": self.total_correct_sorts,
            "finalPhase": self.final_phase,
            "success": self.success,
        }


def _normalize_item_token(value: str) -> str:
    normalized = value.strip().replace("_", "-").replace(" ", "-").lower()
    if not normalized:
        raise ValueError("predicted item is required")
    return normalized


def _sleep_if_needed(seconds: float) -> None:
    if seconds < 0:
        raise ValueError("timing values must be zero or positive")
    if seconds > 0:
        sleep(seconds)


def _validate_zone(zone: str | None) -> str | None:
    if zone is None:
        return None
    normalized = zone.strip().lower()
    if normalized not in VALID_ZONES:
        raise ValueError(f"unsupported disposal zone: {zone}")
    return normalized


def _require_live_demo_configuration(runtime: StationRuntime) -> None:
    missing: list[str] = []
    if not runtime.settings.binsight_device_id:
        missing.append("BINSIGHT_DEVICE_ID")
    if not runtime.settings.binsight_device_shared_secret:
        missing.append("BINSIGHT_DEVICE_SHARED_SECRET")

    if missing:
        missing_list = ", ".join(missing)
        raise ValueError(
            f"live demo requires configured backend publication credentials in devices/pi-station/.env: {missing_list}"
        )


def _resolved_disposal_zone(runtime: StationRuntime, predicted_item: str, requested_zone: str | None) -> str:
    correct_method = runtime.rules.disposal_method_for_item(predicted_item)
    if requested_zone is not None:
        resolved_zone = _validate_zone(requested_zone)
        if resolved_zone is None:
            raise ValueError("actual disposal zone is required when specified")
        return resolved_zone
    return runtime.rules.zone_for_disposal_method(correct_method)


def _is_authenticated_publication(runtime: StationRuntime) -> bool:
    return bool(runtime.settings.binsight_device_id and runtime.settings.binsight_device_shared_secret)


def run_live_demo(
    runtime: StationRuntime,
    *,
    predicted_item: str,
    actual_disposal_zone: str | None = None,
    model_confidence: float = 0.97,
    llm_fallback_used: bool = False,
    guidance_hold_seconds: float = 5.0,
    hand_present_seconds: float = 1.0,
    result_hold_seconds: float = 2.0,
    reset_after_result: bool = True,
) -> LiveDemoResult:
    normalized_item = _normalize_item_token(predicted_item)
    resolved_zone = _resolved_disposal_zone(runtime, normalized_item, actual_disposal_zone)
    publication_client: PublicationAdapter = runtime.publication_client
    starting_live_status_count = len(publication_client.published_live_statuses)
    starting_event_count = len(publication_client.published_events)

    waiting_snapshot, _ = runtime.start_demo_session(
        normalized_item,
        model_confidence=model_confidence,
        llm_fallback_used=llm_fallback_used,
    )
    guidance_zone = waiting_snapshot.correct_disposal_method
    if guidance_zone is None:
        raise ValueError("demo session did not resolve a disposal method")

    resolved_guidance_zone = runtime.rules.zone_for_disposal_method(guidance_zone)

    _sleep_if_needed(guidance_hold_seconds)
    runtime.track_hand_and_publish(zone=resolved_zone, hand_present=True)
    _sleep_if_needed(hand_present_seconds)
    runtime.track_hand_and_publish(zone=None, hand_present=False)
    event = runtime.last_event

    _sleep_if_needed(result_hold_seconds)

    final_snapshot: SessionSnapshot = runtime.session.snapshot
    if reset_after_result:
        final_snapshot = runtime.begin_reset()
        cooldown = runtime.settings.reset_cooldown_seconds
        _sleep_if_needed(cooldown)
        final_snapshot = runtime.complete_reset()

    published_live_status_count = len(publication_client.published_live_statuses)
    published_event_count = len(publication_client.published_events)
    success = (
        event is not None
        and runtime.esp_client.last_transport_error is None
        and publication_client.cloud_sync_status == "online"
        and (
            not _is_authenticated_publication(runtime)
            or (
                published_live_status_count > starting_live_status_count
                and published_event_count > starting_event_count
            )
        )
    )

    return LiveDemoResult(
        predicted_item=waiting_snapshot.predicted_item or normalized_item,
        guidance_zone=resolved_guidance_zone,
        actual_disposal_zone=resolved_zone,
        final_phase=final_snapshot.phase.value,
        event=event,
        esp_health_status=runtime.esp_client.device_health_status,
        esp_transport_error=runtime.esp_client.last_transport_error,
        published_live_status_count=published_live_status_count,
        published_event_count=published_event_count,
        live_status_count_delta=published_live_status_count - starting_live_status_count,
        event_count_delta=published_event_count - starting_event_count,
        cloud_sync_status=publication_client.cloud_sync_status,
        station_total_attempts=final_snapshot.total_attempts,
        station_total_correct_sorts=final_snapshot.total_correct_sorts,
        success=success,
    )


def run_live_sequence(
    runtime: StationRuntime,
    steps: Sequence[LiveDemoStep],
    *,
    inter_step_seconds: float = 1.0,
    model_confidence: float = 0.97,
    llm_fallback_used: bool = False,
) -> LiveSequenceResult:
    resolved_steps = tuple(steps)
    if not resolved_steps:
        raise ValueError("live sequence requires at least one step")

    results: list[LiveDemoResult] = []
    for index, step in enumerate(resolved_steps):
        if index < len(resolved_steps) - 1 and not step.reset_after_result:
            raise ValueError("all intermediate live-sequence steps must reset back to idle")

        results.append(
            run_live_demo(
                runtime,
                predicted_item=step.predicted_item,
                actual_disposal_zone=step.actual_disposal_zone,
                model_confidence=model_confidence,
                llm_fallback_used=llm_fallback_used,
                guidance_hold_seconds=step.guidance_hold_seconds,
                hand_present_seconds=step.hand_present_seconds,
                result_hold_seconds=step.result_hold_seconds,
                reset_after_result=step.reset_after_result,
            )
        )

        if index < len(resolved_steps) - 1:
            _sleep_if_needed(inter_step_seconds)

    final_snapshot = runtime.session.snapshot
    return LiveSequenceResult(
        steps=results,
        total_attempts=final_snapshot.total_attempts,
        total_correct_sorts=final_snapshot.total_correct_sorts,
        final_phase=final_snapshot.phase.value,
        success=all(result.success for result in results),
    )


def _parse_sequence_steps(
    value: str,
    *,
    guidance_hold_seconds: float,
    hand_present_seconds: float,
    result_hold_seconds: float,
) -> list[LiveDemoStep]:
    steps: list[LiveDemoStep] = []
    for raw_token in value.split(","):
        token = raw_token.strip()
        if not token:
            continue

        item_token, separator, zone_token = token.partition(":")
        if not item_token.strip():
            raise ValueError(f"invalid live-sequence step: {raw_token!r}")

        steps.append(
            LiveDemoStep(
                predicted_item=_normalize_item_token(item_token),
                actual_disposal_zone=_validate_zone(zone_token) if separator else None,
                guidance_hold_seconds=guidance_hold_seconds,
                hand_present_seconds=hand_present_seconds,
                result_hold_seconds=result_hold_seconds,
                reset_after_result=True,
            )
        )

    if not steps:
        raise ValueError("--steps must contain at least one item")
    return steps


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Pretend the model detected an item, then simulate a believable hand-present -> hand-disappears drop flow through the real ESP and backend/dashboard path."
        )
    )
    parser.add_argument("--item", default="aluminum-can", help="Detected item to inject into the real runtime.")
    parser.add_argument(
        "--zone",
        choices=("left", "middle", "right"),
        default=None,
        help="Actual disposal zone to simulate. Defaults to the correct zone for the chosen item.",
    )
    parser.add_argument(
        "--guidance-hold-seconds",
        type=float,
        default=5.0,
        help="How long to keep the real guidance LED active before a simulated hand enters the drop zone.",
    )
    parser.add_argument(
        "--hand-seconds",
        type=float,
        default=1.0,
        help="How long the simulated hand stays in the drop zone before disappearing.",
    )
    parser.add_argument(
        "--result-hold-seconds",
        type=float,
        default=2.0,
        help="How long to hold after the result is published before clearing the guidance LED.",
    )
    parser.add_argument(
        "--confidence",
        type=float,
        default=0.97,
        help="Synthetic model confidence to publish with the fake detection.",
    )
    parser.add_argument(
        "--llm-fallback-used",
        action="store_true",
        help="Mark the fake detection as if it used the fallback path.",
    )
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="Leave the station in the post-result state instead of resetting it to idle.",
    )
    return parser


def _build_sequence_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Run a believable multi-item live demo sequence through the real ESP and backend/dashboard path."
        )
    )
    parser.add_argument(
        "--steps",
        required=True,
        help=(
            "Comma-separated item[:zone] steps, for example: "
            "aluminum-can:left,granola-bar:left,pickled-radish:middle. "
            "If zone is omitted, the correct zone for that item is used."
        ),
    )
    parser.add_argument(
        "--guidance-hold-seconds",
        type=float,
        default=5.0,
        help="How long each step shows guidance before the simulated hand enters the drop zone.",
    )
    parser.add_argument(
        "--hand-seconds",
        type=float,
        default=1.0,
        help="How long the simulated hand stays in each step's drop zone before disappearing.",
    )
    parser.add_argument(
        "--result-hold-seconds",
        type=float,
        default=2.0,
        help="How long each step holds the result before resetting.",
    )
    parser.add_argument(
        "--inter-step-seconds",
        type=float,
        default=1.0,
        help="Pause between completed steps in the chain.",
    )
    parser.add_argument(
        "--confidence",
        type=float,
        default=0.97,
        help="Synthetic model confidence to publish with each fake detection.",
    )
    parser.add_argument(
        "--llm-fallback-used",
        action="store_true",
        help="Mark each fake detection as if it used the fallback path.",
    )
    return parser


def main() -> int:
    parser = _build_arg_parser()
    args = parser.parse_args()

    runtime = StationRuntime(load_runtime_settings())
    try:
        _require_live_demo_configuration(runtime)
        result = run_live_demo(
            runtime,
            predicted_item=args.item,
            actual_disposal_zone=args.zone,
            model_confidence=args.confidence,
            llm_fallback_used=args.llm_fallback_used,
            guidance_hold_seconds=args.guidance_hold_seconds,
            hand_present_seconds=args.hand_seconds,
            result_hold_seconds=args.result_hold_seconds,
            reset_after_result=not args.no_reset,
        )
        print(json.dumps(result.to_payload(), indent=2))
        return 0 if result.success else 1
    finally:
        runtime.close()


def sequence_main() -> int:
    parser = _build_sequence_arg_parser()
    args = parser.parse_args()

    runtime = StationRuntime(load_runtime_settings())
    try:
        _require_live_demo_configuration(runtime)
        steps = _parse_sequence_steps(
            args.steps,
            guidance_hold_seconds=args.guidance_hold_seconds,
            hand_present_seconds=args.hand_seconds,
            result_hold_seconds=args.result_hold_seconds,
        )
        result = run_live_sequence(
            runtime,
            steps,
            inter_step_seconds=args.inter_step_seconds,
            model_confidence=args.confidence,
            llm_fallback_used=args.llm_fallback_used,
        )
        print(json.dumps(result.to_payload(), indent=2))
        return 0 if result.success else 1
    finally:
        runtime.close()