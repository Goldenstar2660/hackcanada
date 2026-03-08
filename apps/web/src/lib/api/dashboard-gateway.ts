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

const FILTER_ARRAY_KEYS = [
  "stationIds",
  "buildingIds",
  "floorIds",
  "locationLabels",
  "signageVariants",
  "layoutVariants"
] as const satisfies readonly (keyof DashboardFilterState)[];

function normalizeFilterArrayValues(values: unknown): readonly string[] {
  if (typeof values === "string") {
    const normalized = values.trim();
    return normalized.length > 0 ? [normalized] : [];
  }

  if (!values || typeof values !== "object" || !(Symbol.iterator in values)) {
    return [];
  }

  const normalizedValues: string[] = [];
  for (const value of values as Iterable<unknown>) {
    if (typeof value !== "string") {
      continue;
    }

    const normalized = value.trim();
    if (normalized.length > 0) {
      normalizedValues.push(normalized);
    }
  }

  return [...new Set(normalizedValues)].sort((left, right) => left.localeCompare(right));
}

function normalizeDashboardGatewayFilters(filters: DashboardFilterState): DashboardFilterState {
  const normalizedFilters = {
    ...filters
  } as Record<keyof DashboardFilterState, DashboardFilterState[keyof DashboardFilterState]>;

  for (const key of FILTER_ARRAY_KEYS) {
    normalizedFilters[key] = normalizeFilterArrayValues(filters[key]) as DashboardFilterState[keyof DashboardFilterState];
  }

  return normalizedFilters as DashboardFilterState;
}

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
  let stationDirectoryPromise: Promise<StationDirectoryResponse> | null = null;

  return {
    getStationDirectory() {
      if (!stationDirectoryPromise) {
        stationDirectoryPromise = client.getStationDirectory().catch((error) => {
          stationDirectoryPromise = null;
          throw error;
        });
      }

      return stationDirectoryPromise;
    },

    getEventHistory(filters) {
      return client.getEventHistory(createEventHistoryRequest(normalizeDashboardGatewayFilters(filters)));
    },

    getAnalytics(filters, options) {
      return client.getAnalyticsSummary(createAnalyticsRequest(normalizeDashboardGatewayFilters(filters), options));
    },

    async getComparisons(filters) {
      const scenarios = createComparisonScenarioDefinitions(normalizeDashboardGatewayFilters(filters));
      return Promise.all(
        scenarios.map(async (scenario) => ({
          scenario,
          summary: await client.getAnalyticsSummary(scenario.request)
        }))
      );
    }
  };
}