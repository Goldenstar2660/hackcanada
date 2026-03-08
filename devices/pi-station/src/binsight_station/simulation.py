from __future__ import annotations

import argparse
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Lock, Thread
from time import monotonic, sleep
from typing import Any
from urllib.parse import urlsplit

from .classification import ClassificationRequest, ClassificationResult
from .esp_client import (
    BACKEND_DEVICE_ID_HEADER,
    BACKEND_SIGNATURE_HEADER,
    BACKEND_STATION_ID_HEADER,
    BACKEND_TIMESTAMP_HEADER,
)
from .main import DeterministicHandTracker, RuntimeSettings, StationRuntime
from .session import SessionPhase


def _send_json(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    encoded = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(encoded)))
    handler.end_headers()
    handler.wfile.write(encoded)


def _read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any] | None:
    content_length = int(handler.headers.get("Content-Length", "0"))
    raw_body = handler.rfile.read(content_length) if content_length > 0 else b""
    if not raw_body:
        return None

    decoded = json.loads(raw_body.decode("utf-8"))
    if not isinstance(decoded, dict):
        raise ValueError("expected a JSON object body")
    return decoded


def _normalized_headers(handler: BaseHTTPRequestHandler) -> dict[str, str]:
    return {name.lower(): value for name, value in handler.headers.items()}


def _normalize_item_token(value: str) -> str:
    return "-".join(value.strip().lower().split())


@dataclass(slots=True)
class RecordedIngressRequest:
    path: str
    method: str
    headers: dict[str, str]
    body: dict[str, Any]
    received_at_monotonic: float

    def to_payload(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "method": self.method,
            "headers": dict(self.headers),
            "body": dict(self.body),
            "receivedAtMonotonic": self.received_at_monotonic,
        }


@dataclass(slots=True)
class RealtimeSimulationScenario:
    predicted_item: str = "plastic-bottle"
    disposal_zone: str = "left"
    station_id: str = "demo-station-001"
    device_id: str = "pi-sim-001"
    shared_secret: str = "simulated-secret"
    classification_confidence: float = 0.97
    llm_fallback_used: bool = False
    disposal_timeout_seconds: float = 12.0
    reset_cooldown_seconds: float = 1.5
    tick_interval_seconds: float = 0.05
    hand_hold_seconds: float = 0.25
    max_duration_seconds: float = 10.0
    perform_reset: bool = True
    expected_success: bool | None = None

    def validate(self) -> None:
        if self.disposal_zone not in {"left", "middle", "right"}:
            raise ValueError("disposal_zone must be one of: left, middle, right")
        if self.disposal_timeout_seconds <= 0:
            raise ValueError("disposal_timeout_seconds must be positive")
        if self.reset_cooldown_seconds < 0:
            raise ValueError("reset_cooldown_seconds must be zero or positive")
        if self.tick_interval_seconds <= 0:
            raise ValueError("tick_interval_seconds must be positive")
        if self.hand_hold_seconds < 0:
            raise ValueError("hand_hold_seconds must be zero or positive")
        if self.max_duration_seconds <= 0:
            raise ValueError("max_duration_seconds must be positive")

    @property
    def image_source(self) -> str:
        return f"simulation://{self.predicted_item}"


class StaticClassifier:
    def __init__(self, result: ClassificationResult) -> None:
        self._result = result
        self.calls = 0
        self.requests: list[ClassificationRequest] = []

    def classify(self, request: ClassificationRequest) -> ClassificationResult:
        self.calls += 1
        self.requests.append(request)
        return self._result


class SimulatedEspController:
    def __init__(self) -> None:
        self._lock = Lock()
        self._server: ThreadingHTTPServer | None = None
        self._thread: Thread | None = None
        self._started_at_monotonic: float | None = None
        self.active_zone = "off"
        self.sensor_online = True
        self.indicator_online = True
        self.hand_present = False
        self.hand_zone = "off"
        self.stable_presence = False
        self.presence_sequence = 0
        self.signal_history: list[str] = []
        self.command_history: list[RecordedIngressRequest] = []
        self.health_request_count = 0
        self.reset_request_count = 0

    @property
    def base_url(self) -> str:
        if self._server is None:
            raise RuntimeError("simulated ESP controller is not running")
        return f"http://127.0.0.1:{self._server.server_address[1]}"

    def set_presence(self, *, hand_present: bool, stable: bool, hand_zone: str = "off") -> None:
        resolved_zone = hand_zone if hand_present else "off"
        with self._lock:
            self.hand_present = hand_present
            self.stable_presence = stable
            self.hand_zone = resolved_zone
            self.presence_sequence += 1

    def start(self) -> SimulatedEspController:
        if self._server is not None:
            return self

        controller = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:  # noqa: N802
                controller._handle_get(self)

            def do_POST(self) -> None:  # noqa: N802
                controller._handle_post(self)

            def log_message(self, format: str, *args: object) -> None:
                del format, args

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self._thread = Thread(target=self._server.serve_forever, daemon=True)
        self._started_at_monotonic = monotonic()
        self._thread.start()
        return self

    def stop(self) -> None:
        if self._server is None:
            return
        self._server.shutdown()
        self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
        self._server = None
        self._thread = None

    def __enter__(self) -> SimulatedEspController:
        return self.start()

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        del exc_type, exc, traceback
        self.stop()

    def _handle_get(self, handler: BaseHTTPRequestHandler) -> None:
        path = urlsplit(handler.path).path
        if path != "/health":
            _send_json(handler, 404, {"error": "not found"})
            return

        with self._lock:
            self.health_request_count += 1
            uptime_ms = int(((monotonic() - (self._started_at_monotonic or monotonic())) * 1000))
            payload = {
                "transport": "http",
                "sensorOnline": self.sensor_online,
                "indicatorOnline": self.indicator_online,
                "uptimeMs": uptime_ms,
                "activeZone": self.active_zone,
                "presence": {
                    "handPresent": self.hand_present,
                    "handZone": self.hand_zone,
                    "stable": self.stable_presence,
                    "sequence": self.presence_sequence,
                },
            }

        _send_json(handler, 200, payload)

    def _handle_post(self, handler: BaseHTTPRequestHandler) -> None:
        path = urlsplit(handler.path).path
        try:
            body = _read_json_body(handler) or {}
        except (json.JSONDecodeError, ValueError) as error:
            _send_json(handler, 400, {"error": str(error)})
            return

        headers = _normalized_headers(handler)
        request = RecordedIngressRequest(
            path=path,
            method="POST",
            headers=headers,
            body=body,
            received_at_monotonic=monotonic(),
        )

        if path == "/signal":
            zone = self._resolve_signal_zone(body)
            if zone is None:
                _send_json(handler, 400, {"error": "unsupported signal payload"})
                return
            with self._lock:
                self.active_zone = zone
                self.signal_history.append(zone)
                self.command_history.append(request)
            _send_json(handler, 200, {"ack": {"command": "indicator", "value": zone}})
            return

        if path == "/reset":
            with self._lock:
                self.active_zone = "off"
                self.reset_request_count += 1
                self.command_history.append(request)
            _send_json(handler, 200, {"ack": {"command": "reset"}})
            return

        _send_json(handler, 404, {"error": "not found"})

    def _resolve_signal_zone(self, body: dict[str, Any]) -> str | None:
        for key in ("indicatorZone", "zone"):
            zone = body.get(key)
            if isinstance(zone, str) and zone in {"left", "middle", "right", "off"}:
                return zone

        step = body.get("step")
        if step == 1:
            return "left"
        if step == 2:
            return "middle"
        if step == 3:
            return "right"
        return None


class SimulatedBackendIngressServer:
    def __init__(self, *, device_id: str, station_id: str, shared_secret: str) -> None:
        self.device_id = device_id
        self.station_id = station_id
        self.shared_secret = shared_secret
        self._lock = Lock()
        self._server: ThreadingHTTPServer | None = None
        self._thread: Thread | None = None
        self.requests: list[RecordedIngressRequest] = []
        self.live_status_history: list[dict[str, Any]] = []
        self.event_history: list[dict[str, Any]] = []
        self.live_status_by_station: dict[str, dict[str, Any]] = {}
        self.events_by_id: dict[str, dict[str, Any]] = {}

    @property
    def base_url(self) -> str:
        if self._server is None:
            raise RuntimeError("simulated backend ingress server is not running")
        return f"http://127.0.0.1:{self._server.server_address[1]}"

    def start(self) -> SimulatedBackendIngressServer:
        if self._server is not None:
            return self

        backend = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:  # noqa: N802
                backend._handle_post(self)

            def log_message(self, format: str, *args: object) -> None:
                del format, args

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self._thread = Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        if self._server is None:
            return
        self._server.shutdown()
        self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
        self._server = None
        self._thread = None

    def __enter__(self) -> SimulatedBackendIngressServer:
        return self.start()

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        del exc_type, exc, traceback
        self.stop()

    def _handle_post(self, handler: BaseHTTPRequestHandler) -> None:
        path = urlsplit(handler.path).path
        try:
            body = _read_json_body(handler) or {}
        except (json.JSONDecodeError, ValueError) as error:
            _send_json(handler, 400, {"error": {"code": "validation", "message": str(error)}})
            return

        headers = _normalized_headers(handler)
        request = RecordedIngressRequest(
            path=path,
            method="POST",
            headers=headers,
            body=body,
            received_at_monotonic=monotonic(),
        )

        try:
            self._validate_headers(headers)
        except ValueError as error:
            _send_json(handler, 403, {"error": {"code": "device-auth", "message": str(error)}})
            return

        with self._lock:
            self.requests.append(request)

            if path == "/ingestLiveStatus":
                station_id = str(body.get("station_id", ""))
                if station_id != self.station_id:
                    _send_json(handler, 403, {"error": {"code": "device-station-mismatch", "message": "station_id mismatch"}})
                    return
                created = station_id not in self.live_status_by_station
                payload_copy = dict(body)
                self.live_status_history.append(payload_copy)
                self.live_status_by_station[station_id] = payload_copy
                _send_json(
                    handler,
                    201 if created else 200,
                    {
                        "stationId": station_id,
                        "writeStatus": "created" if created else "updated",
                        "timestamp": body.get("timestamp"),
                        "cameraFeedActive": body.get("camera_feed_active", False),
                    },
                )
                return

            if path == "/ingestEvent":
                station_id = str(body.get("station_id", ""))
                if station_id != self.station_id:
                    _send_json(handler, 403, {"error": {"code": "device-station-mismatch", "message": "station_id mismatch"}})
                    return
                event_id = self._create_event_id(body)
                created = event_id not in self.events_by_id
                payload_copy = dict(body)
                self.event_history.append(payload_copy)
                self.events_by_id[event_id] = payload_copy
                _send_json(
                    handler,
                    201 if created else 200,
                    {
                        "eventId": event_id,
                        "writeStatus": "created" if created else "duplicate",
                        "stationId": station_id,
                        "timestamp": body.get("timestamp"),
                    },
                )
                return

        _send_json(handler, 404, {"error": {"code": "not-found", "message": "unsupported endpoint"}})

    def _validate_headers(self, headers: dict[str, str]) -> None:
        device_id = headers.get(BACKEND_DEVICE_ID_HEADER)
        station_id = headers.get(BACKEND_STATION_ID_HEADER)
        timestamp = headers.get(BACKEND_TIMESTAMP_HEADER)
        signature = headers.get(BACKEND_SIGNATURE_HEADER)

        if not device_id or not station_id or not timestamp or not signature:
            raise ValueError("missing required device authentication headers")
        if device_id != self.device_id or station_id != self.station_id:
            raise ValueError("unexpected device credentials")

        expected_signature = (
            f"binsight-v1:{self.device_id}:{self.station_id}:{timestamp}:{self.shared_secret}"
        )
        if signature != expected_signature:
            raise ValueError("invalid device signature")

    def _create_event_id(self, body: dict[str, Any]) -> str:
        station_id = str(body.get("station_id", self.station_id))
        timestamp = str(body.get("timestamp", ""))
        predicted_item = str(body.get("predicted_item", "unknown-item"))
        return f"{station_id}_{timestamp}_{_normalize_item_token(predicted_item)}"


@dataclass(slots=True)
class RealtimeSimulationResult:
    scenario: RealtimeSimulationScenario
    elapsed_wall_clock_seconds: float
    classifier_calls: int
    esp_signal_history: list[str]
    esp_active_zone: str
    esp_health_request_count: int
    backend_live_status_count: int
    backend_event_count: int
    live_status_phases: list[str]
    latest_live_status: dict[str, Any] | None
    latest_event: dict[str, Any] | None
    success: bool
    failure_reason: str | None = None

    def assert_success(self) -> None:
        if not self.success:
            raise AssertionError(self.failure_reason or "real-time simulation failed")

    def to_payload(self) -> dict[str, Any]:
        return {
            "scenario": {
                "predictedItem": self.scenario.predicted_item,
                "disposalZone": self.scenario.disposal_zone,
                "stationId": self.scenario.station_id,
                "deviceId": self.scenario.device_id,
                "disposalTimeoutSeconds": self.scenario.disposal_timeout_seconds,
                "resetCooldownSeconds": self.scenario.reset_cooldown_seconds,
                "tickIntervalSeconds": self.scenario.tick_interval_seconds,
                "handHoldSeconds": self.scenario.hand_hold_seconds,
                "performReset": self.scenario.perform_reset,
            },
            "elapsedWallClockSeconds": self.elapsed_wall_clock_seconds,
            "classifierCalls": self.classifier_calls,
            "espSignalHistory": list(self.esp_signal_history),
            "espActiveZone": self.esp_active_zone,
            "espHealthRequestCount": self.esp_health_request_count,
            "backendLiveStatusCount": self.backend_live_status_count,
            "backendEventCount": self.backend_event_count,
            "liveStatusPhases": list(self.live_status_phases),
            "latestLiveStatus": self.latest_live_status,
            "latestEvent": self.latest_event,
            "success": self.success,
            "failureReason": self.failure_reason,
        }


def build_simulation_settings(
    *,
    scenario: RealtimeSimulationScenario,
    esp_endpoint: str,
    backend_base_url: str,
) -> RuntimeSettings:
    return RuntimeSettings(
        station_id=scenario.station_id,
        rules_preset_id="demo-canada-ottawa",
        rules_preset_version="1.0.0",
        item_classifier_model_dir=Path("/tmp/binsight-simulation-model"),
        esp_endpoint=esp_endpoint,
        firebase_project_id="binsight-simulation",
        firebase_functions_region="us-central1",
        firebase_functions_base_url=backend_base_url,
        binsight_device_id=scenario.device_id,
        binsight_device_shared_secret=scenario.shared_secret,
        publication_timeout_seconds=1.0,
        disposal_timeout_seconds=scenario.disposal_timeout_seconds,
        reset_cooldown_seconds=scenario.reset_cooldown_seconds,
    )


def run_realtime_simulation(
    scenario: RealtimeSimulationScenario | None = None,
) -> RealtimeSimulationResult:
    resolved_scenario = scenario or RealtimeSimulationScenario()
    resolved_scenario.validate()

    with SimulatedEspController() as esp_server, SimulatedBackendIngressServer(
        device_id=resolved_scenario.device_id,
        station_id=resolved_scenario.station_id,
        shared_secret=resolved_scenario.shared_secret,
    ) as backend_server:
        settings = build_simulation_settings(
            scenario=resolved_scenario,
            esp_endpoint=esp_server.base_url,
            backend_base_url=backend_server.base_url,
        )
        runtime = StationRuntime(
            settings,
            hand_tracking_input=DeterministicHandTracker((resolved_scenario.disposal_zone,)),
        )
        classifier = StaticClassifier(
            ClassificationResult(
                predicted_item=resolved_scenario.predicted_item,
                confidence=resolved_scenario.classification_confidence,
                llm_fallback_used=resolved_scenario.llm_fallback_used,
            )
        )
        runtime.classifier = classifier

        esp_server.set_presence(hand_present=True, stable=True)
        started_at = monotonic()
        guidance_seen_at: float | None = None
        hand_release_applied = False
        reset_started_at: float | None = None
        timeout_reason: str | None = None

        try:
            while monotonic() - started_at <= resolved_scenario.max_duration_seconds:
                snapshot = runtime.session.snapshot
                if snapshot.phase is SessionPhase.IDLE:
                    runtime.start_session(image_source=resolved_scenario.image_source)
                elif snapshot.phase in {SessionPhase.WAITING_FOR_DISPOSAL, SessionPhase.EMIT_RESULT}:
                    runtime.sync_from_esp()

                now = monotonic()
                if guidance_seen_at is None and esp_server.signal_history:
                    guidance_seen_at = now

                if (
                    guidance_seen_at is not None
                    and not hand_release_applied
                    and now - guidance_seen_at >= resolved_scenario.hand_hold_seconds
                ):
                    esp_server.set_presence(hand_present=False, stable=False)
                    hand_release_applied = True

                if runtime.last_event is not None and reset_started_at is None and resolved_scenario.perform_reset:
                    runtime.begin_reset()
                    reset_started_at = monotonic()

                if reset_started_at is not None and runtime.session.snapshot.phase is SessionPhase.RESETTING:
                    if monotonic() - reset_started_at >= resolved_scenario.reset_cooldown_seconds:
                        try:
                            runtime.complete_reset()
                        except ValueError:
                            pass

                if runtime.last_event is not None:
                    current_phase = runtime.session.snapshot.phase
                    if not resolved_scenario.perform_reset and current_phase is SessionPhase.EMIT_RESULT:
                        break
                    if resolved_scenario.perform_reset and current_phase is SessionPhase.IDLE:
                        break

                sleep(resolved_scenario.tick_interval_seconds)
            else:
                timeout_reason = (
                    "simulation timed out before the runtime published the expected end state"
                )
        finally:
            runtime.close()

        latest_event = backend_server.event_history[-1] if backend_server.event_history else None
        latest_live_status = (
            backend_server.live_status_history[-1] if backend_server.live_status_history else None
        )
        live_status_phases = [
            str(status.get("phase", "unknown")) for status in backend_server.live_status_history
        ]
        expected_guidance_zone = None
        if runtime.last_event is not None:
            expected_guidance_zone = runtime.rules.zone_for_disposal_method(
                runtime.last_event.correct_disposal_method
            )
        expected_success = resolved_scenario.expected_success
        if expected_success is None and expected_guidance_zone is not None:
            expected_success = resolved_scenario.disposal_zone == expected_guidance_zone

        success, failure_reason = _evaluate_simulation_result(
            scenario=resolved_scenario,
            timeout_reason=timeout_reason,
            expected_guidance_zone=expected_guidance_zone,
            expected_success=expected_success,
            esp_server=esp_server,
            backend_server=backend_server,
            latest_event=latest_event,
            latest_live_status=latest_live_status,
        )

        return RealtimeSimulationResult(
            scenario=resolved_scenario,
            elapsed_wall_clock_seconds=monotonic() - started_at,
            classifier_calls=classifier.calls,
            esp_signal_history=list(esp_server.signal_history),
            esp_active_zone=esp_server.active_zone,
            esp_health_request_count=esp_server.health_request_count,
            backend_live_status_count=len(backend_server.live_status_history),
            backend_event_count=len(backend_server.event_history),
            live_status_phases=live_status_phases,
            latest_live_status=latest_live_status,
            latest_event=latest_event,
            success=success,
            failure_reason=failure_reason,
        )


def _evaluate_simulation_result(
    *,
    scenario: RealtimeSimulationScenario,
    timeout_reason: str | None,
    expected_guidance_zone: str | None,
    expected_success: bool | None,
    esp_server: SimulatedEspController,
    backend_server: SimulatedBackendIngressServer,
    latest_event: dict[str, Any] | None,
    latest_live_status: dict[str, Any] | None,
) -> tuple[bool, str | None]:
    if timeout_reason is not None:
        return False, timeout_reason
    if not esp_server.signal_history:
        return False, "simulation never observed a guidance command reaching the ESP"
    if expected_guidance_zone is not None and esp_server.signal_history[0] != expected_guidance_zone:
        return False, (
            f"expected first ESP guidance command to be {expected_guidance_zone}, "
            f"got {esp_server.signal_history[0]}"
        )
    if scenario.perform_reset and esp_server.signal_history[-1] != "off":
        return False, "simulation never observed the runtime clearing ESP guidance"
    if len(backend_server.live_status_history) == 0:
        return False, "simulation never observed a live-status payload reach backend ingress"
    if len(backend_server.event_history) == 0:
        return False, "simulation never observed a disposal event payload reach backend ingress"
    if latest_event is None:
        return False, "simulation completed without a persisted disposal event"
    if str(latest_event.get("predicted_item")) != scenario.predicted_item:
        return False, "persisted disposal event predicted_item did not match the scenario"
    if str(latest_event.get("actual_disposal_zone")) != scenario.disposal_zone:
        return False, "persisted disposal event actual_disposal_zone did not match the scenario"
    if expected_success is not None and bool(latest_event.get("success")) != expected_success:
        return False, "persisted disposal event success did not match the scenario expectation"
    if latest_live_status is None:
        return False, "simulation completed without a persisted live status"
    if scenario.perform_reset and str(latest_live_status.get("phase")) != "idle":
        return False, "final persisted live status did not return to idle after reset"
    return True, None


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Run a real-time local simulation of the Pi runtime against a fake ESP HTTP controller "
            "and fake backend ingress server."
        )
    )
    parser.add_argument("--item", default="plastic-bottle", help="Predicted item to simulate.")
    parser.add_argument(
        "--disposal-zone",
        choices=("left", "middle", "right"),
        default="left",
        help="Disposal zone to simulate when the user drops the item.",
    )
    parser.add_argument(
        "--disposal-timeout-seconds",
        type=float,
        default=12.0,
        help="Maximum time the runtime waits for disposal before timing out.",
    )
    parser.add_argument(
        "--reset-cooldown-seconds",
        type=float,
        default=1.5,
        help="Cooldown before the runtime returns to idle after the simulated result.",
    )
    parser.add_argument(
        "--tick-interval-seconds",
        type=float,
        default=0.05,
        help="Polling cadence for the real-time simulation loop.",
    )
    parser.add_argument(
        "--hand-hold-seconds",
        type=float,
        default=0.25,
        help="How long the simulated hand stays present after guidance is shown.",
    )
    parser.add_argument(
        "--max-duration-seconds",
        type=float,
        default=10.0,
        help="Maximum wall-clock duration allowed for the simulation run.",
    )
    parser.add_argument(
        "--output-json",
        default=None,
        help="Optional path to save the simulation summary JSON.",
    )
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="Stop after event publication instead of running the reset-to-idle path.",
    )
    return parser


def main() -> int:
    parser = _build_arg_parser()
    args = parser.parse_args()
    scenario = RealtimeSimulationScenario(
        predicted_item=args.item,
        disposal_zone=args.disposal_zone,
        disposal_timeout_seconds=args.disposal_timeout_seconds,
        reset_cooldown_seconds=args.reset_cooldown_seconds,
        tick_interval_seconds=args.tick_interval_seconds,
        hand_hold_seconds=args.hand_hold_seconds,
        max_duration_seconds=args.max_duration_seconds,
        perform_reset=not args.no_reset,
    )
    result = run_realtime_simulation(scenario)
    payload = result.to_payload()
    print(json.dumps(payload, indent=2))

    if args.output_json:
        output_path = Path(args.output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    return 0 if result.success else 1


if __name__ == "__main__":
    raise SystemExit(main())