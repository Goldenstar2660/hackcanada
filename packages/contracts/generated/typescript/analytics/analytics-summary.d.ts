/**
 * This interface was referenced by `AnalyticsSummary`'s JSON-Schema
 * via the `definition` "disposalMethod".
 */
export type DisposalMethod = ("recycle" | "compost" | "garbage")

/**
 * Canonical analytics read model returned by backend reporting endpoints and reused by the dashboard.
 */
export interface AnalyticsSummary {
/**
 * Time when the analytics summary was materialized.
 */
generatedAt: string
/**
 * Inclusive UTC time window represented by this summary.
 */
timeRange: {
start: string
end: string
}
totals: MetricTotals
/**
 * Optional grouped rollups for station, floor, building, location, or experiment views.
 */
groupedResults?: {
groupKey: string
groupLabel: string
metrics: MetricTotals1
}[]
/**
 * Items most often sorted into the wrong zone for the selected query scope.
 */
topContaminationItems?: {
itemType: string
incorrectAttempts: number
}[]
/**
 * Time buckets with the lowest first-try correct rates.
 */
worstTimesOfDay?: {
bucketLabel: string
totalAttempts: number
firstTryCorrectRate: number
}[]
/**
 * Correct sorting percentage per disposal method and time bucket.
 */
binPurity?: {
disposalMethod: DisposalMethod
bucketLabel: string
totalAttempts: number
correctAttempts: number
purityRate: number
}[]
/**
 * Ranked leaderboard entries for floor or building comparison views.
 */
leaderboard?: {
scopeType: ("floor" | "building")
scopeId: string
scopeLabel: string
rank: number
participationComplianceScore: number
}[]
/**
 * Historical chart points for trend lines and before or after analysis views.
 */
chartSeries?: {
metric: string
points: {
bucketStart: string
bucketLabel: string
value: number
}[]
}[]
}
/**
 * Headline metrics shown at the top of the dashboard.
 */
export interface MetricTotals {
totalAttempts: number
totalCorrectSorts: number
firstTryCorrectRate: number
participationComplianceScore: number
}
/**
 * This interface was referenced by `AnalyticsSummary`'s JSON-Schema
 * via the `definition` "metricTotals".
 */
export interface MetricTotals1 {
totalAttempts: number
totalCorrectSorts: number
firstTryCorrectRate: number
participationComplianceScore: number
}
