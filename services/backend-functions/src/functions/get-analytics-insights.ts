import type { AnalyticsInsightsResponse, AnalyticsQuery } from "@binsight/contracts";
import type { DashboardQueryService } from "../analytics/query-service.js";
import type { AnalyticsInsightsGenerator } from "../ai/analytics-insights.js";
import type { CallableHandler } from "./runtime.js";

import { assertAnalyticsQuery } from "../domain/validation.js";
import { assertOperatorIdentity } from "../auth/operator-auth.js";

export interface GetAnalyticsInsightsDependencies {
  readonly queryService: DashboardQueryService;
  readonly insightsGenerator: AnalyticsInsightsGenerator;
}

export function createGetAnalyticsInsightsHandler(
  dependencies: GetAnalyticsInsightsDependencies
): CallableHandler<AnalyticsQuery, AnalyticsInsightsResponse> {
  return async (requestData, context) => {
    assertOperatorIdentity(context.auth);
    assertAnalyticsQuery(requestData);
    const summary = await dependencies.queryService.getAnalyticsSummary(requestData);
    return dependencies.insightsGenerator.generate(summary);
  };
}