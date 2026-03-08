from itertools import count
from pathlib import Path

from binsight_station.esp_client import EspClient, MemoryEspTransport
from binsight_station.live_demo import LiveDemoStep, run_live_demo, run_live_sequence
from binsight_station.main import RuntimeSettings, StationRuntime
from binsight_station.publishers import PublicationAdapter
from binsight_station.session import SessionPhase


def _build_demo_runtime() -> tuple[StationRuntime, MemoryEspTransport, PublicationAdapter]:
    transport = MemoryEspTransport(
        incoming_frames=(
            "health uptime_ms=42 sensor=1 indicator=1 active_zone=off",
            "presence present=0 zone=off stable=0 seq=1",
        )
    )
    publication_client = PublicationAdapter("test-project")
    runtime = StationRuntime(
        RuntimeSettings(
            station_id="demo-station-001",
            rules_preset_id="demo-canada-ottawa",
            rules_preset_version="1.0.0",
            item_classifier_model_dir=Path("/tmp/binsight-test-model"),
            esp_endpoint="serial://test",
            firebase_project_id="test-project",
            firebase_functions_region="us-central1",
            firebase_functions_base_url=None,
            binsight_device_id="pi-demo-001",
            binsight_device_shared_secret="demo-secret",
            publication_timeout_seconds=1.0,
            disposal_timeout_seconds=12.0,
            reset_cooldown_seconds=0.0,
        ),
        monotonic_clock=count(0.0, 0.1).__next__,
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=publication_client,
    )

    return runtime, transport, publication_client


def test_live_demo_injects_fake_detection_and_uses_hand_present_then_disappearance() -> None:
    runtime, transport, publication_client = _build_demo_runtime()

    result = run_live_demo(
        runtime,
        predicted_item="plastic bottle",
        guidance_hold_seconds=0.0,
        hand_present_seconds=0.0,
        result_hold_seconds=0.0,
        reset_after_result=True,
    )

    assert transport.sent_frames[0] == "health?"
    assert transport.sent_frames[1] == "indicator:left"
    assert transport.sent_frames[-1] == "indicator:off"
    assert result.predicted_item == "plastic-bottle"
    assert result.guidance_zone == "left"
    assert result.actual_disposal_zone == "left"
    assert result.event is not None
    assert result.event.success is True
    assert result.final_phase == SessionPhase.IDLE.value
    assert result.live_status_count_delta >= 5
    assert result.published_event_count == 1
    assert any(status["current_hand_zone"] == "left" for status in publication_client.published_live_statuses)
    assert publication_client.published_events[-1]["predicted_item"] == "plastic-bottle"
    assert publication_client.published_events[-1]["actual_disposal_zone"] == "left"
    assert publication_client.published_live_statuses[-1]["phase"] == "idle"
    assert result.station_total_attempts == 1
    assert result.station_total_correct_sorts == 1
    assert result.success is True


def test_live_sequence_runs_mixed_correct_and_incorrect_steps() -> None:
    runtime, transport, publication_client = _build_demo_runtime()

    sequence_result = run_live_sequence(
        runtime,
        (
            LiveDemoStep("plastic-bottle", "left", guidance_hold_seconds=0.0, hand_present_seconds=0.0, result_hold_seconds=0.0),
            LiveDemoStep("coffee-cup", "left", guidance_hold_seconds=0.0, hand_present_seconds=0.0, result_hold_seconds=0.0),
            LiveDemoStep("banana-peel", "middle", guidance_hold_seconds=0.0, hand_present_seconds=0.0, result_hold_seconds=0.0),
        ),
        inter_step_seconds=0.0,
    )

    assert [step.event.success for step in sequence_result.steps if step.event is not None] == [True, False, True]
    assert [event["predicted_item"] for event in publication_client.published_events] == [
        "plastic-bottle",
        "coffee-cup",
        "banana-peel",
    ]
    assert [event["actual_disposal_zone"] for event in publication_client.published_events] == [
        "left",
        "left",
        "middle",
    ]
    assert sequence_result.total_attempts == 3
    assert sequence_result.total_correct_sorts == 2
    assert sequence_result.final_phase == SessionPhase.IDLE.value
    assert transport.sent_frames.count("indicator:off") == 3
    assert sequence_result.success is True