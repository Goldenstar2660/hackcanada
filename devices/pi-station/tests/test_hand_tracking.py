from binsight_station.camera_capture import CapturedImageSource
from binsight_station.hand_tracking import HandLandmarkObservation, MediaPipeHandsTracker
from binsight_station.session import SessionPhase, SessionSnapshot


class StaticImageSourceProvider:
    def __init__(self, image_source: str = "camera://frame") -> None:
        self.image_source = image_source
        self.calls = 0

    def capture_image_source(self) -> CapturedImageSource:
        self.calls += 1
        return CapturedImageSource(self.image_source)


class SequencedHandDetector:
    def __init__(self, *observations: HandLandmarkObservation) -> None:
        self._observations = iter(observations)
        self.closed = False

    def detect(self, image_source: str) -> HandLandmarkObservation:
        del image_source
        return next(self._observations)

    def close(self) -> None:
        self.closed = True


def test_mediapipe_tracker_debounces_hand_disappearance() -> None:
    provider = StaticImageSourceProvider()
    detector = SequencedHandDetector(
        HandLandmarkObservation(hand_present=True, zone="left", normalized_x=0.2),
        HandLandmarkObservation(hand_present=False),
        HandLandmarkObservation(hand_present=False),
    )
    tracker = MediaPipeHandsTracker(
        image_source_provider=provider,
        detector=detector,
        absence_frame_threshold=2,
    )
    waiting_snapshot = SessionSnapshot(
        phase=SessionPhase.WAITING_FOR_DISPOSAL,
        hand_present=False,
    )

    present_observation = tracker.observe(snapshot=waiting_snapshot)
    debounced_observation = tracker.observe(
        snapshot=SessionSnapshot(
            phase=SessionPhase.WAITING_FOR_DISPOSAL,
            hand_present=True,
            latest_hand_zone="left",
        )
    )
    absent_observation = tracker.observe(
        snapshot=SessionSnapshot(
            phase=SessionPhase.WAITING_FOR_DISPOSAL,
            hand_present=True,
            latest_hand_zone="left",
        )
    )

    assert present_observation is not None
    assert present_observation.hand_present is True
    assert present_observation.zone == "left"
    assert debounced_observation is not None
    assert debounced_observation.hand_present is True
    assert debounced_observation.zone == "left"
    assert absent_observation is not None
    assert absent_observation.hand_present is False
    assert absent_observation.zone is None


def test_mediapipe_tracker_ignores_absent_frames_before_any_hand() -> None:
    provider = StaticImageSourceProvider()
    detector = SequencedHandDetector(HandLandmarkObservation(hand_present=False))
    tracker = MediaPipeHandsTracker(
        image_source_provider=provider,
        detector=detector,
    )

    observation = tracker.observe(
        snapshot=SessionSnapshot(
            phase=SessionPhase.WAITING_FOR_DISPOSAL,
            hand_present=False,
        )
    )

    assert observation is None
    assert provider.calls == 1
    tracker.close()
    assert detector.closed is True