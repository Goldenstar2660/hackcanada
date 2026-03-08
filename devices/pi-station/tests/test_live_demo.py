from binsight_station.esp_client import EspClient, MemoryEspTransport
from binsight_station.live_demo import run_live_demo
from binsight_station.main import RuntimeSettings, StationRuntime
from binsight_station.publishers import PublicationAdapter
from binsight_station.session import SessionPhase


def test_live_demo_injects_fake_detection_and_drives_real_runtime_seams() -> None:
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
            esp_endpoint="serial://test",
            firebase_project_id="test-project",
            firebase_functions_region="us-central1",
            firebase_functions_base_url=None,
            binsight_device_id="pi-demo-001",
            binsight_device_shared_secret="demo-secret",
            publication_timeout_seconds=1.0,
            presence_debounce_seconds=0.35,
            disposal_timeout_seconds=12.0,
            reset_cooldown_seconds=0.0,
        ),
        monotonic_clock=iter([0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]).__next__,
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=publication_client,
    )

    result = run_live_demo(
        runtime,
        predicted_item="plastic bottle",
        guidance_hold_seconds=0.0,
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
    assert result.published_live_status_count >= 3
    assert result.published_event_count == 1
    assert publication_client.published_events[-1]["predicted_item"] == "plastic-bottle"
    assert publication_client.published_events[-1]["actual_disposal_zone"] == "left"
    assert publication_client.published_live_statuses[-1]["phase"] == "idle"
    assert result.success is True