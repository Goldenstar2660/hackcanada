from time import monotonic

from binsight_station.simulation import RealtimeSimulationScenario, run_realtime_simulation


def test_realtime_simulation_happy_path_reaches_esp_and_backend_in_wall_clock_time() -> None:
    scenario = RealtimeSimulationScenario(
        predicted_item="aluminum-can",
        disposal_zone="left",
        disposal_timeout_seconds=1.0,
        reset_cooldown_seconds=0.08,
        tick_interval_seconds=0.04,
        hand_hold_seconds=0.12,
        max_duration_seconds=3.0,
    )

    started_at = monotonic()
    result = run_realtime_simulation(scenario)
    elapsed = monotonic() - started_at

    result.assert_success()
    assert result.elapsed_wall_clock_seconds >= 0.24
    assert elapsed >= 0.24
    assert result.classifier_calls == 1
    assert result.backend_event_count == 1
    assert result.backend_live_status_count >= 4
    assert result.esp_signal_history[0] == "left"
    assert result.esp_signal_history[-1] == "off"
    assert result.latest_event is not None
    assert result.latest_event["predicted_item"] == "aluminum-can"
    assert result.latest_event["actual_disposal_zone"] == "left"
    assert result.latest_event["success"] is True
    assert result.latest_live_status is not None
    assert result.latest_live_status["phase"] == "idle"
    assert "waiting-for-disposal" in result.live_status_phases
    assert "idle" in result.live_status_phases