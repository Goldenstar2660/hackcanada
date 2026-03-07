import type {
  AnalyticsQuery,
  AnalyticsSummary,
  EventHistoryQuery,
  EventHistoryResponse,
  StationDirectoryResponse
} from "@binbuddy/contracts";

export const DASHBOARD_CALLABLE_NAMES = {
  getAnalyticsSummary: "getAnalyticsSummary",
  getEventHistory: "getEventHistory",
  getStationDirectory: "getStationDirectory"
} as const;

export interface CallableApiInvoker {
  call<TRequest, TResponse>(name: string, request: TRequest): Promise<TResponse>;
}

export interface DashboardApiClient {
  getAnalyticsSummary(query: AnalyticsQuery): Promise<AnalyticsSummary>;
  getEventHistory(query: EventHistoryQuery): Promise<EventHistoryResponse>;
  getStationDirectory(): Promise<StationDirectoryResponse>;
}

export function createDashboardApiClient(invoker: CallableApiInvoker): DashboardApiClient {
  return {
    getAnalyticsSummary(query) {
      return invoker.call<AnalyticsQuery, AnalyticsSummary>(DASHBOARD_CALLABLE_NAMES.getAnalyticsSummary, query);
    },

    getEventHistory(query) {
      return invoker.call<EventHistoryQuery, EventHistoryResponse>(DASHBOARD_CALLABLE_NAMES.getEventHistory, query);
    },

    getStationDirectory() {
      return invoker.call<Record<string, never>, StationDirectoryResponse>(
        DASHBOARD_CALLABLE_NAMES.getStationDirectory,
        {}
      );
    }
  };
}
