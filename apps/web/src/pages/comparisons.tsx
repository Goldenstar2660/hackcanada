import type { DashboardPageLoadContext } from "../app/types.js";

import { ComparisonOverview } from "../features/comparisons/comparison-overview.js";
import { FilterControls } from "../features/filters/filter-controls.js";

export interface ComparisonsPageModel {
  readonly analyses: Awaited<ReturnType<typeof loadComparisonsPage>>["analyses"];
  readonly availableFilters: Awaited<ReturnType<typeof loadComparisonsPage>>["availableFilters"];
}

export async function loadComparisonsPage(context: DashboardPageLoadContext): Promise<{
  analyses: Awaited<ReturnType<typeof context.providers.api.getComparisons>>;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
}> {
  const [directory, analyses] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getComparisons(context.filters)
  ]);

  return {
    analyses,
    availableFilters: directory.filters
  };
}

export function ComparisonsPage(props: {
  readonly model: ComparisonsPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  return (
    <section>
      <FilterControls filters={props.context.filters} availableFilters={props.model.availableFilters} />
      <ComparisonOverview analyses={props.model.analyses} />
    </section>
  );
}