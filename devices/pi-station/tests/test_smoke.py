from binbuddy_station.classification import ClassificationResult
from binbuddy_station.events import create_disposal_event
from binbuddy_station.main import StationRuntime, load_runtime_settings
from binbuddy_station.rules import load_rules_preset
from binbuddy_station.session import SessionPhase, SessionStateMachine


class StubClassifier:
    def __init__(self, *results: ClassificationResult) -> None:
        self._results = list(results)
        self.calls = 0

    def classify(self, request: object) -> ClassificationResult:
        del request
        if self.calls >= len(self._results):
            raise AssertionError("classifier was called more times than expected")

        result = self._results[self.calls]
        self.calls += 1
        return result


def test_runtime_loads_settings_and_starts_session() -> None:
    runtime = StationRuntime(load_runtime_settings())

    snapshot, status = runtime.start_session()

    assert snapshot.phase == SessionPhase.WAITING_FOR_DISPOSAL
    assert status.station_id == runtime.settings.station_id
    assert snapshot.correct_disposal_method in {"recycle", "compost", "garbage"}


def test_session_records_drop_on_hand_disappearance() -> None:
    session = SessionStateMachine()
    session.begin_detection()
    session.set_guidance("plastic-bottle", "recycle", 0.97, False)

    session.track_hand(zone="left", hand_present=True)
    snapshot = session.track_hand(zone="left", hand_present=False)

    assert snapshot.phase == SessionPhase.COMPLETE
    assert snapshot.actual_disposal_zone == "left"


def test_runtime_preserves_original_guidance_for_successful_drop() -> None:
    runtime = StationRuntime(load_runtime_settings())
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    snapshot, _ = runtime.start_session(image_source="camera://first")
    drop_snapshot, event = runtime.observe_disposal(
        zone="left",
        classification_image_source="camera://should-not-be-used",
    )

    assert runtime.classifier.calls == 1
    assert snapshot.predicted_item == "plastic-bottle"
    assert snapshot.correct_disposal_method == "recycle"
    assert drop_snapshot.actual_disposal_zone == "left"
    assert event is not None
    assert event.predicted_item == "plastic-bottle"
    assert event.actual_disposal_zone == "left"
    assert event.success is True


def test_event_creation_marks_failed_drop_when_zone_maps_to_wrong_method() -> None:
    preset = load_rules_preset("demo-v1")
    session = SessionStateMachine()
    session.begin_detection()
    session.set_guidance("plastic-bottle", "recycle", 0.97, False)
    session.track_hand(zone="middle", hand_present=True)
    snapshot = session.track_hand(zone="middle", hand_present=False)

    event = create_disposal_event("demo-station-001", snapshot, preset)

    assert event.actual_disposal_zone == "middle"
    assert event.correct_disposal_method == "recycle"
    assert event.success is False
