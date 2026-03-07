import type {
  AnalyticsGroupingDimension,
  AnalyticsQuery,
  EventHistoryQuery,
  MetricKey
} from "@binbuddy/contracts";

export interface DashboardTimeRange {
  readonly start: string;
  readonly end: string;
  readonly label: string;
}

export interface DashboardFilterState {
  readonly stationIds: readonly string[];
  readonly buildingIds: readonly string[];
  readonly floorIds: readonly string[];
  readonly locationLabels: readonly string[];
  readonly signageVariants: readonly string[];
  readonly layoutVariants: readonly string[];
  readonly timeRange: DashboardTimeRange;
}

export interface AnalyticsRequestOptions {
  readonly metrics?: readonly MetricKey[];
  readonly groupBy?: readonly AnalyticsGroupingDimension[];
  readonly compareBy?: AnalyticsGroupingDimension | null;
  readonly timeBucket?: "hour" | "day";
}

export interface ComparisonScenarioDefinition {
  readonly id: "building" | "location" | "signage-variant" | "layout-variant" | "before-after" | "a-b";
  readonly label: string;
  readonly description: string;
  readonly request: AnalyticsQuery;
}

export const DEFAULT_ANALYTICS_METRICS = [
  "totalAttempts",
  "totalCorrectSorts",
  "firstTryCorrectRate",
  "participationComplianceScore",
  "topContaminationItems",
  "worstTimesOfDay",
  "binPurityByDay",
  "floorLeaderboard",
  "buildingLeaderboard"
] as const satisfies readonly MetricKey[];

function toIsoRange(now: Date, days: number, label: string): DashboardTimeRange {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label
  };
}

function uniqueSorted(values: readonly string[] | undefined): readonly string[] {
  if (!values || values.length === 0) {
    return [];
  }

  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function createDefaultDashboardTimeRange(now: Date = new Date()): DashboardTimeRange {
  return toIsoRange(now, 7, "Last 7 days");
}

export function createDefaultDashboardFilters(now: Date = new Date()): DashboardFilterState {
  return {
    stationIds: [],
    buildingIds: [],
    floorIds: [],
    locationLabels: [],
    signageVariants: [],
    layoutVariants: [],
    timeRange: createDefaultDashboardTimeRange(now)
  };
}

export function normalizeDashboardFilters(
  filters: Partial<DashboardFilterState> | undefined,
  now: Date = new Date()
): DashboardFilterState {
  return {
    stationIds: uniqueSorted(filters?.stationIds),
    buildingIds: uniqueSorted(filters?.buildingIds),
    floorIds: uniqueSorted(filters?.floorIds),
    locationLabels: uniqueSorted(filters?.locationLabels),
    signageVariants: uniqueSorted(filters?.signageVariants),
    layoutVariants: uniqueSorted(filters?.layoutVariants),
    timeRange: filters?.timeRange ?? createDefaultDashboardTimeRange(now)
  };
}

export function serializeDashboardFilters(filters: DashboardFilterState): URLSearchParams {
  const params = new URLSearchParams();
  const entries: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["stationId", filters.stationIds],
    ["buildingId", filters.buildingIds],
    ["floorId", filters.floorIds],
    ["location", filters.locationLabels],
    ["signage", filters.signageVariants],
    ["layout", filters.layoutVariants]
  ];

  for (const [key, values] of entries) {
    for (const value of values) {
      params.append(key, value);
    }
  }

  params.set("timeStart", filters.timeRange.start);
  params.set("timeEnd", filters.timeRange.end);
  params.set("timeLabel", filters.timeRange.label);

  return params;
}

export function createEventHistoryRequest(filters: DashboardFilterState): EventHistoryQuery {
  return {
    timeRange: filters.timeRange,
    stationIds: filters.stationIds.length > 0 ? filters.stationIds : undefined,
    buildingIds: filters.buildingIds.length > 0 ? filters.buildingIds : undefined,
    floorIds: filters.floorIds.length > 0 ? filters.floorIds : undefined,
    locationLabels: filters.locationLabels.length > 0 ? filters.locationLabels : undefined,
    signageVariants: filters.signageVariants.length > 0 ? filters.signageVariants : undefined,
    layoutVariants: filters.layoutVariants.length > 0 ? filters.layoutVariants : undefined,
    pageSize: 50
  };
}

export function createAnalyticsRequest(
  filters: DashboardFilterState,
  options: AnalyticsRequestOptions = {}
): AnalyticsQuery {
  const metrics = options.metrics && options.metrics.length > 0
    ? ([...options.metrics] as [MetricKey, ...MetricKey[]])
    : ([...DEFAULT_ANALYTICS_METRICS] as [MetricKey, ...MetricKey[]]);

  return {
    timeRange: filters.timeRange,
    stationIds: filters.stationIds.length > 0 ? filters.stationIds : undefined,
    buildingIds: filters.buildingIds.length > 0 ? filters.buildingIds : undefined,
    floorIds: filters.floorIds.length > 0 ? filters.floorIds : undefined,
    locationLabels: filters.locationLabels.length > 0 ? filters.locationLabels : undefined,
    signageVariants: filters.signageVariants.length > 0 ? filters.signageVariants : undefined,
    layoutVariants: filters.layoutVariants.length > 0 ? filters.layoutVariants : undefined,
    metrics,
    groupBy: options.groupBy,
    compareBy: options.compareBy,
    timeBucket: options.timeBucket
  };
}

export function createComparisonScenarioDefinitions(
  filters: DashboardFilterState
): readonly ComparisonScenarioDefinition[] {
  return [
    {
      id: "building",
      label: "Building comparison",
      description: "Compare participation and purity across buildings.",
      request: createAnalyticsRequest(filters, {
        compareBy: "buildingId",
        groupBy: ["buildingId"],
        timeBucket: "day"
      })
    },
    {
      id: "location",
      label: "Location comparison",
      description: "Compare exits, food areas, and other location groupings.",
      request: createAnalyticsRequest(filters, {
        compareBy: "locationLabel",
        groupBy: ["locationLabel"],
        timeBucket: "day"
      })
    },
    {
      id: "signage-variant",
      label: "Signage variant comparison",
      description: "Compare text, picture, or other signage experiments.",
      request: createAnalyticsRequest(filters, {
        compareBy: "signageVariant",
        groupBy: ["signageVariant"],
        timeBucket: "day"
      })
    },
    {
      id: "layout-variant",
      label: "Layout variant comparison",
      description: "Compare physical placement and layout experiments.",
      request: createAnalyticsRequest(filters, {
        compareBy: "layoutVariant",
        groupBy: ["layoutVariant"],
        timeBucket: "day"
      })
    },
    {
      id: "before-after",
      label: "Before / after analysis",
      description: "Track day-over-day performance before and after signage or layout changes.",
      request: createAnalyticsRequest(filters, {
        compareBy: "day",
        groupBy: ["day"],
        timeBucket: "day"
      })
    },
    {
      id: "a-b",
      label: "A/B station analysis",
      description: "Compare station cohorts directly for controlled experiments.",
      request: createAnalyticsRequest(filters, {
        compareBy: "stationId",
        groupBy: ["stationId"],
        timeBucket: "day"
      })
    }
  ];
}