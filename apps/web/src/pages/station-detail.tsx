import type { EventHistoryEntry, StationRecord } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";
import type { LiveStationSnapshot } from "../lib/firebase/live-monitoring.js";

import { FilterControls } from "../features/filters/filter-controls.js";
import { createUnavailableSnapshot } from "../lib/firebase/live-monitoring.js";
import { serializeDashboardFilters } from "../lib/query/dashboard-query.js";

export interface StationDetailPageModel {
  readonly station: StationRecord | null;
  readonly siblingStations: readonly StationRecord[];
  readonly recentEvents: readonly EventHistoryEntry[];
  readonly liveSnapshot: LiveStationSnapshot;
  readonly availableFilters: Awaited<ReturnType<typeof loadStationDetailPage>>["availableFilters"];
  readonly availableStations: readonly StationRecord[];
}

export async function loadStationDetailPage(context: DashboardPageLoadContext): Promise<{
  station: StationRecord | null;
  siblingStations: readonly StationRecord[];
  recentEvents: readonly EventHistoryEntry[];
  liveSnapshot: LiveStationSnapshot;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: readonly StationRecord[];
}> {
  const directory = await context.providers.api.getStationDirectory();
  const stationId = context.match.params.stationId;
  const station = directory.stations.find((entry) => entry.stationId === stationId) ?? null;
  const siblingStations = station
    ? directory.stations.filter((entry) => entry.floorId === station.floorId && entry.stationId !== station.stationId)
    : [];
  const [recentEvents, liveSnapshot] = station
    ? await Promise.all([
        context.providers.api.getEventHistory({
          ...context.filters,
          stationIds: [station.stationId]
        }).then((response) => response.entries.slice(0, 5)),
        context.providers.live.loadInitialSnapshot(station.stationId).catch(() => createUnavailableSnapshot(station.stationId))
      ])
    : [[], createUnavailableSnapshot(stationId)];

  return {
    station,
    siblingStations,
    recentEvents,
    liveSnapshot,
    availableFilters: directory.filters,
    availableStations: directory.stations
  };
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "No timestamp yet";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatZoneMapping(station: StationRecord): string {
  return `Left ${station.activeRulesPreset.zoneMapping.left}, middle ${station.activeRulesPreset.zoneMapping.middle}, right ${station.activeRulesPreset.zoneMapping.right}`;
}

function formatSessionState(state: string | null | undefined): string {
  return state ? state.replaceAll("-", " ") : "Unavailable";
}

function formatLiveHealth(snapshot: LiveStationSnapshot): string {
  if (!snapshot.status) {
    return "Awaiting live status document";
  }

  return `Pi ${snapshot.status.deviceHealth.pi}, ESP8266 ${snapshot.status.deviceHealth.esp8266}, cloud ${snapshot.status.deviceHealth.cloudSync}`;
}

export function StationDetailPage(props: {
  readonly model: StationDetailPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  const { station, recentEvents, liveSnapshot } = props.model;
  const successfulEvents = recentEvents.filter((entry) => entry.event.attemptResult === "success").length;
  const firstTryRate = recentEvents.length > 0 ? `${Math.round((successfulEvents / recentEvents.length) * 100)}%` : "No events yet";
  const latestEvent = recentEvents[0] ?? null;
  const liveFeedLabel = !liveSnapshot.status ? "Awaiting live feed" : liveSnapshot.stale ? "Feed stale" : "Feed current";
  const liveSessionLabel = formatSessionState(liveSnapshot.status?.sessionState);
  const historyHref = station
    ? `/history?${serializeDashboardFilters({
        ...props.context.filters,
        stationIds: [station.stationId]
      }).toString()}`
    : "/history";

  return (
    <section className="dashboard-section-stack">
      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        availableStations={props.model.availableStations}
        stationCount={1}
      />

      {!station ? (
        <article className="dashboard-card dashboard-directory-empty">
          <p className="dashboard-page-kicker">Device lookup</p>
          <h2 className="dashboard-card-title">Device not found</h2>
          <p className="dashboard-subtitle">The requested device ID is not present in the current directory response.</p>
        </article>
      ) : (
        <>
          <article className="dashboard-card dashboard-page-hero dashboard-device-detail-hero">
            <p className="dashboard-page-kicker">Device details</p>
            <div className="dashboard-row">
              <div>
                <h2 className="dashboard-page-title">{station.stationName}</h2>
                <p className="dashboard-page-copy">{station.buildingLabel}, {station.floorLabel}, {station.locationLabel}</p>
              </div>
              <div className="dashboard-page-actions">
                <a href={historyHref} className="dashboard-button dashboard-button--ghost">Recent history</a>
                <a href={`/devices/${station.stationId}/live`} className="dashboard-button dashboard-button--primary">Secondary live route</a>
                <button type="button" className="dashboard-button dashboard-button--ghost" disabled={true}>New scan unavailable</button>
              </div>
            </div>
            <div className="dashboard-chip-row">
              <span className="dashboard-chip dashboard-chip--active">{station.stationId}</span>
              <span className={`dashboard-chip ${liveSnapshot.stale || !liveSnapshot.status ? "dashboard-chip--warning" : "dashboard-chip--active"}`}>{liveFeedLabel}</span>
              <span className="dashboard-chip">Session {liveSessionLabel}</span>
              <span className="dashboard-chip dashboard-chip--warning">Always-on detection only</span>
            </div>
          </article>

          <section className="dashboard-data-grid" aria-label="Station detail summary">
            <article className="dashboard-stat-panel">
              <p className="dashboard-stat-label">Live session</p>
              <p className="dashboard-stat-value">{liveSessionLabel}</p>
              <p className="dashboard-detail-value">Primary device details now include a bounded live snapshot beside recent scan history.</p>
            </article>
            <article className="dashboard-stat-panel">
              <p className="dashboard-stat-label">Recent scans</p>
              <p className="dashboard-stat-value">{recentEvents.length}</p>
              <p className="dashboard-detail-value">Filtered by the current route query and pinned to this station.</p>
            </article>
            <article className="dashboard-stat-panel">
              <p className="dashboard-stat-label">First-try rate</p>
              <p className="dashboard-stat-value">{firstTryRate}</p>
              <p className="dashboard-detail-value">Uses the recent station event slice available through the backend history seam.</p>
            </article>
            <article className="dashboard-stat-panel">
              <p className="dashboard-stat-label">Latest item</p>
              <p className="dashboard-stat-value">{latestEvent?.event.predictedItem ?? "Awaiting data"}</p>
              <p className="dashboard-detail-value">{latestEvent ? formatTimestamp(latestEvent.event.timestamp) : "No recent event in scope"}</p>
            </article>
            <article className="dashboard-stat-panel">
              <p className="dashboard-stat-label">Last live update</p>
              <p className="dashboard-stat-value">{formatTimestamp(liveSnapshot.statusTimestamp)}</p>
              <p className="dashboard-detail-value">
                {liveSnapshot.statusAgeMs !== null ? `${Math.round(liveSnapshot.statusAgeMs / 1000)} seconds old` : "Waiting for the first realtime signal"}
              </p>
            </article>
          </section>

          <FilterControls
            actionPath={props.context.match.path}
            filters={props.context.filters}
            availableFilters={props.model.availableFilters}
            availableStations={props.model.availableStations}
            stationCount={1}
          />

          <section className="dashboard-detail-layout">
            <div className="dashboard-section-stack">
              <article className="dashboard-card dashboard-card--dark dashboard-device-live-card">
                <div className="dashboard-row dashboard-row--baseline">
                  <div>
                    <h3 className="dashboard-card-title">Live device state</h3>
                    <p className="dashboard-dark-muted">The primary device route now carries live status context, while the dedicated live route remains available for continuous monitoring.</p>
                  </div>
                  <span className={`dashboard-chip ${liveSnapshot.stale || !liveSnapshot.status ? "dashboard-chip--warning" : "dashboard-chip--active"}`}>{liveFeedLabel}</span>
                </div>

                <div className="dashboard-device-live-visual">
                  <div className="dashboard-device-live-visual-panel">
                    {liveSnapshot.status ? (
                      <>
                        <p className="dashboard-field-label">Current interpretation</p>
                        <p className="dashboard-stat-value dashboard-stat-value--compact">{liveSnapshot.status.currentDetectedItem ?? "No current item"}</p>
                        <p className="dashboard-detail-value dashboard-detail-value--light">
                          {liveSnapshot.status.currentDisposalMethod
                            ? `Guiding to ${liveSnapshot.status.currentDisposalMethod}`
                            : "Waiting for a disposal decision from the current session."}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="dashboard-field-label">Live status</p>
                        <p className="dashboard-stat-value dashboard-stat-value--compact">Awaiting signal</p>
                        <p className="dashboard-detail-value dashboard-detail-value--light">No live status document has arrived for this device yet.</p>
                      </>
                    )}
                  </div>

                  <div className="dashboard-device-live-facts">
                    <article className="dashboard-device-live-fact">
                      <p className="dashboard-field-label">Session state</p>
                      <p className="dashboard-detail-value dashboard-detail-value--light">{liveSessionLabel}</p>
                    </article>
                    <article className="dashboard-device-live-fact">
                      <p className="dashboard-field-label">Hand zone</p>
                      <p className="dashboard-detail-value dashboard-detail-value--light">{liveSnapshot.status?.currentHandZone ?? "Unknown"}</p>
                    </article>
                    <article className="dashboard-device-live-fact">
                      <p className="dashboard-field-label">Latest event</p>
                      <p className="dashboard-detail-value dashboard-detail-value--light">{liveSnapshot.status?.latestEvent?.predictedItem ?? "No live event yet"}</p>
                    </article>
                    <article className="dashboard-device-live-fact">
                      <p className="dashboard-field-label">Device health</p>
                      <p className="dashboard-detail-value dashboard-detail-value--light">{formatLiveHealth(liveSnapshot)}</p>
                    </article>
                  </div>
                </div>
              </article>

              <article className="dashboard-card">
                <div className="dashboard-row dashboard-row--baseline">
                  <div>
                    <h3 className="dashboard-card-title">Recent scans</h3>
                    <p className="dashboard-subtitle">Recent scan rows are still sourced from the existing event-history seam and pinned to this device.</p>
                  </div>
                  <a href={historyHref} className="dashboard-link">Open full history</a>
                </div>

                {recentEvents.length > 0 ? (
                  <div className="dashboard-section-stack">
                    {recentEvents.map((entry) => (
                      <article key={entry.eventId} className="dashboard-scan-row">
                        <div className="dashboard-scan-row-top">
                          <div>
                            <p className="dashboard-scan-row-heading">{entry.event.predictedItem}</p>
                            <p className="dashboard-scan-row-meta">{formatTimestamp(entry.event.timestamp)} · {entry.event.correctDisposalMethod}</p>
                          </div>
                          <span className={`dashboard-chip ${entry.event.attemptResult === "success" ? "dashboard-chip--active" : "dashboard-chip--warning"}`}>
                            {entry.event.attemptResult}
                          </span>
                        </div>

                        <div className="dashboard-scan-row-grid">
                          <div>
                            <p className="dashboard-field-label">Actual zone</p>
                            <p className="dashboard-scan-row-value">{entry.event.actualDisposalZone}</p>
                          </div>
                          <div>
                            <p className="dashboard-field-label">Confidence</p>
                            <p className="dashboard-scan-row-value">{Math.round(entry.event.modelConfidence * 100)}%</p>
                          </div>
                          <div>
                            <p className="dashboard-field-label">Classification path</p>
                            <p className="dashboard-scan-row-value">{entry.event.llmFallbackUsed ? "LLM fallback" : "Model only"}</p>
                          </div>
                        </div>

                        <div className="dashboard-inline-pairs">
                          <span className="dashboard-inline-pill">Station {entry.station.stationId}</span>
                          <span className="dashboard-inline-pill">{entry.station.locationLabel}</span>
                          <span className="dashboard-inline-pill">Signage {entry.station.signageVariant}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-status dashboard-status--empty">No recent disposal events matched this station and the current filter range.</p>
                )}
              </article>
            </div>

            <div className="dashboard-section-stack">
              <article className="dashboard-card">
                <div className="dashboard-row dashboard-row--baseline">
                  <div>
                    <h3 className="dashboard-card-title">Device overview</h3>
                    <p className="dashboard-subtitle">Station metadata, rules context, and live feed availability mapped into the device-details layout.</p>
                  </div>
                </div>

                <div className="dashboard-metadata-grid">
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Location</p>
                    <p className="dashboard-stat-value dashboard-stat-value--compact">{station.locationLabel}</p>
                    <p className="dashboard-detail-value">{station.buildingLabel}, {station.floorLabel}</p>
                  </div>
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Rules preset</p>
                    <p className="dashboard-stat-value dashboard-stat-value--compact">{station.activeRulesPreset.presetId}</p>
                    <p className="dashboard-detail-value">Threshold {station.activeRulesPreset.lowConfidenceThreshold}</p>
                  </div>
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Jurisdiction</p>
                    <p className="dashboard-stat-value dashboard-stat-value--compact">{station.activeRulesPreset.jurisdiction.city}</p>
                    <p className="dashboard-detail-value">{station.activeRulesPreset.jurisdiction.provinceOrState}</p>
                  </div>
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Zone mapping</p>
                    <p className="dashboard-detail-value">{formatZoneMapping(station)}</p>
                  </div>
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Camera feed</p>
                    <p className="dashboard-detail-value">{liveSnapshot.status?.cameraFeed?.status ?? "unavailable"}</p>
                  </div>
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Storage path</p>
                    <p className="dashboard-detail-value">{liveSnapshot.status?.cameraFeed?.storageObjectPath ?? "No image path exposed"}</p>
                  </div>
                </div>
              </article>

              <article className="dashboard-card">
                <h3 className="dashboard-card-title">Deferred controls</h3>
                <div className="dashboard-device-deferred-grid">
                  <article className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Manual new scan</p>
                    <p className="dashboard-detail-value">Deferred by design. Detection remains always-on when an item is presented.</p>
                  </article>
                  <article className="dashboard-metadata-card">
                    <p className="dashboard-field-label">AI summary</p>
                    <p className="dashboard-detail-value">No verified backend or contract exists for generated device summaries yet.</p>
                  </article>
                  <article className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Embedded playback</p>
                    <p className="dashboard-detail-value">Live camera metadata is available, but frame rendering remains future development.</p>
                  </article>
                </div>
              </article>

              <article className="dashboard-card">
                <h3 className="dashboard-card-title">Nearby devices</h3>
                {props.model.siblingStations.length > 0 ? (
                  <div className="dashboard-sibling-grid">
                    {props.model.siblingStations.map((siblingStation) => (
                      <a key={siblingStation.stationId} href={`/devices/${siblingStation.stationId}`} className="dashboard-sibling-card">
                        <span className="dashboard-field-label">{siblingStation.floorLabel}</span>
                        <strong>{siblingStation.stationName}</strong>
                        <span className="dashboard-detail-value">{siblingStation.locationLabel}</span>
                        <span className="dashboard-detail-value">Signage {siblingStation.signageVariant} / Layout {siblingStation.layoutVariant}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-status dashboard-status--empty">No sibling devices were found on this floor for comparison.</p>
                )}
              </article>
            </div>
          </section>
        </>
      )}
    </section>
  );
}