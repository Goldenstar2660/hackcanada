from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from .classification import ClassificationPipeline, ClassificationRequest
from .esp_client import EspClient, GuidanceCommand
from .events import DisposalEvent, create_disposal_event
from .live_status import LiveStatus, LiveStatusPublisher
from .rules import RulesPreset, load_rules_preset
from .session import SessionSnapshot, SessionStateMachine


@dataclass(slots=True)
class RuntimeSettings:
    station_id: str
    low_confidence_threshold: float
    rules_preset_version: str
    esp_endpoint: str
    firebase_project_id: str


def load_runtime_settings() -> RuntimeSettings:
    project_root = Path(__file__).resolve().parents[2]
    load_dotenv(project_root / ".env")

    return RuntimeSettings(
        station_id=os.getenv("STATION_ID", "demo-station-001"),
        low_confidence_threshold=float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.65")),
        rules_preset_version=os.getenv("RULES_PRESET_VERSION", "demo-v1"),
        esp_endpoint=os.getenv("ESP_ENDPOINT", "udp://127.0.0.1:4210"),
        firebase_project_id=os.getenv("FIREBASE_PROJECT_ID", "binbuddy-demo"),
    )


class StationRuntime:
    def __init__(self, settings: RuntimeSettings) -> None:
        self.settings = settings
        self.rules: RulesPreset = load_rules_preset(settings.rules_preset_version)
        self.session = SessionStateMachine()
        self.classifier = ClassificationPipeline()
        self.esp_client = EspClient(settings.esp_endpoint)
        self.live_status_publisher = LiveStatusPublisher()

    def start_session(self, image_source: str = "camera://placeholder") -> tuple[SessionSnapshot, LiveStatus]:
        self.session.begin_detection()
        classification = self.classifier.classify(
            ClassificationRequest(
                image_source=image_source,
                confidence_threshold=self.settings.low_confidence_threshold,
            )
        )
        disposal_method = self.rules.disposal_method_for_item(classification.predicted_item)
        snapshot = self.session.set_guidance(
            classification.predicted_item,
            disposal_method,
            classification.confidence,
            classification.llm_fallback_used,
        )
        self.esp_client.send_guidance(
            GuidanceCommand(
                disposal_method=disposal_method,
                predicted_item=classification.predicted_item,
            )
        )
        return snapshot, self.live_status_publisher.build_status(self.settings.station_id, snapshot)

    def observe_disposal(
        self,
        zone: str,
        classification_image_source: str = "camera://placeholder",
    ) -> tuple[SessionSnapshot, DisposalEvent | None]:
        del classification_image_source
        self.session.track_hand(zone=zone, hand_present=True)
        snapshot = self.session.track_hand(zone=zone, hand_present=False)
        event = None
        if snapshot.actual_disposal_zone is not None:
            event = create_disposal_event(self.settings.station_id, snapshot, self.rules)
        return snapshot, event


def main() -> int:
    runtime = StationRuntime(load_runtime_settings())
    snapshot, status = runtime.start_session()
    print(
        f"station={status.station_id} phase={status.phase} item={snapshot.predicted_item} "
        f"disposal={snapshot.correct_disposal_method}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
