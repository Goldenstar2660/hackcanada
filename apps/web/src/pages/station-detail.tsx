import type { EventHistoryEntry, StationRecord } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { FilterControls } from "../features/filters/filter-controls.js";
import { serializeDashboardFilters } from "../lib/query/dashboard-query.js";

export interface StationDetailPageModel {
  readonly station: StationRecord | null;
  readonly siblingStations: readonly StationRecord[];
  readonly recentEvents: readonly EventHistoryEntry[];
  readonly availableFilters: Awaited<ReturnType<typeof loadStationDetailPage>>["availableFilters"];
  readonly availableStations: readonly StationRecord[];
}

export async function loadStationDetailPage(context: DashboardPageLoadContext): Promise<{
  station: StationRecord | null;
  siblingStations: readonly StationRecord[];
  recentEvents: readonly EventHistoryEntry[];
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: readonly StationRecord[];
}> {
  const directory = await context.providers.api.getStationDirectory();
  const stationId = context.match.params.stationId;
  const station = directory.stations.find((entry) => entry.stationId === stationId) ?? null;
  const siblingStations = station
    ? directory.stations.filter((entry) => entry.floorId === station.floorId && entry.stationId !== station.stationId)
    : [];
  const recentEvents = station
    ? (await context.providers.api.getEventHistory({
        ...context.filters,
        stationIds: [station.stationId]
      })).entries.slice(0, 5)
    : [];

  return {
    station,
    siblingStations,
    recentEvents,
    availableFilters: directory.filters,
    availableStations: directory.stations
  };
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatZoneMapping(station: StationRecord): string {
  return `Left ${station.activeRulesPreset.zoneMapping.left}, middle ${station.activeRulesPreset.zoneMapping.middle}, right ${station.activeRulesPreset.zoneMapping.right}`;
}

export function StationDetailPage(props: {
  readonly model: StationDetailPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  const { station, recentEvents } = props.model;
  const successfulEvents = recentEvents.filter((entry) => entry.event.attemptResult === "success").length;
  const firstTryRate = recentEvents.length > 0 ? `${Math.round((successfulEvents / recentEvents.length) * 100)}%` : "No events yet";
  const latestEvent = recentEvents[0] ?? null;
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
          <p className="dashboard-page-kicker">Station lookup</p>
          <h2 className="dashboard-card-title">Station not found</h2>
          <p className="dashboard-subtitle">The requested station ID is not present in the current directory response.</p>
        </article>
      ) : (
        <>
          <article className="dashboard-card dashboard-page-hero">
            <p className="dashboard-page-kicker">Station detail</p>
            <div className="dashboard-row">
              <div>
                <h2 className="dashboard-page-title">{station.stationName}</h2>
                <p className="dashboard-page-copy">{station.buildingLabel}, {station.floorLabel}, {station.locationLabel}</p>
              </div>
              <div className="dashboard-page-actions">
                <a href={historyHref} className="dashboard-button dashboard-button--ghost">Recent history</a>
                <a href={`/stations/${station.stationId}/live`} className="dashboard-button dashboard-button--primary">Open live view</a>
              </div>
            </div>
            <div className="dashboard-chip-row">
              <span className="dashboard-chip dashboard-chip--active">{station.stationId}</span>
              <span className="dashboard-chip">Signage {station.signageVariant}</span>
              <span className="dashboard-chip">Layout {station.layoutVariant}</span>
              <span className="dashboard-chip dashboard-chip--warning">Always-on detection only</span>
            </div>
          </article>

          <section className="dashboard-data-grid" aria-label="Station detail summary">
            <article className="dashboard-stat-panel">
              <p className="dashboard-stat-label">Recent attempts</p>
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
              <p className="dashboard-stat-label">Rules preset</p>
              <p className="dashboard-stat-value">{station.activeRulesPreset.presetId}</p>
              <p className="dashboard-detail-value">Threshold {station.activeRulesPreset.lowConfidenceThreshold}</p>
            </article>
          </section>

          <section className="dashboard-detail-layout">
            <div className="dashboard-section-stack">
              <article className="dashboard-card">
                <div className="dashboard-row dashboard-row--baseline">
                  <div>
                    <h3 className="dashboard-card-title">Station metadata</h3>
                    <p className="dashboard-subtitle">Stitch-style diagnostics mapped onto the current station contract.</p>
                  </div>
                </div>
                <div className="dashboard-metadata-grid">
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Jurisdiction</p>
                    <p className="dashboard-stat-value dashboard-stat-value--compact">
                      {station.activeRulesPreset.jurisdiction.city}
                    </p>
                    <p className="dashboard-detail-value">{station.activeRulesPreset.jurisdiction.provinceOrState}</p>
                  </div>
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Zone mapping</p>
                    <p className="dashboard-detail-value">{formatZoneMapping(station)}</p>
                  </div>
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Supported items</p>
                    <p className="dashboard-detail-value">{station.activeRulesPreset.version} active on {station.activeRulesPreset.presetId}</p>
                  </div>
                  <div className="dashboard-metadata-card">
                    <p className="dashboard-field-label">Operator note</p>
                    <p className="dashboard-detail-value">Manual New Scan actions are not supported. Detection begins as soon as an item is presented.</p>
                  </div>
                </div>
              </article>

              <article className="dashboard-card">
                <div className="dashboard-row dashboard-row--baseline">
                  <div>
                    <h3 className="dashboard-card-title">Recent disposal events</h3>
                    <p className="dashboard-subtitle">A compact event strip derived from the existing history API instead of a new detail-only data path.</p>
                  </div>
                  <a href={historyHref} className="dashboard-link">Open full history</a>
                </div>

                {recentEvents.length > 0 ? (
                  <div className="dashboard-timeline">
                    {recentEvents.map((entry) => (
                      <article key={entry.eventId} className="dashboard-timeline-item">
                        <div className="dashboard-timeline-top">
                          <div>
                            <p className="dashboard-timeline-title">{entry.event.predictedItem}</p>
                            <p className="dashboard-timeline-meta">{formatTimestamp(entry.event.timestamp)}</p>
                          </div>
                          <span className={`dashboard-chip ${entry.event.attemptResult === "success" ? "dashboard-chip--active" : "dashboard-chip--warning"}`}>
                            {entry.event.attemptResult}
                          </span>
                        </div>
                        <div className="dashboard-inline-pairs">
                          <span className="dashboard-inline-pill">Correct: {entry.event.correctDisposalMethod}</span>
                          <span className="dashboard-inline-pill">Actual zone: {entry.event.actualDisposalZone}</span>
                          <span className="dashboard-inline-pill">Confidence: {Math.round(entry.event.modelConfidence * 100)}%</span>
                          <span className="dashboard-inline-pill">{entry.event.llmFallbackUsed ? "LLM fallback used" : "Model-only classification"}</span>
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
              <article className="dashboard-card dashboard-card--dark">
                <h3 className="dashboard-card-title">Diagnostics</h3>
                <p className="dashboard-dark-muted">This detail route stays metadata-first. Realtime state, stale handling, and live event hydration stay on the dedicated live route.</p>
                <div className="dashboard-media-placeholder dashboard-media-placeholder--dark">
                  Always-on detection active. Open the live route to monitor current session state, detected item, disposal decision, and latest event in real time.
                </div>
              </article>

              <article className="dashboard-card">
                <h3 className="dashboard-card-title">Nearby comparison set</h3>
                {props.model.siblingStations.length > 0 ? (
                  <div className="dashboard-sibling-grid">
                    {props.model.siblingStations.map((siblingStation) => (
                      <a key={siblingStation.stationId} href={`/stations/${siblingStation.stationId}`} className="dashboard-sibling-card">
                        <span className="dashboard-field-label">{siblingStation.floorLabel}</span>
                        <strong>{siblingStation.stationName}</strong>
                        <span className="dashboard-detail-value">{siblingStation.locationLabel}</span>
                        <span className="dashboard-detail-value">Signage {siblingStation.signageVariant} / Layout {siblingStation.layoutVariant}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-status dashboard-status--empty">No sibling stations were found on this floor for comparison.</p>
                )}
              </article>
            </div>
          </section>
        </>
      )}
    </section>
  );
}