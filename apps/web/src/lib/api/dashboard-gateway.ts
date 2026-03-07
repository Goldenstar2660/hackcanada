import type {
  AnalyticsSummary,
  EventHistoryResponse,
  StationDirectoryResponse
} from "@binsight/contracts";

import type { Functions } from "firebase/functions";

import type { CallableApiInvoker, DashboardApiClient } from "./dashboard-api.js";
import type {
  AnalyticsRequestOptions,
  ComparisonScenarioDefinition,
  DashboardFilterState
} from "../query/dashboard-query.js";

import {
  createAnalyticsRequest,
  createComparisonScenarioDefinitions,
  createEventHistoryRequest
} from "../query/dashboard-query.js";
import { httpsCallable } from "firebase/functions";

export interface ComparisonAnalysisResult {
  readonly scenario: ComparisonScenarioDefinition;
  readonly summary: AnalyticsSummary;
}

export interface OperatorDashboardGateway {
  getStationDirectory(): Promise<StationDirectoryResponse>;
  getEventHistory(filters: DashboardFilterState): Promise<EventHistoryResponse>;
  getAnalytics(filters: DashboardFilterState, options?: AnalyticsRequestOptions): Promise<AnalyticsSummary>;
  getComparisons(filters: DashboardFilterState): Promise<readonly ComparisonAnalysisResult[]>;
}

export function createFirebaseCallableInvoker(functions: Functions): CallableApiInvoker {
  return {
    async call<TRequest, TResponse>(name: string, request: TRequest): Promise<TResponse> {
      const callable = httpsCallable<TRequest, TResponse>(functions, name);
      const response = await callable(request);
      return response.data;
    }
  };
}

export function createOperatorDashboardGateway(client: DashboardApiClient): OperatorDashboardGateway {
  return {
    getStationDirectory() {
      return client.getStationDirectory();
    },

    getEventHistory(filters) {
      return client.getEventHistory(createEventHistoryRequest(filters));
    },

    getAnalytics(filters, options) {
      return client.getAnalyticsSummary(createAnalyticsRequest(filters, options));
    },

    async getComparisons(filters) {
      const scenarios = createComparisonScenarioDefinitions(filters);
      return Promise.all(
        scenarios.map(async (scenario) => ({
          scenario,
          summary: await client.getAnalyticsSummary(scenario.request)
        }))
      );
    }
  };
}