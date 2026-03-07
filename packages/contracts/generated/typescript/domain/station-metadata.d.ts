/**
 * Canonical station metadata used for dashboard filtering, grouping, and experiment comparisons.
 */
export interface StationMetadata {
/**
 * Unique station identifier used across telemetry, analytics, and operator views.
 */
stationId: string
/**
 * Human-readable station label for dashboard lists.
 */
stationName: string
/**
 * Stable building identifier used for filtering and rollups.
 */
buildingId: string
/**
 * Display name for the building.
 */
buildingLabel: string
/**
 * Stable floor identifier used for grouping and leaderboard comparisons.
 */
floorId: string
/**
 * Display name for the floor.
 */
floorLabel: string
/**
 * Operator-facing location descriptor such as food court or exit lobby.
 */
locationLabel: string
/**
 * Signage experiment variant for before or after and A/B comparisons.
 */
signageVariant: string
/**
 * Station layout or placement variant used for comparison analysis.
 */
layoutVariant: string
/**
 * Identifier of the rules preset currently active on the station.
 */
activeRulesPresetId: string
}
