/**
 * This interface was referenced by `AnalyticsQuery`'s JSON-Schema
 * via the `definition` "metricKey".
 */
export type MetricKey = ("totalAttempts" | "totalCorrectSorts" | "firstTryCorrectRate" | "participationComplianceScore" | "topContaminationItems" | "worstTimesOfDay" | "binPurityByHour" | "binPurityByDay" | "floorLeaderboard" | "buildingLeaderboard")
/**
 * This interface was referenced by `AnalyticsQuery`'s JSON-Schema
 * via the `definition` "groupingDimension".
 */
export type GroupingDimension = ("stationId" | "buildingId" | "floorId" | "locationLabel" | "signageVariant" | "layoutVariant" | "disposalMethod" | "hour" | "day")

/**
 * Canonical analytics request contract for dashboard and backend reporting queries.
 */
export interface AnalyticsQuery {
/**
 * Inclusive UTC time window for analytics aggregation.
 */
timeRange: {
start: string
end: string
}
/**
 * Optional station filter set.
 */
stationIds?: string[]
/**
 * Optional building filter set.
 */
buildingIds?: string[]
/**
 * Optional floor filter set.
 */
floorIds?: string[]
/**
 * Optional operator-facing location filter set.
 */
locationLabels?: string[]
/**
 * Optional signage variant filter set for campaign comparisons.
 */
signageVariants?: string[]
/**
 * Optional layout or placement variant filter set.
 */
layoutVariants?: string[]
/**
 * Requested metrics or derived insight views for the query.
 * 
 * @minItems 1
 */
metrics: [MetricKey, ...(MetricKey)[]]
/**
 * Optional dimensions used to group the result set.
 */
groupBy?: GroupingDimension[]
/**
 * Optional dimension used for before or after and A/B style comparison views.
 */
compareBy?: (GroupingDimension | null)
/**
 * Optional bucket size for historical charting.
 */
timeBucket?: ("hour" | "day")
}
