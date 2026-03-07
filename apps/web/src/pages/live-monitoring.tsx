import type { DashboardPageLoadContext } from "../app/types.js";

import { FilterControls } from "../features/filters/filter-controls.js";
import { LiveStationPanel } from "../features/live/live-station-panel.js";

export interface LiveMonitoringPageModel {
  readonly station: Awaited<ReturnType<typeof loadLiveMonitoringPage>>["station"];
  readonly snapshot: Awaited<ReturnType<typeof loadLiveMonitoringPage>>["snapshot"];
  readonly availableFilters: Awaited<ReturnType<typeof loadLiveMonitoringPage>>["availableFilters"];
  readonly availableStations: Awaited<ReturnType<typeof loadLiveMonitoringPage>>["availableStations"];
}

export async function loadLiveMonitoringPage(context: DashboardPageLoadContext): Promise<{
  station: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"][number] | null;
  snapshot: Awaited<ReturnType<typeof context.providers.live.createSnapshot>>;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"];
}> {
  const stationId = context.match.params.stationId;
  const directory = await context.providers.api.getStationDirectory();
  const station = directory.stations.find((entry) => entry.stationId === stationId) ?? null;
  const snapshot = station
    ? await context.providers.live.loadInitialSnapshot(stationId).catch(() => context.providers.live.createSnapshot(stationId, null))
    : await context.providers.live.createSnapshot(stationId, null);

  return {
    station,
    snapshot,
    availableFilters: directory.filters,
    availableStations: directory.stations
  };
}

export function LiveMonitoringPage(props: {
  readonly model: LiveMonitoringPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  return (
    <section>
      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        availableStations={props.model.availableStations}
        stationCount={1}
      />
      <LiveStationPanel station={props.model.station} snapshot={props.model.snapshot} />
    </section>
  );
}