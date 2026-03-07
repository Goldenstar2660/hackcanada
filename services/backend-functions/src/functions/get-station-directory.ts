import type { StationDirectoryResponse } from "@binbuddy/contracts";
import type { DashboardQueryService } from "../analytics/query-service.js";
import type { CallableHandler } from "./runtime.js";

import { assertOperatorIdentity } from "../auth/operator-auth.js";

export interface GetStationDirectoryDependencies {
  readonly queryService: DashboardQueryService;
}

export function createGetStationDirectoryHandler(
  dependencies: GetStationDirectoryDependencies
): CallableHandler<Record<string, never> | undefined, StationDirectoryResponse> {
  return async (_requestData, context) => {
    assertOperatorIdentity(context.auth);
    return dependencies.queryService.getStationDirectory();
  };
}
