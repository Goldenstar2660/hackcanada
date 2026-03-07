import type { AnalyticsSummary } from "@binbuddy/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { AnalyticsSummaryPanel } from "../features/analytics/analytics-summary-panel.js";
import { FilterControls } from "../features/filters/filter-controls.js";

export interface AnalyticsPageModel {
  readonly summary: AnalyticsSummary;
  readonly availableFilters: Awaited<ReturnType<typeof loadAnalyticsPage>>["availableFilters"];
}

export async function loadAnalyticsPage(context: DashboardPageLoadContext): Promise<{
  summary: AnalyticsSummary;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
}> {
  const [directory, summary] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getAnalytics(context.filters, {
      groupBy: ["buildingId"],
      timeBucket: "day"
    })
  ]);

  return {
    summary,
    availableFilters: directory.filters
  };
}

export function AnalyticsPage(props: {
  readonly model: AnalyticsPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  return (
    <section>
      <FilterControls filters={props.context.filters} availableFilters={props.model.availableFilters} />
      <AnalyticsSummaryPanel summary={props.model.summary} />
    </section>
  );
}