from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from time import sleep

from .events import DisposalEvent
from .main import StationRuntime, load_runtime_settings
from .publishers import PublicationAdapter
from .session import SessionSnapshot


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
    cloud_sync_status: str
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
            "cloudSyncStatus": self.cloud_sync_status,
            "success": self.success,
        }


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
        return requested_zone
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
    result_hold_seconds: float = 2.0,
    reset_after_result: bool = True,
) -> LiveDemoResult:
    resolved_zone = _resolved_disposal_zone(runtime, predicted_item.strip().replace("_", "-").replace(" ", "-").lower(), actual_disposal_zone)
    waiting_snapshot, _ = runtime.start_demo_session(
        predicted_item,
        model_confidence=model_confidence,
        llm_fallback_used=llm_fallback_used,
    )
    guidance_zone = waiting_snapshot.correct_disposal_method
    if guidance_zone is None:
        raise ValueError("demo session did not resolve a disposal method")

    resolved_guidance_zone = runtime.rules.zone_for_disposal_method(guidance_zone)

    if guidance_hold_seconds > 0:
        sleep(guidance_hold_seconds)

    _, event = runtime.observe_disposal(zone=resolved_zone)

    if result_hold_seconds > 0:
        sleep(result_hold_seconds)

    final_snapshot: SessionSnapshot = runtime.session.snapshot
    if reset_after_result:
        final_snapshot = runtime.begin_reset()
        cooldown = runtime.settings.reset_cooldown_seconds
        if cooldown > 0:
            sleep(cooldown)
        final_snapshot = runtime.complete_reset()

    publication_client: PublicationAdapter = runtime.publication_client
    success = (
        event is not None
        and runtime.esp_client.last_transport_error is None
        and publication_client.cloud_sync_status == "online"
        and (
            not _is_authenticated_publication(runtime)
            or (
                len(publication_client.published_live_statuses) > 0
                and len(publication_client.published_events) > 0
            )
        )
    )

    return LiveDemoResult(
        predicted_item=waiting_snapshot.predicted_item or predicted_item,
        guidance_zone=resolved_guidance_zone,
        actual_disposal_zone=resolved_zone,
        final_phase=final_snapshot.phase.value,
        event=event,
        esp_health_status=runtime.esp_client.device_health_status,
        esp_transport_error=runtime.esp_client.last_transport_error,
        published_live_status_count=len(publication_client.published_live_statuses),
        published_event_count=len(publication_client.published_events),
        cloud_sync_status=publication_client.cloud_sync_status,
        success=success,
    )


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Pretend the model detected an item, then drive the real ESP and real backend/dashboard path."
        )
    )
    parser.add_argument("--item", default="plastic-bottle", help="Detected item to inject into the real runtime.")
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
        help="How long to keep the real guidance LED active before simulating disposal.",
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
            result_hold_seconds=args.result_hold_seconds,
            reset_after_result=not args.no_reset,
        )
        print(json.dumps(result.to_payload(), indent=2))
        return 0 if result.success else 1
    finally:
        runtime.close()