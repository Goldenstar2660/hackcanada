from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol


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
        self._transport = transport or NullEspTransport()
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

    def send_guidance(self, command: GuidanceCommand) -> None:
        _validate_indicator_zone(command.indicator_zone)
        self.last_command = command
        self._transport.send_frame(f"indicator:{command.indicator_zone}")

    def clear_guidance(self) -> None:
        self.send_guidance(GuidanceCommand(indicator_zone="off"))

    def request_health(self) -> None:
        self._transport.send_frame("health?")

    def poll(self) -> None:
        for frame in self._transport.receive_frames():
            self.receive_frame(frame)

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
    def device_health_status(self) -> str:
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
