import type {
  AnalyticsQuery,
  AnalyticsInsightsResponse,
  AnalyticsSummary,
  EventHistoryQuery,
  EventHistoryResponse,
  StationDirectoryResponse
} from "@binsight/contracts";

export const DASHBOARD_CALLABLE_NAMES = {
  getAnalyticsSummary: "getAnalyticsSummary",
  getAnalyticsInsights: "getAnalyticsInsights",
  getEventHistory: "getEventHistory",
  getStationDirectory: "getStationDirectory"
} as const;

export interface CallableApiInvoker {
  call<TRequest, TResponse>(name: string, request: TRequest): Promise<TResponse>;
}

export interface DashboardApiClient {
  getAnalyticsSummary(query: AnalyticsQuery): Promise<AnalyticsSummary>;
  getAnalyticsInsights(query: AnalyticsQuery): Promise<AnalyticsInsightsResponse>;
  getEventHistory(query: EventHistoryQuery): Promise<EventHistoryResponse>;
  getStationDirectory(): Promise<StationDirectoryResponse>;
}

export function createDashboardApiClient(invoker: CallableApiInvoker): DashboardApiClient {
  return {
    getAnalyticsSummary(query) {
      return invoker.call<AnalyticsQuery, AnalyticsSummary>(DASHBOARD_CALLABLE_NAMES.getAnalyticsSummary, query);
    },

    getAnalyticsInsights(query) {
      return invoker.call<AnalyticsQuery, AnalyticsInsightsResponse>(DASHBOARD_CALLABLE_NAMES.getAnalyticsInsights, query);
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
