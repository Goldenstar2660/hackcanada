import type { StationDirectoryResponse } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { FilterControls } from "../features/filters/filter-controls.js";
import { StationDirectory } from "../features/stations/station-directory.js";
import { matchesStationFilters } from "../lib/query/dashboard-query.js";

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

  return (
    <section className="dashboard-section-stack">
      <article className="dashboard-card dashboard-page-hero">
        <p className="dashboard-page-kicker">Station directory</p>
        <div className="dashboard-row dashboard-row--baseline">
          <div>
            <h2 className="dashboard-page-title">{props.model.visibleStations.length} active station profiles</h2>
            <p className="dashboard-page-copy">
              Browse the station fleet using the Stitch devices layout, while preserving the current route-backed filters and drill-down paths.
            </p>
          </div>
          <div className="dashboard-chip-row" aria-label="Directory summary">
            <span className="dashboard-chip dashboard-chip--active">{buildingCount} buildings</span>
            <span className="dashboard-chip">{floorCount} floors</span>
            <span className="dashboard-chip">Realtime status lives on each station route</span>
          </div>
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