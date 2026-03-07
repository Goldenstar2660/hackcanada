import type { EventHistoryResponse } from "@binbuddy/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { EventHistoryPanel } from "../features/events/event-history-panel.js";
import { FilterControls } from "../features/filters/filter-controls.js";

export interface EventHistoryPageModel {
  readonly response: EventHistoryResponse;
  readonly availableFilters: Awaited<ReturnType<typeof loadEventHistoryPage>>["availableFilters"];
}

export async function loadEventHistoryPage(context: DashboardPageLoadContext): Promise<{
  response: EventHistoryResponse;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
}> {
  const [directory, response] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getEventHistory(context.filters)
  ]);

  return {
    response,
    availableFilters: directory.filters
  };
}

export function EventHistoryPage(props: {
  readonly model: EventHistoryPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  return (
    <section>
      <FilterControls
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        stationCount={props.model.response.entries.length}
      />
      <EventHistoryPanel response={props.model.response} />
    </section>
  );
}