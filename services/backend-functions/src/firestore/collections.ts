export const FIRESTORE_COLLECTIONS = {
  stations: "stations",
  rulesPresets: "rulesPresets",
  stationLiveStatus: "stationLiveStatus",
  disposalEvents: "disposalEvents",
  analyticsStationDay: "analyticsStationDay",
  analyticsFloorDay: "analyticsFloorDay",
  analyticsBuildingDay: "analyticsBuildingDay",
  analyticsExperimentDay: "analyticsExperimentDay"
} as const;

export type FirestoreCollectionName =
  (typeof FIRESTORE_COLLECTIONS)[keyof typeof FIRESTORE_COLLECTIONS];

export const DIRECT_OPERATOR_READ_COLLECTIONS = [FIRESTORE_COLLECTIONS.stationLiveStatus] as const;

export const STATION_DIRECTORY_SOURCE_COLLECTIONS = [
  FIRESTORE_COLLECTIONS.stations,
  FIRESTORE_COLLECTIONS.rulesPresets
] as const;

export const ANALYTICS_EXPERIMENT_DIMENSIONS = [
  "signageVariant",
  "layoutVariant",
  "locationLabel"
] as const;

export type AnalyticsExperimentDimension = (typeof ANALYTICS_EXPERIMENT_DIMENSIONS)[number];

export function stationDocumentPath(stationId: string): string {
  return `${FIRESTORE_COLLECTIONS.stations}/${stationId}`;
}

export function rulesPresetDocumentPath(presetId: string): string {
  return `${FIRESTORE_COLLECTIONS.rulesPresets}/${presetId}`;
}

export function stationLiveStatusDocumentPath(stationId: string): string {
  return `${FIRESTORE_COLLECTIONS.stationLiveStatus}/${stationId}`;
}

export function disposalEventDocumentPath(eventId: string): string {
  return `${FIRESTORE_COLLECTIONS.disposalEvents}/${eventId}`;
}

export function createStationDayRollupId(stationId: string, dayKey: string): string {
  return `${stationId}_${dayKey}`;
}

export function stationDayRollupDocumentPath(stationId: string, dayKey: string): string {
  return `${FIRESTORE_COLLECTIONS.analyticsStationDay}/${createStationDayRollupId(stationId, dayKey)}`;
}

export function createFloorDayRollupId(buildingId: string, floorId: string, dayKey: string): string {
  return `${buildingId}_${floorId}_${dayKey}`;
}

export function floorDayRollupDocumentPath(
  buildingId: string,
  floorId: string,
  dayKey: string
): string {
  return `${FIRESTORE_COLLECTIONS.analyticsFloorDay}/${createFloorDayRollupId(buildingId, floorId, dayKey)}`;
}

export function createBuildingDayRollupId(buildingId: string, dayKey: string): string {
  return `${buildingId}_${dayKey}`;
}

export function buildingDayRollupDocumentPath(buildingId: string, dayKey: string): string {
  return `${FIRESTORE_COLLECTIONS.analyticsBuildingDay}/${createBuildingDayRollupId(buildingId, dayKey)}`;
}

export function createExperimentDayRollupId(
  dimension: AnalyticsExperimentDimension,
  value: string,
  dayKey: string
): string {
  return `${dimension}_${value}_${dayKey}`;
}

export function experimentDayRollupDocumentPath(
  dimension: AnalyticsExperimentDimension,
  value: string,
  dayKey: string
): string {
  return `${FIRESTORE_COLLECTIONS.analyticsExperimentDay}/${createExperimentDayRollupId(
    dimension,
    value,
    dayKey
  )}`;
}