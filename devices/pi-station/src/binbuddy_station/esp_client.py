from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class GuidanceCommand:
    disposal_method: str
    predicted_item: str


class EspClient:
    """Placeholder seam for translating Pi guidance into a local ESP command."""

    def __init__(self, endpoint: str) -> None:
        self.endpoint = endpoint
        self.last_command: GuidanceCommand | None = None

    def send_guidance(self, command: GuidanceCommand) -> None:
        self.last_command = command
