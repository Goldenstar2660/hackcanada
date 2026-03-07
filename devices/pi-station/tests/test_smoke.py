from binbuddy_station.events import create_disposal_event
from binbuddy_station.main import StationRuntime, load_runtime_settings
from binbuddy_station.rules import load_rules_preset
from binbuddy_station.session import SessionPhase, SessionStateMachine


def test_runtime_loads_settings_and_starts_session() -> None:
    runtime = StationRuntime(load_runtime_settings())

    snapshot, status = runtime.start_session()

    assert snapshot.phase == SessionPhase.WAITING_FOR_DISPOSAL
    assert status.station_id == runtime.settings.station_id
    assert snapshot.correct_disposal_method in {"recycle", "compost", "garbage"}


def test_session_records_drop_on_hand_disappearance() -> None:
    session = SessionStateMachine()
    session.begin_detection()
    session.set_guidance("plastic-bottle", "recycle")

    session.track_hand(zone="left", hand_present=True)
    snapshot = session.track_hand(zone="left", hand_present=False)

    assert snapshot.phase == SessionPhase.COMPLETE
    assert snapshot.actual_disposal_zone == "left"


def test_rules_and_event_creation_follow_live_loop_contract() -> None:
    preset = load_rules_preset("demo-v1")
    runtime = StationRuntime(load_runtime_settings())
    runtime.session.begin_detection()
    runtime.session.set_guidance("plastic-bottle", preset.disposal_method_for_item("plastic-bottle"))
    runtime.session.track_hand(zone="left", hand_present=True)
    snapshot = runtime.session.track_hand(zone="left", hand_present=False)

    classification = runtime.classifier.classify(
        request=type(
            "Request",
            (),
            {"image_source": "camera://placeholder", "confidence_threshold": runtime.settings.low_confidence_threshold},
        )()
    )
    event = create_disposal_event(runtime.settings.station_id, snapshot, classification)

    assert event.predicted_item
    assert event.actual_disposal_zone == "left"
    assert isinstance(event.success, bool)