from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
import json
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


@dataclass(slots=True, frozen=True)
class GuidanceCommand:
    indicator_zone: str


@dataclass(slots=True, frozen=True)
class PresenceTelemetry:
    hand_present: bool
    hand_zone: str | None
    stable: bool
    sequence: int | None = None


@dataclass(slots=True, frozen=True)
class HealthTelemetry:
    sensor_online: bool
    indicator_online: bool
    uptime_ms: int
    active_zone: str


@dataclass(slots=True, frozen=True)
class EspAcknowledgement:
    command: str
    value: str | None = None


class EspTransport(Protocol):
    def send_frame(self, frame: str) -> None: ...

    def receive_frames(self) -> Iterable[str]: ...


class NullEspTransport:
    def send_frame(self, frame: str) -> None:
        del frame

    def receive_frames(self) -> Iterable[str]:
        return ()


class HttpEspTransport:
    def __init__(
        self,
        endpoint: str,
        timeout_seconds: float = 1.0,
        opener: Any = None,
    ) -> None:
        parsed_endpoint = urlsplit(endpoint)
        if parsed_endpoint.scheme not in {"http", "https"}:
            raise ValueError(
                f"unsupported ESP HTTP endpoint scheme: {parsed_endpoint.scheme or 'missing'}"
            )
        if not parsed_endpoint.netloc:
            raise ValueError("ESP HTTP endpoint must include a hostname")

        path = parsed_endpoint.path.rstrip("/")
        self._base_url = f"{parsed_endpoint.scheme}://{parsed_endpoint.netloc}{path}"
        self._timeout_seconds = timeout_seconds
        self._pending_frames: list[str] = []
        self._opener = opener or urlopen

    def send_frame(self, frame: str) -> None:
        normalized_frame = frame.strip()
        if normalized_frame == "health?":
            payload = self._request_json("GET", "/health")
            self._pending_frames.extend(_health_payload_to_frames(payload))
            return

        if normalized_frame.startswith("indicator:"):
            zone = normalized_frame.removeprefix("indicator:")
            payload = self._request_json("POST", "/signal", {"indicatorZone": zone})
            acknowledgement = _acknowledgement_payload_to_frame(payload)
            if acknowledgement is not None:
                self._pending_frames.append(acknowledgement)
            return

        if normalized_frame == "reset":
            payload = self._request_json("POST", "/reset", {})
            acknowledgement = _acknowledgement_payload_to_frame(payload)
            if acknowledgement is not None:
                self._pending_frames.append(acknowledgement)
            return

        raise ValueError(f"unsupported ESP HTTP frame: {normalized_frame}")

    def receive_frames(self) -> Iterable[str]:
        frames = tuple(self._pending_frames)
        self._pending_frames.clear()
        return frames

    def _request_json(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        request_body = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            request_body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = Request(
            url=f"{self._base_url}{path}",
            data=request_body,
            headers=headers,
            method=method,
        )

        try:
            with self._opener(request, timeout=self._timeout_seconds) as response:
                response_body = response.read()
        except HTTPError as error:
            raise OSError(f"ESP {method} {path} failed with status {error.code}") from error
        except URLError as error:
            raise OSError(f"ESP {method} {path} failed: {error.reason}") from error

        if not response_body:
            return {}

        try:
            decoded_payload = json.loads(response_body.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise OSError(f"ESP {method} {path} returned invalid JSON") from error

        if not isinstance(decoded_payload, dict):
            raise OSError(f"ESP {method} {path} returned a non-object payload")

        return decoded_payload


class MemoryEspTransport:
    def __init__(self, incoming_frames: Iterable[str] | None = None) -> None:
        self.sent_frames: list[str] = []
        self._incoming_frames = list(incoming_frames or ())

    def queue_incoming(self, *frames: str) -> None:
        self._incoming_frames.extend(frames)

    def send_frame(self, frame: str) -> None:
        self.sent_frames.append(frame)

    def receive_frames(self) -> Iterable[str]:
        frames = tuple(self._incoming_frames)
        self._incoming_frames.clear()
        return frames


class EspClient:
    """Transport-agnostic ESP protocol adapter for guidance, presence, and health."""

    def __init__(self, endpoint: str, transport: EspTransport | None = None) -> None:
        self.endpoint = endpoint
        self._transport = transport or _transport_for_endpoint(endpoint)
        self.last_command: GuidanceCommand | None = None
        self.last_presence = PresenceTelemetry(
            hand_present=False,
            hand_zone=None,
            stable=False,
            sequence=None,
        )
        self.last_health: HealthTelemetry | None = None
        self.acknowledgements: list[EspAcknowledgement] = []
        self.last_protocol_error: str | None = None
        self.last_transport_error: str | None = None
        self._presence_frame_count = 0

    def send_guidance(self, command: GuidanceCommand) -> None:
        _validate_indicator_zone(command.indicator_zone)
        self.last_command = command
        self._send_transport_frame(f"indicator:{command.indicator_zone}")

    def clear_guidance(self) -> None:
        self.send_guidance(GuidanceCommand(indicator_zone="off"))

    def request_health(self) -> None:
        self._send_transport_frame("health?")

    def poll(self) -> None:
        try:
            frames = self._transport.receive_frames()
        except Exception as error:
            self.last_transport_error = str(error)
            return

        self.last_transport_error = None
        for frame in frames:
            self.receive_frame(frame)

    def _send_transport_frame(self, frame: str) -> None:
        try:
            self._transport.send_frame(frame)
        except Exception as error:
            self.last_transport_error = str(error)
            return

        self.last_transport_error = None

    def receive_frame(self, frame: str) -> bool:
        normalized_frame = frame.strip()
        if not normalized_frame:
            return False

        try:
            if normalized_frame.startswith("health "):
                self.last_health = _parse_health_frame(normalized_frame)
                self.last_protocol_error = None
                return True
            if normalized_frame.startswith("presence "):
                self.last_presence = _parse_presence_frame(normalized_frame)
                self._presence_frame_count += 1
                self.last_protocol_error = None
                return True
            if normalized_frame.startswith("ack "):
                self.acknowledgements.append(_parse_acknowledgement(normalized_frame))
                self.last_protocol_error = None
                return True
        except ValueError as error:
            self.last_protocol_error = str(error)
            return False

        self.last_protocol_error = f"unsupported ESP frame: {normalized_frame}"
        return False

    @property
    def has_stable_presence(self) -> bool:
        return self.last_presence.stable and self.last_presence.hand_present

    @property
    def presence_frame_count(self) -> int:
        return self._presence_frame_count

    @property
    def device_health_status(self) -> str:
        if self.last_transport_error is not None:
            return "degraded" if self.last_health is not None else "offline"
        if self.last_health is None:
            return "degraded"
        if self.last_health.sensor_online and self.last_health.indicator_online:
            return "online"
        if not self.last_health.sensor_online and not self.last_health.indicator_online:
            return "offline"
        return "degraded"


def _parse_health_frame(frame: str) -> HealthTelemetry:
    fields = _parse_key_value_fields(frame, prefix="health")
    active_zone = fields.get("active_zone", "off")
    _validate_indicator_zone(active_zone)
    return HealthTelemetry(
        sensor_online=_parse_bool(fields, "sensor"),
        indicator_online=_parse_bool(fields, "indicator"),
        uptime_ms=_parse_int(fields, "uptime_ms"),
        active_zone=active_zone,
    )


def _parse_presence_frame(frame: str) -> PresenceTelemetry:
    fields = _parse_key_value_fields(frame, prefix="presence")
    zone_token = fields.get("zone")
    if zone_token == "off":
        zone_token = None
    elif zone_token is not None:
        _validate_indicator_zone(zone_token)
    return PresenceTelemetry(
        hand_present=_parse_bool(fields, "present"),
        hand_zone=zone_token,
        stable=_parse_bool(fields, "stable"),
        sequence=_parse_optional_int(fields.get("seq")),
    )


def _parse_acknowledgement(frame: str) -> EspAcknowledgement:
    payload = frame.removeprefix("ack ").strip()
    if not payload:
        raise ValueError("acknowledgement payload is empty")
    command, separator, value = payload.partition(":")
    if not command:
        raise ValueError("acknowledgement command is empty")
    resolved_value = value if separator else None
    if command == "indicator" and resolved_value is not None:
        _validate_indicator_zone(resolved_value)
    return EspAcknowledgement(command=command, value=resolved_value)


def _parse_key_value_fields(frame: str, prefix: str) -> dict[str, str]:
    if not frame.startswith(f"{prefix} "):
        raise ValueError(f"frame does not start with {prefix}")
    fields: dict[str, str] = {}
    for token in frame[len(prefix) + 1 :].split():
        key, separator, value = token.partition("=")
        if not separator or not key or not value:
            raise ValueError(f"invalid token in {prefix} frame: {token}")
        fields[key] = value
    return fields


def _parse_bool(fields: dict[str, str], key: str) -> bool:
    value = fields.get(key)
    if value == "1":
        return True
    if value == "0":
        return False
    raise ValueError(f"field {key} must be 0 or 1")


def _parse_int(fields: dict[str, str], key: str) -> int:
    value = fields.get(key)
    if value is None:
        raise ValueError(f"field {key} is required")
    return _parse_optional_int(value, key)


def _parse_optional_int(value: str | None, key: str = "value") -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError as error:
        raise ValueError(f"field {key} must be an integer") from error


def _validate_indicator_zone(zone: str) -> None:
    if zone not in {"left", "middle", "right", "off"}:
        raise ValueError(f"unsupported indicator zone: {zone}")


def _transport_for_endpoint(endpoint: str) -> EspTransport:
    parsed_endpoint = urlsplit(endpoint)
    if parsed_endpoint.scheme in {"http", "https"}:
        return HttpEspTransport(endpoint)
    raise ValueError(
        f"unsupported ESP endpoint scheme: {parsed_endpoint.scheme or 'missing'}; use http:// or https://"
    )


def _health_payload_to_frames(payload: dict[str, Any]) -> tuple[str, ...]:
    active_zone = _coerce_zone(payload.get("activeZone"), default="off")
    health_frame = (
        "health "
        f"uptime_ms={_coerce_int(payload.get('uptimeMs'), default=0)} "
        f"sensor={_bool_token(payload.get('sensorOnline', True))} "
        f"indicator={_bool_token(payload.get('indicatorOnline', True))} "
        f"active_zone={active_zone}"
    )

    presence_payload = payload.get("presence")
    if not isinstance(presence_payload, dict):
        return (health_frame,)

    presence_frame = (
        "presence "
        f"present={_bool_token(presence_payload.get('handPresent', False))} "
        f"zone={_coerce_zone(presence_payload.get('handZone'), default='off')} "
        f"stable={_bool_token(presence_payload.get('stable', False))} "
        f"seq={_coerce_int(presence_payload.get('sequence'), default=0)}"
    )
    return health_frame, presence_frame


def _acknowledgement_payload_to_frame(payload: dict[str, Any]) -> str | None:
    acknowledgement = payload.get("ack")
    if not isinstance(acknowledgement, dict):
        return None

    command = acknowledgement.get("command")
    if not isinstance(command, str) or not command:
        return None

    value = acknowledgement.get("value")
    if value is None:
        return f"ack {command}"

    zone = _coerce_zone(value, default="off")
    return f"ack {command}:{zone}"


def _bool_token(value: Any) -> str:
    return "1" if bool(value) else "0"


def _coerce_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _coerce_zone(value: Any, default: str) -> str:
    if not isinstance(value, str):
        return default
    normalized_zone = value.strip().lower()
    if normalized_zone in {"left", "middle", "right", "off"}:
        return normalized_zone
    return default
