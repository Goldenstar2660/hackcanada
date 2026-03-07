from __future__ import annotations

from dataclasses import dataclass

from .session import SessionSnapshot


@dataclass(slots=True)
class LiveStatus:
    station_id: str
    phase: str
    predicted_item: str | None
    disposal_method: str | None


class LiveStatusPublisher:
    """Publishes station state to a cloud-facing seam without binding to Firebase yet."""

    def build_status(self, station_id: str, snapshot: SessionSnapshot) -> LiveStatus:
        return LiveStatus(
            station_id=station_id,
            phase=snapshot.phase.value,
            predicted_item=snapshot.predicted_item,
            disposal_method=snapshot.correct_disposal_method,
        )
