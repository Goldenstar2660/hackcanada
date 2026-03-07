import type { EventHistoryQuery, EventHistoryResponse } from "@binsight/contracts";
import type { DashboardQueryService } from "../analytics/query-service.js";
import type { CallableHandler } from "./runtime.js";

import { assertOperatorIdentity } from "../auth/operator-auth.js";
import { assertEventHistoryQuery } from "../domain/validation.js";

export interface GetEventHistoryDependencies {
  readonly queryService: DashboardQueryService;
}

export function createGetEventHistoryHandler(
  dependencies: GetEventHistoryDependencies
): CallableHandler<EventHistoryQuery, EventHistoryResponse> {
  return async (requestData, context) => {
    assertOperatorIdentity(context.auth);
    assertEventHistoryQuery(requestData);
    return dependencies.queryService.getEventHistory(requestData);
  };
}
