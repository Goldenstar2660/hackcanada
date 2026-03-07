import type { StationRecord } from "@binbuddy/contracts";

import type { LiveStationSnapshot } from "../../lib/firebase/live-monitoring.js";

export interface LiveStationPanelProps {
  readonly station: StationRecord | null;
  readonly snapshot: LiveStationSnapshot;
}

function renderDeviceHealth(snapshot: LiveStationSnapshot): string {
  if (!snapshot.status) {
    return "No live status document received yet.";
  }

  const { deviceHealth } = snapshot.status;
  return `Pi ${deviceHealth.pi}, ESP8266 ${deviceHealth.esp8266}, cloud sync ${deviceHealth.cloudSync}`;
}

export function LiveStationPanel(props: LiveStationPanelProps): JSX.Element {
  const stationName = props.station?.stationName ?? props.snapshot.stationId;

  return (
    <section className="dashboard-section-stack">
      <article className="dashboard-card">
        <div className="dashboard-row">
          <div>
            <h2 className="dashboard-card-title">Live station monitoring</h2>
            <p className="dashboard-subtitle">
              Firestore-backed live state for {stationName}. Historical analytics and directory data stay behind backend APIs.
            </p>
          </div>
          <a href={`/stations/${props.snapshot.stationId}`} className="dashboard-link">
            Return to station detail
          </a>
        </div>

        <div className="dashboard-grid dashboard-grid--stats">
          <div>
            <strong>Session state</strong>
            <p className="dashboard-detail-value">{props.snapshot.status?.sessionState ?? "unavailable"}</p>
          </div>
          <div>
            <strong>Detected item</strong>
            <p className="dashboard-detail-value">{props.snapshot.status?.currentDetectedItem ?? "No current item"}</p>
          </div>
          <div>
            <strong>Disposal decision</strong>
            <p className="dashboard-detail-value">{props.snapshot.status?.currentDisposalMethod ?? "Waiting"}</p>
          </div>
          <div>
            <strong>Latest event</strong>
            <p className="dashboard-detail-value">
              {props.snapshot.status?.latestEvent
                ? `${props.snapshot.status.latestEvent.predictedItem} -> ${props.snapshot.status.latestEvent.correctDisposalMethod} (${props.snapshot.status.latestEvent.attemptResult})`
                : "No live event yet"}
            </p>
          </div>
        </div>
      </article>

      <article className="dashboard-card dashboard-card--dark">
        <h3 className="dashboard-card-title">Current camera frame</h3>
        <p className="dashboard-dark-muted">
          {props.snapshot.cameraFeed.message} Stale threshold: {Math.round(props.snapshot.cameraFeed.staleAfterMs / 1000)} seconds.
        </p>
        {props.snapshot.cameraFeed.imageUrl ? (
          <img
            src={props.snapshot.cameraFeed.imageUrl}
            alt={`Latest camera frame for ${stationName}`}
            className="dashboard-media"
          />
        ) : (
          <div className="dashboard-media-placeholder">
            Camera feed status: {props.snapshot.cameraFeed.status}
          </div>
        )}
      </article>

      <article className="dashboard-card">
        <h3 className="dashboard-card-title">Station health</h3>
        <p className="dashboard-muted">{renderDeviceHealth(props.snapshot)}</p>
        {props.station ? (
          <p className="dashboard-note">
            Active rules preset {props.station.activeRulesPreset.presetId} with threshold {props.station.activeRulesPreset.lowConfidenceThreshold}
          </p>
        ) : null}
      </article>
    </section>
  );
}