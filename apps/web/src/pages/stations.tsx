import type { StationDirectoryResponse } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { FilterControls } from "../features/filters/filter-controls.js";
import { StationDirectory } from "../features/stations/station-directory.js";
import { matchesStationFilters } from "../lib/query/dashboard-query.js";

function countActiveFilterGroups(context: DashboardPageLoadContext["filters"]): number {
  return [
    context.stationIds.length,
    context.buildingIds.length,
    context.floorIds.length,
    context.locationLabels.length,
    context.signageVariants.length,
    context.layoutVariants.length
  ].filter((count) => count > 0).length;
}

function createDirectoryHighlights(context: DashboardPageLoadContext["filters"]): readonly string[] {
  const highlights = [
    ...context.buildingIds.map((value) => `Building ${value}`),
    ...context.floorIds.map((value) => `Floor ${value}`),
    ...context.locationLabels,
    ...context.signageVariants.map((value) => `Signage ${value}`),
    ...context.layoutVariants.map((value) => `Layout ${value}`)
  ];

  if (highlights.length === 0) {
    return ["All devices"];
  }

  return highlights.length > 4
    ? [...highlights.slice(0, 4), `+${highlights.length - 4} more`]
    : highlights;
}

export interface StationsPageModel {
  readonly directory: StationDirectoryResponse;
  readonly visibleStations: readonly StationDirectoryResponse["stations"][number][];
}

export async function loadStationsPage(context: DashboardPageLoadContext): Promise<StationsPageModel> {
  const directory = await context.providers.api.getStationDirectory();

  return {
    directory,
    visibleStations: directory.stations.filter((station) => matchesStationFilters(station, context.filters))
  };
}

export function StationsPage(props: { readonly model: StationsPageModel; readonly context: DashboardPageLoadContext }): JSX.Element {
  const buildingCount = new Set(props.model.visibleStations.map((station) => station.buildingId)).size;
  const floorCount = new Set(props.model.visibleStations.map((station) => `${station.buildingId}:${station.floorId}`)).size;
  const activeFilterGroups = countActiveFilterGroups(props.context.filters);
  const directoryHighlights = createDirectoryHighlights(props.context.filters);

  return (
    <section className="dashboard-section-stack">
      <article className="dashboard-card dashboard-page-hero dashboard-device-directory-hero">
        <div className="dashboard-row dashboard-row--baseline">
          <div>
            <p className="dashboard-page-kicker">Devices</p>
            <h2 className="dashboard-page-title">{props.model.visibleStations.length} current active devices</h2>
            <div className="dashboard-device-directory-status">
              <span className="dashboard-device-status-dot" aria-hidden="true" />
              <p className="dashboard-page-copy dashboard-page-copy--tight">
                Directory-backed fleet view. Realtime health and current-session monitoring stay on each device route.
              </p>
            </div>
          </div>
          <button type="button" className="dashboard-button dashboard-device-hero-button" disabled={true}>
            Register new device
          </button>
        </div>

        <section className="dashboard-device-summary-grid" aria-label="Fleet summary">
          <article className="dashboard-stat-panel">
            <p className="dashboard-stat-label">Visible devices</p>
            <p className="dashboard-stat-value">{props.model.visibleStations.length}</p>
            <p className="dashboard-detail-value">Current station-directory response after route-backed filters are applied.</p>
          </article>
          <article className="dashboard-stat-panel">
            <p className="dashboard-stat-label">Facilities in scope</p>
            <p className="dashboard-stat-value">{buildingCount}</p>
            <p className="dashboard-detail-value">{floorCount} floors remain in the visible fleet slice.</p>
          </article>
          <article className="dashboard-stat-panel">
            <p className="dashboard-stat-label">Filter state</p>
            <p className="dashboard-stat-value">{activeFilterGroups === 0 ? "Open" : activeFilterGroups}</p>
            <p className="dashboard-detail-value">
              {activeFilterGroups === 0 ? "All directory dimensions are visible." : "Route filters are narrowing the fleet view."}
            </p>
          </article>
        </section>

        <div className="dashboard-device-filter-bar" aria-label="Visible device scope">
          {directoryHighlights.map((highlight) => (
            <span key={highlight} className="dashboard-device-filter-pill">{highlight}</span>
          ))}
        </div>
      </article>

      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.directory.filters}
        availableStations={props.model.directory.stations}
        stationCount={props.model.visibleStations.length}
      />

      <StationDirectory stations={props.model.visibleStations} />
    </section>
  );
}