import type { StationRecord } from "@binsight/contracts";

import type { LiveStationSnapshot } from "../../lib/firebase/live-monitoring.js";

export interface LiveStationPanelProps {
  readonly station: StationRecord | null;
  readonly snapshot: LiveStationSnapshot;
  readonly realtimeEnabled?: boolean;
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
          <div>
            <strong>Last update</strong>
            <p className="dashboard-detail-value">
              {props.snapshot.statusTimestamp ?? "No live timestamp yet"}
            </p>
          </div>
        </div>

        {props.realtimeEnabled ? (
          <p className="dashboard-note">
            Firestore subscription active{props.snapshot.statusAgeMs !== null ? `, latest update age ${Math.round(props.snapshot.statusAgeMs / 1000)}s.` : "."}
          </p>
        ) : null}
      </article>

      <article className="dashboard-card dashboard-card--dark">
        <h3 className="dashboard-card-title">Current live interpretation</h3>
        <p className="dashboard-dark-muted">
          Camera media is intentionally omitted. Operators get session state, item guidance, disposal intent, and latest event text in real time.
        </p>
        <div className="dashboard-media-placeholder">
          {props.snapshot.stale
            ? "Live updates are stale. Confirm the Pi publisher and Firestore connectivity."
            : props.snapshot.status
              ? "Live updates are current. Continue monitoring the text feed during the demo."
              : "Waiting for the first live status document from the station."}
        </div>
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