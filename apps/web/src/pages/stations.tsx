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
  return (
    <section>
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