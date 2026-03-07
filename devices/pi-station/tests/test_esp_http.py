from __future__ import annotations

import json

from binbuddy_station.esp_client import EspClient, HttpEspTransport


class FakeHttpResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = json.dumps(payload).encode("utf-8")

    def __enter__(self) -> FakeHttpResponse:
        return self

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        del exc_type, exc, traceback

    def read(self) -> bytes:
        return self._payload


class RecordingOpener:
    def __init__(self, *payloads: dict[str, object]) -> None:
        self._payloads = list(payloads)
        self.requests: list[tuple[str, str, str | None]] = []

    def __call__(self, request: object, timeout: float) -> FakeHttpResponse:
        del timeout
        method = request.get_method()
        body = request.data.decode("utf-8") if request.data is not None else None
        self.requests.append((method, request.full_url, body))
        if not self._payloads:
            raise AssertionError("unexpected HTTP request")
        return FakeHttpResponse(self._payloads.pop(0))


class FailingTransport:
    def send_frame(self, frame: str) -> None:
        raise OSError(f"transport unavailable for {frame}")

    def receive_frames(self) -> tuple[str, ...]:
        return ()


def test_http_transport_maps_health_json_to_runtime_frames() -> None:
    opener = RecordingOpener(
        {
            "sensorOnline": True,
            "indicatorOnline": True,
            "uptimeMs": 4200,
            "activeZone": "left",
            "presence": {
                "handPresent": True,
                "handZone": "left",
                "stable": True,
                "sequence": 9,
            },
        }
    )
    transport = HttpEspTransport("http://esp.local", opener=opener)

    transport.send_frame("health?")

    assert opener.requests == [("GET", "http://esp.local/health", None)]
    assert tuple(transport.receive_frames()) == (
        "health uptime_ms=4200 sensor=1 indicator=1 active_zone=left",
        "presence present=1 zone=left stable=1 seq=9",
    )


def test_http_transport_maps_signal_command_to_http_request() -> None:
    opener = RecordingOpener(
        {
            "ack": {
                "command": "indicator",
                "value": "middle",
            }
        }
    )
    transport = HttpEspTransport("http://esp.local", opener=opener)

    transport.send_frame("indicator:middle")

    assert opener.requests == [
        ("POST", "http://esp.local/signal", '{"indicatorZone": "middle"}')
    ]
    assert tuple(transport.receive_frames()) == ("ack indicator:middle",)


def test_esp_client_marks_transport_failure_offline_without_health() -> None:
    client = EspClient("http://esp.local", transport=FailingTransport())

    client.request_health()

    assert client.last_transport_error is not None
    assert client.device_health_status == "offline"


def test_esp_client_marks_transport_failure_degraded_after_successful_health() -> None:
    client = EspClient("http://esp.local")
    client.receive_frame("health uptime_ms=5 sensor=1 indicator=1 active_zone=off")
    client._transport = FailingTransport()

    client.request_health()

    assert client.last_transport_error is not None
    assert client.device_health_status == "degraded"