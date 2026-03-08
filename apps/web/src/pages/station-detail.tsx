import type { EventHistoryEntry, StationRecord } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { serializeDashboardFilters } from "../lib/query/dashboard-query.js";

export interface StationDetailPageModel {
  readonly station: StationRecord | null;
  readonly recentEvents: readonly EventHistoryEntry[];
}

export async function loadStationDetailPage(context: DashboardPageLoadContext): Promise<{
  station: StationRecord | null;
  recentEvents: readonly EventHistoryEntry[];
}> {
  const directory = await context.providers.api.getStationDirectory();
  const stationId = context.match.params.stationId;
  const station = directory.stations.find((entry) => entry.stationId === stationId) ?? null;
  const recentEvents = station
    ? await context.providers.api.getEventHistory({
        ...context.filters,
        stationIds: [station.stationId]
      }).then((response) => response.entries.slice(0, 5))
    : [];

  return {
    station,
    recentEvents
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
              </div>
            </div>
            <div className="dashboard-chip-row">
              <span className="dashboard-chip dashboard-chip--active">{station.stationId}</span>
              <span className="dashboard-chip">{station.locationLabel}</span>
              <span className="dashboard-chip">{station.activeRulesPreset.presetId}</span>
            </div>
          </article>

          <section className="dashboard-data-grid" aria-label="Station detail summary">
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
          </section>

          <section className="dashboard-detail-layout">
            <div className="dashboard-section-stack">
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
                    <p className="dashboard-subtitle">Station metadata and rules context mapped into the device-details layout.</p>
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
                </div>
              </article>
            </div>
          </section>
        </>
      )}
    </section>
  );
}