import type { EventHistoryResponse } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { FilterControls } from "../features/filters/filter-controls.js";
import { matchesStationFilters } from "../lib/query/dashboard-query.js";

export interface EventHistoryPageModel {
  readonly response: EventHistoryResponse;
  readonly availableFilters: Awaited<ReturnType<typeof loadEventHistoryPage>>["availableFilters"];
  readonly availableStations: Awaited<ReturnType<typeof loadEventHistoryPage>>["availableStations"];
}

export async function loadEventHistoryPage(context: DashboardPageLoadContext): Promise<{
  response: EventHistoryResponse;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"];
}> {
  const [directory, response] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getEventHistory(context.filters)
  ]);

  return {
    response,
    availableFilters: directory.filters,
    availableStations: directory.stations
  };
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function EventHistoryPage(props: {
  readonly model: EventHistoryPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  const visibleStationCount = props.model.availableStations.filter((station) => matchesStationFilters(station, props.context.filters)).length;
  const successCount = props.model.response.entries.filter((entry) => entry.event.attemptResult === "success").length;
  const llmFallbackCount = props.model.response.entries.filter((entry) => entry.event.llmFallbackUsed).length;
  const successRate = props.model.response.entries.length > 0 ? successCount / props.model.response.entries.length : 0;

  return (
    <section className="dashboard-section-stack">
      <article className="dashboard-card dashboard-page-hero">
        <p className="dashboard-page-kicker">Recent scans</p>
        <div className="dashboard-row dashboard-row--baseline">
          <div>
            <h2 className="dashboard-page-title">Event history</h2>
            <p className="dashboard-page-copy">
              Stitch recent-scan styling applied to the existing disposal-history route, filters, and backend cursor contract without masking pagination gaps.
            </p>
          </div>
          <div className="dashboard-chip-row">
            <span className="dashboard-chip dashboard-chip--active">{props.model.response.entries.length} events loaded</span>
            <span className="dashboard-chip">{visibleStationCount} stations in scope</span>
            <span className="dashboard-chip">Time window {props.context.filters.timeRange.label}</span>
          </div>
        </div>
      </article>

      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        availableStations={props.model.availableStations}
        stationCount={visibleStationCount}
      />

      <section className="dashboard-history-summary" aria-label="History summary">
        <article className="dashboard-stat-panel">
          <p className="dashboard-stat-label">First-try rate</p>
          <p className="dashboard-stat-value dashboard-stat-value--compact">{formatPercent(successRate)}</p>
          <p className="dashboard-detail-value">Derived from the currently loaded result page.</p>
        </article>
        <article className="dashboard-stat-panel">
          <p className="dashboard-stat-label">LLM fallback</p>
          <p className="dashboard-stat-value dashboard-stat-value--compact">{llmFallbackCount}</p>
          <p className="dashboard-detail-value">Events where the station required fallback classification.</p>
        </article>
        <article className="dashboard-stat-panel">
          <p className="dashboard-stat-label">Cursor status</p>
          <p className="dashboard-stat-value dashboard-stat-value--compact">{props.model.response.nextCursor ? "More pages" : "Current page complete"}</p>
          <p className="dashboard-detail-value">The redesign preserves the raw backend cursor instead of inventing page navigation.</p>
        </article>
      </section>

      {props.model.response.nextCursor ? (
        <p className="dashboard-status dashboard-status--warning">
          Additional event-history pages exist for this query. The current route preserves the backend cursor contract but does not yet expose cursor navigation in this Stitch redesign. Next cursor: {props.model.response.nextCursor}
        </p>
      ) : (
        <p className="dashboard-note">No additional pages were reported for the current history response.</p>
      )}

      {props.model.response.entries.length > 0 ? (
        <section className="dashboard-history-list" aria-label="Disposal event scan list">
          {props.model.response.entries.map((entry) => (
            <article key={entry.eventId} className="dashboard-scan-row">
              <div className="dashboard-scan-row-top">
                <div>
                  <p className="dashboard-scan-row-heading">{entry.event.predictedItem}</p>
                  <p className="dashboard-scan-row-meta">
                    {formatTimestamp(entry.event.timestamp)} · {entry.station.stationName} · {entry.station.locationLabel}
                  </p>
                </div>
                <span className={`dashboard-chip ${entry.event.attemptResult === "success" ? "dashboard-chip--active" : "dashboard-chip--warning"}`}>
                  {entry.event.attemptResult}
                </span>
              </div>

              <div className="dashboard-scan-row-grid">
                <div>
                  <p className="dashboard-field-label">Correct method</p>
                  <p className="dashboard-scan-row-value">{entry.event.correctDisposalMethod}</p>
                </div>
                <div>
                  <p className="dashboard-field-label">Actual zone</p>
                  <p className="dashboard-scan-row-value">{entry.event.actualDisposalZone}</p>
                </div>
                <div>
                  <p className="dashboard-field-label">Model confidence</p>
                  <p className="dashboard-scan-row-value">{formatPercent(entry.event.modelConfidence)}</p>
                </div>
                <div>
                  <p className="dashboard-field-label">Classification path</p>
                  <p className="dashboard-scan-row-value">{entry.event.llmFallbackUsed ? "LLM fallback used" : "Model only"}</p>
                </div>
              </div>

              <div className="dashboard-inline-pairs">
                <span className="dashboard-inline-pill">Station {entry.station.stationId}</span>
                <span className="dashboard-inline-pill">{entry.station.buildingLabel}</span>
                <span className="dashboard-inline-pill">{entry.station.floorLabel}</span>
                <span className="dashboard-inline-pill">Signage {entry.station.signageVariant}</span>
                <span className="dashboard-inline-pill">Layout {entry.station.layoutVariant}</span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p className="dashboard-status dashboard-status--empty">No disposal events matched the current filters.</p>
      )}
    </section>
  );
}