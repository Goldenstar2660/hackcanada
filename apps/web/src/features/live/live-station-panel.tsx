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

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "No timestamp yet";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatSessionState(state: string | null | undefined): string {
  return state ? state.replaceAll("-", " ") : "unavailable";
}

export function LiveStationPanel(props: LiveStationPanelProps): JSX.Element {
  const stationName = props.station?.stationName ?? props.snapshot.stationId;
  const latestEvent = props.snapshot.status?.latestEvent ?? null;
  const cameraFeed = props.snapshot.status?.cameraFeed ?? null;
  const liveHealth = renderDeviceHealth(props.snapshot);

  return (
    <section className="dashboard-section-stack">
      <article className="dashboard-card dashboard-page-hero">
        <p className="dashboard-page-kicker">Live monitoring</p>
        <div className="dashboard-row">
          <div>
            <h2 className="dashboard-page-title">{stationName}</h2>
            <p className="dashboard-page-copy">
              Firestore-backed live state for {stationName}. Historical analytics and station directory data stay behind backend APIs.
            </p>
          </div>
          <div className="dashboard-page-actions">
            <a href={`/stations/${props.snapshot.stationId}`} className="dashboard-button dashboard-button--ghost">Station detail</a>
          </div>
        </div>
        <div className="dashboard-chip-row">
          <span className={`dashboard-chip ${props.snapshot.stale ? "dashboard-chip--warning" : "dashboard-chip--active"}`}>
            {props.snapshot.stale ? "Feed stale" : "Feed current"}
          </span>
          <span className="dashboard-chip">Session {formatSessionState(props.snapshot.status?.sessionState)}</span>
          <span className="dashboard-chip">{props.realtimeEnabled ? "Realtime subscribed" : "Realtime unavailable"}</span>
          <span className="dashboard-chip dashboard-chip--warning">Always-on detection, no manual scan trigger</span>
        </div>
      </article>

      <section className="dashboard-data-grid" aria-label="Live station summary">
        <article className="dashboard-stat-panel">
          <p className="dashboard-stat-label">Session state</p>
          <p className="dashboard-stat-value">{formatSessionState(props.snapshot.status?.sessionState)}</p>
          <p className="dashboard-detail-value">Current session phase from the live-status document.</p>
        </article>
        <article className="dashboard-stat-panel">
          <p className="dashboard-stat-label">Detected item</p>
          <p className="dashboard-stat-value">{props.snapshot.status?.currentDetectedItem ?? "No current item"}</p>
          <p className="dashboard-detail-value">Reflects the latest active classification result.</p>
        </article>
        <article className="dashboard-stat-panel">
          <p className="dashboard-stat-label">Disposal decision</p>
          <p className="dashboard-stat-value">{props.snapshot.status?.currentDisposalMethod ?? "Waiting"}</p>
          <p className="dashboard-detail-value">The currently guided disposal method for the in-progress session.</p>
        </article>
        <article className="dashboard-stat-panel">
          <p className="dashboard-stat-label">Latest update</p>
          <p className="dashboard-stat-value">{formatTimestamp(props.snapshot.statusTimestamp)}</p>
          <p className="dashboard-detail-value">
            {props.snapshot.statusAgeMs !== null ? `${Math.round(props.snapshot.statusAgeMs / 1000)} seconds old` : "Waiting for the first live timestamp"}
          </p>
        </article>
      </section>

      <section className="dashboard-live-layout">
        <article className="dashboard-card dashboard-card--dark">
          <h3 className="dashboard-card-title">Current live interpretation</h3>
          <p className="dashboard-dark-muted">
            The product spec requires live device status, current session state, detected item, disposal decision, and latest event. Those fields remain present here even without embedded camera media.
          </p>
          <div className="dashboard-camera-shell">
            <div className="dashboard-camera-placeholder">
              {props.snapshot.stale
                ? "Live updates are stale. Confirm the Pi publisher and Firestore connectivity."
                : props.snapshot.status
                  ? "Live updates are current. Operators can monitor the text-first feed during the demo."
                  : "Waiting for the first live status document from the station."}
            </div>
            <dl className="dashboard-definition-grid">
              <div>
                <dt className="dashboard-field-label">Camera feed status</dt>
                <dd className="dashboard-detail-value dashboard-detail-value--light">{cameraFeed?.status ?? "unavailable"}</dd>
              </div>
              <div>
                <dt className="dashboard-field-label">Camera feed active</dt>
                <dd className="dashboard-detail-value dashboard-detail-value--light">{props.snapshot.status?.cameraFeedActive ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="dashboard-field-label">Current hand zone</dt>
                <dd className="dashboard-detail-value dashboard-detail-value--light">{props.snapshot.status?.currentHandZone ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="dashboard-field-label">Storage path</dt>
                <dd className="dashboard-detail-value dashboard-detail-value--light">{cameraFeed?.storageObjectPath ?? "No image path exposed"}</dd>
              </div>
            </dl>
          </div>
        </article>

        <div className="dashboard-section-stack">
          <article className="dashboard-card">
            <h3 className="dashboard-card-title">Latest event</h3>
            {latestEvent ? (
              <div className="dashboard-timeline">
                <article className="dashboard-timeline-item">
                  <div className="dashboard-timeline-top">
                    <div>
                      <p className="dashboard-timeline-title">{latestEvent.predictedItem}</p>
                      <p className="dashboard-timeline-meta">{formatTimestamp(latestEvent.timestamp)}</p>
                    </div>
                    <span className={`dashboard-chip ${latestEvent.attemptResult === "success" ? "dashboard-chip--active" : "dashboard-chip--warning"}`}>
                      {latestEvent.attemptResult}
                    </span>
                  </div>
                  <div className="dashboard-inline-pairs">
                    <span className="dashboard-inline-pill">Correct: {latestEvent.correctDisposalMethod}</span>
                    <span className="dashboard-inline-pill">Actual zone: {latestEvent.actualDisposalZone}</span>
                  </div>
                </article>
              </div>
            ) : (
              <p className="dashboard-status dashboard-status--empty">No live event has been published for this station yet.</p>
            )}
          </article>

          <article className="dashboard-card">
            <h3 className="dashboard-card-title">Station health</h3>
            <p className="dashboard-muted">{liveHealth}</p>
            <div className="dashboard-chip-row">
              <span className="dashboard-chip">Pi {props.snapshot.status?.deviceHealth.pi ?? "unknown"}</span>
              <span className="dashboard-chip">ESP8266 {props.snapshot.status?.deviceHealth.esp8266 ?? "unknown"}</span>
              <span className="dashboard-chip">Cloud {props.snapshot.status?.deviceHealth.cloudSync ?? "unknown"}</span>
            </div>
            {props.station ? (
              <p className="dashboard-note">
                Active rules preset {props.station.activeRulesPreset.presetId} with threshold {props.station.activeRulesPreset.lowConfidenceThreshold}
              </p>
            ) : null}
          </article>
        </div>
      </section>
    </section>
  );
}