import type { AnalyticsQuery, AnalyticsSummary } from "@binbuddy/contracts";
import type { DashboardQueryService } from "../analytics/query-service.js";
import type { CallableHandler } from "./runtime.js";

import { assertAnalyticsQuery } from "../domain/validation.js";
import { assertOperatorIdentity } from "../auth/operator-auth.js";

export interface GetAnalyticsSummaryDependencies {
  readonly queryService: DashboardQueryService;
}

export function createGetAnalyticsSummaryHandler(
  dependencies: GetAnalyticsSummaryDependencies
): CallableHandler<AnalyticsQuery, AnalyticsSummary> {
  return async (requestData, context) => {
    assertOperatorIdentity(context.auth);
    assertAnalyticsQuery(requestData);
    return dependencies.queryService.getAnalyticsSummary(requestData);
  };
}
