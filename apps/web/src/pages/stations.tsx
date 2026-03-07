import type { StationDirectoryResponse } from "@binbuddy/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { FilterControls } from "../features/filters/filter-controls.js";
import { StationDirectory } from "../features/stations/station-directory.js";

export interface StationsPageModel {
  readonly directory: StationDirectoryResponse;
}

export async function loadStationsPage(context: DashboardPageLoadContext): Promise<StationsPageModel> {
  return {
    directory: await context.providers.api.getStationDirectory()
  };
}

export function StationsPage(props: { readonly model: StationsPageModel; readonly context: DashboardPageLoadContext }): JSX.Element {
  return (
    <section>
      <FilterControls
        filters={props.context.filters}
        availableFilters={props.model.directory.filters}
        stationCount={props.model.directory.stations.length}
      />
      <StationDirectory stations={props.model.directory.stations} />
    </section>
  );
}