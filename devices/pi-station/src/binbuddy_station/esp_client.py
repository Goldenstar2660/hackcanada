from __future__ import annotations

from dataclasses import dataclass


BACKEND_DEVICE_ID_HEADER = "x-binbuddy-device-id"
BACKEND_STATION_ID_HEADER = "x-binbuddy-station-id"
BACKEND_TIMESTAMP_HEADER = "x-binbuddy-timestamp"
BACKEND_SIGNATURE_HEADER = "x-binbuddy-signature"


@dataclass(slots=True)
class GuidanceCommand:
    disposal_method: str
    predicted_item: str


@dataclass(slots=True)
class BackendIngressIdentity:
    device_id: str
    station_id: str
    shared_secret: str

    def build_headers(self, timestamp: str) -> dict[str, str]:
        signature = f"binbuddy-v1:{self.device_id}:{self.station_id}:{timestamp}:{self.shared_secret}"
        return {
            BACKEND_DEVICE_ID_HEADER: self.device_id,
            BACKEND_STATION_ID_HEADER: self.station_id,
            BACKEND_TIMESTAMP_HEADER: timestamp,
            BACKEND_SIGNATURE_HEADER: signature,
        }


class EspClient:
    """Placeholder seam for translating Pi guidance into a local ESP command."""

    def __init__(self, endpoint: str) -> None:
        self.endpoint = endpoint
        self.last_command: GuidanceCommand | None = None

    def send_guidance(self, command: GuidanceCommand) -> None:
        self.last_command = command
