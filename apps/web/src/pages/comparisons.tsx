import type { DashboardPageLoadContext } from "../app/types.js";

import { ComparisonOverview } from "../features/comparisons/comparison-overview.js";
import { FilterControls } from "../features/filters/filter-controls.js";

export interface ComparisonsPageModel {
  readonly analyses: Awaited<ReturnType<typeof loadComparisonsPage>>["analyses"];
  readonly availableFilters: Awaited<ReturnType<typeof loadComparisonsPage>>["availableFilters"];
  readonly availableStations: Awaited<ReturnType<typeof loadComparisonsPage>>["availableStations"];
}

export async function loadComparisonsPage(context: DashboardPageLoadContext): Promise<{
  analyses: Awaited<ReturnType<typeof context.providers.api.getComparisons>>;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"];
}> {
  const [directory, analyses] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getComparisons(context.filters)
  ]);

  return {
    analyses,
    availableFilters: directory.filters,
    availableStations: directory.stations
  };
}

export function ComparisonsPage(props: {
  readonly model: ComparisonsPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  return (
    <section>
      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        availableStations={props.model.availableStations}
      />
      <ComparisonOverview analyses={props.model.analyses} />
    </section>
  );
}