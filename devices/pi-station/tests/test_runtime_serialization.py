from __future__ import annotations

from binbuddy_station.events import create_disposal_event
from binbuddy_station.live_status import DeviceHealth, LiveStatusPublisher
from binbuddy_station.publishers import PublicationAdapter
from binbuddy_station.rules import load_rules_preset
from binbuddy_station.session import SessionStateMachine


def _resolved_snapshot(*, zone: str, llm_fallback_used: bool = False):
    session = SessionStateMachine()
    session.begin_presence_arming(0.0)
    session.begin_identification(0.35)
    session.set_guidance(
        "plastic-bottle",
        "recycle",
        0.62 if llm_fallback_used else 0.97,
        llm_fallback_used,
        0.5,
    )
    session.begin_waiting_for_disposal(0.5)
    session.track_hand(zone=zone, hand_present=True, now_monotonic=1.0)
    return session.track_hand(zone=zone, hand_present=False, now_monotonic=1.1)


def test_disposal_event_payload_serializes_success_with_fallback_fields() -> None:
    preset = load_rules_preset("demo-canada-ottawa", "1.0.0")
    snapshot = _resolved_snapshot(zone="left", llm_fallback_used=True)

    event = create_disposal_event("demo-station-001", snapshot, preset)

    assert event.to_payload() == {
        "stationId": "demo-station-001",
        "timestamp": event.timestamp,
        "predictedItem": "plastic-bottle",
        "correctDisposalMethod": "recycle",
        "actualDisposalZone": "left",
        "attemptResult": "success",
        "modelConfidence": 0.62,
        "llmFallbackUsed": True,
    }


def test_disposal_event_payload_serializes_failure_for_wrong_zone_mapping() -> None:
    preset = load_rules_preset("demo-canada-ottawa", "1.0.0")
    snapshot = _resolved_snapshot(zone="right")

    event = create_disposal_event("demo-station-001", snapshot, preset)

    assert event.success is False
    assert event.to_payload()["attemptResult"] == "failure"
    assert event.to_payload()["actualDisposalZone"] == "right"
    assert event.to_payload()["correctDisposalMethod"] == "recycle"


def test_live_status_payload_serializes_waiting_phase_and_latest_event_summary() -> None:
    preset = load_rules_preset("demo-canada-ottawa", "1.0.0")
    session = SessionStateMachine()
    session.begin_presence_arming(0.0)
    session.begin_identification(0.35)
    session.set_guidance("plastic-bottle", "recycle", 0.97, False, 0.5)
    waiting_snapshot = session.begin_waiting_for_disposal(0.5)
    latest_event = create_disposal_event("demo-station-001", _resolved_snapshot(zone="left"), preset)

    status = LiveStatusPublisher().build_status(
        "demo-station-001",
        waiting_snapshot,
        latest_event=latest_event,
        device_health=DeviceHealth(pi="online", esp8266="online", cloud_sync="online"),
    )

    assert status.to_payload() == {
        "stationId": "demo-station-001",
        "timestamp": status.timestamp,
        "sessionState": "waiting-for-disposal",
        "cameraFeedActive": False,
        "currentDetectedItem": "plastic-bottle",
        "currentDisposalMethod": "recycle",
        "currentHandZone": None,
        "deviceHealth": {
            "pi": "online",
            "esp8266": "online",
            "cloudSync": "online",
        },
        "latestEvent": {
            "timestamp": latest_event.timestamp,
            "predictedItem": "plastic-bottle",
            "correctDisposalMethod": "recycle",
            "actualDisposalZone": "left",
            "attemptResult": "success",
        },
    }


def test_publication_adapter_uses_device_ingress_payloads() -> None:
    preset = load_rules_preset("demo-canada-ottawa", "1.0.0")
    snapshot = _resolved_snapshot(zone="left", llm_fallback_used=True)
    event = create_disposal_event("demo-station-001", snapshot, preset)
    status = LiveStatusPublisher().build_status(
        "demo-station-001",
        snapshot,
        latest_event=event,
        device_health=DeviceHealth(pi="online", esp8266="online", cloud_sync="online"),
    )
    publisher = PublicationAdapter("binbuddy-demo")

    published_event = publisher.publish_disposal_event(event)
    published_status = publisher.publish_live_status(status)

    assert published_event == event.to_ingress_payload()
    assert publisher.published_events == [event.to_ingress_payload()]
    assert published_status == status.to_ingress_payload()
    assert publisher.published_live_statuses == [status.to_ingress_payload()]
