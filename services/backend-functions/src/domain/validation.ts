import {
  type AnalyticsGroupingDimension,
  type AnalyticsQuery,
  type AnalyticsSummary,
  type CameraFeedMetadata,
  type DeviceDisposalEventIngress,
  type DeviceHealth,
  type DeviceLiveStatusIngress,
  type DevicePayloadVersion,
  type DisposalEvent,
  type EventHistoryQuery,
  type LatestEventSummary,
  type LiveStationStatus,
  type MetricTotals,
  type RulesPreset,
  type RulesPresetSummary,
  type StationMetadata,
  type StationRecord
} from "@binsight/contracts";

const DISPOSAL_METHODS = ["recycle", "compost", "garbage"] as const;
const DISPOSAL_ZONES = ["left", "middle", "right"] as const;
const ATTEMPT_RESULTS = ["success", "failure"] as const;
const DEVICE_STATUSES = ["online", "offline", "degraded"] as const;
const DEVICE_PAYLOAD_VERSIONS = ["device.v1"] as const;
const DEVICE_SESSION_PHASES = ["idle", "detecting", "guiding", "waiting_for_disposal", "complete"] as const;
const SESSION_STATES = [
  "idle",
  "detecting-person",
  "identifying-item",
  "guiding-user",
  "waiting-for-disposal",
  "syncing",
  "error"
] as const;
const DEVICE_PAYLOAD_VERSION_VALUES = DEVICE_PAYLOAD_VERSIONS satisfies readonly DevicePayloadVersion[];
const CAMERA_FEED_STATUSES = ["active", "inactive", "stale", "unavailable"] as const;
const METRIC_KEYS = [
  "totalAttempts",
  "totalCorrectSorts",
  "firstTryCorrectRate",
  "participationComplianceScore",
  "topContaminationItems",
  "worstTimesOfDay",
  "binPurityByHour",
  "binPurityByDay",
  "floorLeaderboard",
  "buildingLeaderboard"
] as const;
const ANALYTICS_GROUPING_DIMENSIONS: readonly AnalyticsGroupingDimension[] = [
  "stationId",
  "buildingId",
  "floorId",
  "locationLabel",
  "signageVariant",
  "layoutVariant",
  "disposalMethod",
  "hour",
  "day"
];

type UnknownRecord = Record<string, unknown>;

export class ValidationError extends Error {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[]) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

function fail(path: string, expectation: string): never {
  throw new ValidationError(`Validation failed at ${path}`, [`${path}: expected ${expectation}`]);
}

function asRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "object");
  }

  return value as UnknownRecord;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(path, "non-empty string");
  }

  return value;
}

function asNullableString(value: unknown, path: string): string | null {
  if (value === null) {
    return null;
  }

  return asString(value, path);
}

function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    fail(path, "boolean");
  }

  return value;
}

function asNumber(value: unknown, path: string, min?: number, max?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    fail(path, "number");
  }

  if (min !== undefined && value < min) {
    fail(path, `number >= ${min}`);
  }

  if (max !== undefined && value > max) {
    fail(path, `number <= ${max}`);
  }

  return value;
}

function asInteger(value: unknown, path: string, min?: number, max?: number): number {
  const numberValue = asNumber(value, path, min, max);
  if (!Number.isInteger(numberValue)) {
    fail(path, "integer");
  }

  return numberValue;
}

function asIsoDateTime(value: unknown, path: string): string {
  const dateTime = asString(value, path);
  if (Number.isNaN(Date.parse(dateTime))) {
    fail(path, "ISO date-time string");
  }

  return dateTime;
}

function asEnumValue<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
  path: string
): TValue {
  const candidate = asString(value, path);
  if (!allowedValues.includes(candidate as TValue)) {
    fail(path, `one of ${allowedValues.join(", ")}`);
  }

  return candidate as TValue;
}

function asOptionalArrayOfStrings(value: unknown, path: string): readonly string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    fail(path, "array of strings");
  }

  return value.map((entry, index) => asString(entry, `${path}[${index}]`));
}

function normalizeScalarArrayField(record: UnknownRecord, key: string): void {
  const value = record[key];
  if (typeof value === "string") {
    record[key] = [value];
  }
}

function normalizeDashboardFilterArrays(record: UnknownRecord): void {
  normalizeScalarArrayField(record, "stationIds");
  normalizeScalarArrayField(record, "buildingIds");
  normalizeScalarArrayField(record, "floorIds");
  normalizeScalarArrayField(record, "locationLabels");
  normalizeScalarArrayField(record, "signageVariants");
  normalizeScalarArrayField(record, "layoutVariants");
  normalizeScalarArrayField(record, "attemptResults");
}

function assertMetricTotals(value: unknown, path: string): asserts value is MetricTotals {
  const record = asRecord(value, path);
  asNumber(record.totalAttempts, `${path}.totalAttempts`, 0);
  asNumber(record.totalCorrectSorts, `${path}.totalCorrectSorts`, 0);
  asNumber(record.firstTryCorrectRate, `${path}.firstTryCorrectRate`, 0, 1);
  asNumber(record.participationComplianceScore, `${path}.participationComplianceScore`, 0, 1);
}

function assertRulesPresetSummary(value: unknown, path: string): asserts value is RulesPresetSummary {
  const record = asRecord(value, path);
  asString(record.presetId, `${path}.presetId`);
  asString(record.version, `${path}.version`);
  const jurisdiction = asRecord(record.jurisdiction, `${path}.jurisdiction`);
  asString(jurisdiction.city, `${path}.jurisdiction.city`);
  asString(jurisdiction.provinceOrState, `${path}.jurisdiction.provinceOrState`);
  const zoneMapping = asRecord(record.zoneMapping, `${path}.zoneMapping`);
  asEnumValue(zoneMapping.left, DISPOSAL_METHODS, `${path}.zoneMapping.left`);
  asEnumValue(zoneMapping.middle, DISPOSAL_METHODS, `${path}.zoneMapping.middle`);
  asEnumValue(zoneMapping.right, DISPOSAL_METHODS, `${path}.zoneMapping.right`);
  asNumber(record.lowConfidenceThreshold, `${path}.lowConfidenceThreshold`, 0, 1);
}

function assertDeviceHealth(value: unknown, path: string): asserts value is DeviceHealth {
  const record = asRecord(value, path);
  asEnumValue(record.pi, DEVICE_STATUSES, `${path}.pi`);
  asEnumValue(record.esp8266, DEVICE_STATUSES, `${path}.esp8266`);
  asEnumValue(record.cloudSync, DEVICE_STATUSES, `${path}.cloudSync`);
}

function assertLatestEventSummary(value: unknown, path: string): asserts value is LatestEventSummary {
  const record = asRecord(value, path);
  asIsoDateTime(record.timestamp, `${path}.timestamp`);
  asString(record.predictedItem, `${path}.predictedItem`);
  asEnumValue(record.correctDisposalMethod, DISPOSAL_METHODS, `${path}.correctDisposalMethod`);
  asEnumValue(record.actualDisposalZone, DISPOSAL_ZONES, `${path}.actualDisposalZone`);
  asEnumValue(record.attemptResult, ATTEMPT_RESULTS, `${path}.attemptResult`);
}

function assertCameraFeedMetadata(value: unknown, path: string): asserts value is CameraFeedMetadata {
  const record = asRecord(value, path);
  asEnumValue(record.status, CAMERA_FEED_STATUSES, `${path}.status`);
  asNullableString(record.storageObjectPath, `${path}.storageObjectPath`);
  asNullableString(record.contentType, `${path}.contentType`);
  if (record.lastUpdatedAt !== null) {
    asIsoDateTime(record.lastUpdatedAt, `${path}.lastUpdatedAt`);
  }
}

export function assertDeviceDisposalEventIngress(value: unknown): asserts value is DeviceDisposalEventIngress {
  const record = asRecord(value, "deviceDisposalEventIngress");
  if (record.payload_version !== undefined) {
    asEnumValue(
      record.payload_version,
      DEVICE_PAYLOAD_VERSION_VALUES,
      "deviceDisposalEventIngress.payload_version"
    );
  }
  asString(record.station_id, "deviceDisposalEventIngress.station_id");
  asIsoDateTime(record.timestamp, "deviceDisposalEventIngress.timestamp");
  asString(record.predicted_item, "deviceDisposalEventIngress.predicted_item");
  asEnumValue(
    record.correct_disposal_method,
    DISPOSAL_METHODS,
    "deviceDisposalEventIngress.correct_disposal_method"
  );
  asEnumValue(
    record.actual_disposal_zone,
    DISPOSAL_ZONES,
    "deviceDisposalEventIngress.actual_disposal_zone"
  );
  asBoolean(record.success, "deviceDisposalEventIngress.success");
  asNumber(record.model_confidence, "deviceDisposalEventIngress.model_confidence", 0, 1);
  asBoolean(record.llm_fallback_used, "deviceDisposalEventIngress.llm_fallback_used");
}

export function assertDeviceLiveStatusIngress(value: unknown): asserts value is DeviceLiveStatusIngress {
  const record = asRecord(value, "deviceLiveStatusIngress");
  if (record.payload_version !== undefined) {
    asEnumValue(
      record.payload_version,
      DEVICE_PAYLOAD_VERSION_VALUES,
      "deviceLiveStatusIngress.payload_version"
    );
  }
  asString(record.station_id, "deviceLiveStatusIngress.station_id");
  asEnumValue(record.phase, DEVICE_SESSION_PHASES, "deviceLiveStatusIngress.phase");
  if (record.predicted_item !== null) {
    asString(record.predicted_item, "deviceLiveStatusIngress.predicted_item");
  }
  if (record.disposal_method !== null) {
    asEnumValue(record.disposal_method, DISPOSAL_METHODS, "deviceLiveStatusIngress.disposal_method");
  }
  if (record.timestamp !== undefined) {
    asIsoDateTime(record.timestamp, "deviceLiveStatusIngress.timestamp");
  }
  if (record.current_hand_zone !== undefined && record.current_hand_zone !== null) {
    asEnumValue(record.current_hand_zone, DISPOSAL_ZONES, "deviceLiveStatusIngress.current_hand_zone");
  }
  if (record.camera_feed_active !== undefined) {
    asBoolean(record.camera_feed_active, "deviceLiveStatusIngress.camera_feed_active");
  }
  if (record.device_health !== undefined) {
    const deviceHealth = asRecord(record.device_health, "deviceLiveStatusIngress.device_health");
    if (deviceHealth.pi !== undefined) {
      asEnumValue(deviceHealth.pi, DEVICE_STATUSES, "deviceLiveStatusIngress.device_health.pi");
    }
    if (deviceHealth.esp8266 !== undefined) {
      asEnumValue(
        deviceHealth.esp8266,
        DEVICE_STATUSES,
        "deviceLiveStatusIngress.device_health.esp8266"
      );
    }
    if (deviceHealth.cloudSync !== undefined) {
      asEnumValue(
        deviceHealth.cloudSync,
        DEVICE_STATUSES,
        "deviceLiveStatusIngress.device_health.cloudSync"
      );
    }
  }
  if (record.latest_event !== undefined && record.latest_event !== null) {
    const latestEvent = asRecord(record.latest_event, "deviceLiveStatusIngress.latest_event");
    asIsoDateTime(latestEvent.timestamp, "deviceLiveStatusIngress.latest_event.timestamp");
    asString(latestEvent.predicted_item, "deviceLiveStatusIngress.latest_event.predicted_item");
    asEnumValue(
      latestEvent.correct_disposal_method,
      DISPOSAL_METHODS,
      "deviceLiveStatusIngress.latest_event.correct_disposal_method"
    );
    asEnumValue(
      latestEvent.actual_disposal_zone,
      DISPOSAL_ZONES,
      "deviceLiveStatusIngress.latest_event.actual_disposal_zone"
    );
    asBoolean(latestEvent.success, "deviceLiveStatusIngress.latest_event.success");
  }
  if (record.camera_feed !== undefined && record.camera_feed !== null) {
    const cameraFeed = asRecord(record.camera_feed, "deviceLiveStatusIngress.camera_feed");
    if (cameraFeed.status !== undefined) {
      asEnumValue(cameraFeed.status, CAMERA_FEED_STATUSES, "deviceLiveStatusIngress.camera_feed.status");
    }
    if (cameraFeed.storage_object_path !== undefined && cameraFeed.storage_object_path !== null) {
      asString(
        cameraFeed.storage_object_path,
        "deviceLiveStatusIngress.camera_feed.storage_object_path"
      );
    }
    if (cameraFeed.content_type !== undefined && cameraFeed.content_type !== null) {
      asString(cameraFeed.content_type, "deviceLiveStatusIngress.camera_feed.content_type");
    }
    if (cameraFeed.last_updated_at !== undefined && cameraFeed.last_updated_at !== null) {
      asIsoDateTime(cameraFeed.last_updated_at, "deviceLiveStatusIngress.camera_feed.last_updated_at");
    }
  }
}

export function assertDisposalEvent(value: unknown): asserts value is DisposalEvent {
  const record = asRecord(value, "disposalEvent");
  asString(record.stationId, "disposalEvent.stationId");
  asIsoDateTime(record.timestamp, "disposalEvent.timestamp");
  asString(record.predictedItem, "disposalEvent.predictedItem");
  asEnumValue(record.correctDisposalMethod, DISPOSAL_METHODS, "disposalEvent.correctDisposalMethod");
  asEnumValue(record.actualDisposalZone, DISPOSAL_ZONES, "disposalEvent.actualDisposalZone");
  asEnumValue(record.attemptResult, ATTEMPT_RESULTS, "disposalEvent.attemptResult");
  asNumber(record.modelConfidence, "disposalEvent.modelConfidence", 0, 1);
  asBoolean(record.llmFallbackUsed, "disposalEvent.llmFallbackUsed");
}

export function assertLiveStationStatus(value: unknown): asserts value is LiveStationStatus {
  const record = asRecord(value, "liveStationStatus");
  asString(record.stationId, "liveStationStatus.stationId");
  asIsoDateTime(record.timestamp, "liveStationStatus.timestamp");
  asEnumValue(record.sessionState, SESSION_STATES, "liveStationStatus.sessionState");
  asBoolean(record.cameraFeedActive, "liveStationStatus.cameraFeedActive");
  if (record.currentDetectedItem !== undefined && record.currentDetectedItem !== null) {
    asString(record.currentDetectedItem, "liveStationStatus.currentDetectedItem");
  }
  if (record.currentDisposalMethod !== undefined && record.currentDisposalMethod !== null) {
    asEnumValue(
      record.currentDisposalMethod,
      DISPOSAL_METHODS,
      "liveStationStatus.currentDisposalMethod"
    );
  }
  if (record.currentHandZone !== undefined && record.currentHandZone !== null) {
    asEnumValue(record.currentHandZone, DISPOSAL_ZONES, "liveStationStatus.currentHandZone");
  }
  assertDeviceHealth(record.deviceHealth, "liveStationStatus.deviceHealth");
  if (record.latestEvent !== undefined && record.latestEvent !== null) {
    assertLatestEventSummary(record.latestEvent, "liveStationStatus.latestEvent");
  }
  if (record.cameraFeed !== undefined && record.cameraFeed !== null) {
    assertCameraFeedMetadata(record.cameraFeed, "liveStationStatus.cameraFeed");
  }
}

export function assertStationMetadata(value: unknown): asserts value is StationMetadata {
  const record = asRecord(value, "stationMetadata");
  asString(record.stationId, "stationMetadata.stationId");
  asString(record.stationName, "stationMetadata.stationName");
  asString(record.buildingId, "stationMetadata.buildingId");
  asString(record.buildingLabel, "stationMetadata.buildingLabel");
  asString(record.floorId, "stationMetadata.floorId");
  asString(record.floorLabel, "stationMetadata.floorLabel");
  asString(record.locationLabel, "stationMetadata.locationLabel");
  asString(record.signageVariant, "stationMetadata.signageVariant");
  asString(record.layoutVariant, "stationMetadata.layoutVariant");
  asString(record.activeRulesPresetId, "stationMetadata.activeRulesPresetId");
  if (record.activeRulesPreset !== undefined && record.activeRulesPreset !== null) {
    assertRulesPresetSummary(record.activeRulesPreset, "stationMetadata.activeRulesPreset");
  }
}

export function assertRulesPreset(value: unknown): asserts value is RulesPreset {
  const record = asRecord(value, "rulesPreset");
  asString(record.presetId, "rulesPreset.presetId");
  asString(record.version, "rulesPreset.version");
  const jurisdiction = asRecord(record.jurisdiction, "rulesPreset.jurisdiction");
  asString(jurisdiction.city, "rulesPreset.jurisdiction.city");
  asString(jurisdiction.provinceOrState, "rulesPreset.jurisdiction.provinceOrState");
  if (!Array.isArray(record.supportedItems) || record.supportedItems.length === 0) {
    fail("rulesPreset.supportedItems", "non-empty array");
  }
  record.supportedItems.forEach((item, index) => {
    asString(item, `rulesPreset.supportedItems[${index}]`);
  });
  if (!Array.isArray(record.itemMappings) || record.itemMappings.length === 0) {
    fail("rulesPreset.itemMappings", "non-empty array");
  }
  record.itemMappings.forEach((mapping, index) => {
    const itemMapping = asRecord(mapping, `rulesPreset.itemMappings[${index}]`);
    asString(itemMapping.itemType, `rulesPreset.itemMappings[${index}].itemType`);
    asEnumValue(
      itemMapping.disposalMethod,
      DISPOSAL_METHODS,
      `rulesPreset.itemMappings[${index}].disposalMethod`
    );
  });
  const zoneMapping = asRecord(record.zoneMapping, "rulesPreset.zoneMapping");
  asEnumValue(zoneMapping.left, DISPOSAL_METHODS, "rulesPreset.zoneMapping.left");
  asEnumValue(zoneMapping.middle, DISPOSAL_METHODS, "rulesPreset.zoneMapping.middle");
  asEnumValue(zoneMapping.right, DISPOSAL_METHODS, "rulesPreset.zoneMapping.right");
  asNumber(record.lowConfidenceThreshold, "rulesPreset.lowConfidenceThreshold", 0, 1);
}

export function assertStationRecord(value: unknown): asserts value is StationRecord {
  assertStationMetadata(value);
  const record = asRecord(value, "stationRecord");
  if (record.activeRulesPreset === undefined || record.activeRulesPreset === null) {
    fail("stationRecord.activeRulesPreset", "rules preset summary");
  }
  assertRulesPresetSummary(record.activeRulesPreset, "stationRecord.activeRulesPreset");
}

export function assertAnalyticsQuery(value: unknown): asserts value is AnalyticsQuery {
  const record = asRecord(value, "analyticsQuery");
  normalizeDashboardFilterArrays(record);
  const timeRange = asRecord(record.timeRange, "analyticsQuery.timeRange");
  asIsoDateTime(timeRange.start, "analyticsQuery.timeRange.start");
  asIsoDateTime(timeRange.end, "analyticsQuery.timeRange.end");

  asOptionalArrayOfStrings(record.stationIds, "analyticsQuery.stationIds");
  asOptionalArrayOfStrings(record.buildingIds, "analyticsQuery.buildingIds");
  asOptionalArrayOfStrings(record.floorIds, "analyticsQuery.floorIds");
  asOptionalArrayOfStrings(record.locationLabels, "analyticsQuery.locationLabels");
  asOptionalArrayOfStrings(record.signageVariants, "analyticsQuery.signageVariants");
  asOptionalArrayOfStrings(record.layoutVariants, "analyticsQuery.layoutVariants");

  if (!Array.isArray(record.metrics) || record.metrics.length === 0) {
    fail("analyticsQuery.metrics", "non-empty array");
  }
  record.metrics.forEach((metric, index) => {
    asEnumValue(metric, METRIC_KEYS, `analyticsQuery.metrics[${index}]`);
  });

  if (record.groupBy !== undefined && record.groupBy !== null) {
    if (!Array.isArray(record.groupBy)) {
      fail("analyticsQuery.groupBy", "array");
    }
    record.groupBy.forEach((dimension, index) => {
      asEnumValue(dimension, ANALYTICS_GROUPING_DIMENSIONS, `analyticsQuery.groupBy[${index}]`);
    });
  }

  if (record.compareBy !== undefined && record.compareBy !== null) {
    asEnumValue(record.compareBy, ANALYTICS_GROUPING_DIMENSIONS, "analyticsQuery.compareBy");
  }

  if (record.timeBucket !== undefined && record.timeBucket !== null) {
    asEnumValue(record.timeBucket, ["hour", "day"], "analyticsQuery.timeBucket");
  }
}

export function assertEventHistoryQuery(value: unknown): asserts value is EventHistoryQuery {
  const record = asRecord(value, "eventHistoryQuery");
  normalizeDashboardFilterArrays(record);
  const timeRange = asRecord(record.timeRange, "eventHistoryQuery.timeRange");
  asIsoDateTime(timeRange.start, "eventHistoryQuery.timeRange.start");
  asIsoDateTime(timeRange.end, "eventHistoryQuery.timeRange.end");

  asOptionalArrayOfStrings(record.stationIds, "eventHistoryQuery.stationIds");
  asOptionalArrayOfStrings(record.buildingIds, "eventHistoryQuery.buildingIds");
  asOptionalArrayOfStrings(record.floorIds, "eventHistoryQuery.floorIds");
  asOptionalArrayOfStrings(record.locationLabels, "eventHistoryQuery.locationLabels");
  asOptionalArrayOfStrings(record.signageVariants, "eventHistoryQuery.signageVariants");
  asOptionalArrayOfStrings(record.layoutVariants, "eventHistoryQuery.layoutVariants");

  if (record.attemptResults !== undefined && record.attemptResults !== null) {
    if (!Array.isArray(record.attemptResults)) {
      fail("eventHistoryQuery.attemptResults", "array");
    }

    record.attemptResults.forEach((result, index) => {
      asEnumValue(result, ATTEMPT_RESULTS, `eventHistoryQuery.attemptResults[${index}]`);
    });
  }

  if (record.pageSize !== undefined && record.pageSize !== null) {
    asInteger(record.pageSize, "eventHistoryQuery.pageSize", 1, 500);
  }

  if (record.cursor !== undefined && record.cursor !== null) {
    asString(record.cursor, "eventHistoryQuery.cursor");
  }
}

export function assertAnalyticsSummary(value: unknown): asserts value is AnalyticsSummary {
  const record = asRecord(value, "analyticsSummary");
  asIsoDateTime(record.generatedAt, "analyticsSummary.generatedAt");
  const timeRange = asRecord(record.timeRange, "analyticsSummary.timeRange");
  asIsoDateTime(timeRange.start, "analyticsSummary.timeRange.start");
  asIsoDateTime(timeRange.end, "analyticsSummary.timeRange.end");
  assertMetricTotals(record.totals, "analyticsSummary.totals");

  if (record.groupedResults !== undefined) {
    if (!Array.isArray(record.groupedResults)) {
      fail("analyticsSummary.groupedResults", "array");
    }
    record.groupedResults.forEach((entry, index) => {
      const group = asRecord(entry, `analyticsSummary.groupedResults[${index}]`);
      asString(group.groupKey, `analyticsSummary.groupedResults[${index}].groupKey`);
      asString(group.groupLabel, `analyticsSummary.groupedResults[${index}].groupLabel`);
      assertMetricTotals(group.metrics, `analyticsSummary.groupedResults[${index}].metrics`);
    });
  }

  if (record.topContaminationItems !== undefined) {
    if (!Array.isArray(record.topContaminationItems)) {
      fail("analyticsSummary.topContaminationItems", "array");
    }
    record.topContaminationItems.forEach((entry, index) => {
      const item = asRecord(entry, `analyticsSummary.topContaminationItems[${index}]`);
      asString(item.itemType, `analyticsSummary.topContaminationItems[${index}].itemType`);
      asNumber(item.incorrectAttempts, `analyticsSummary.topContaminationItems[${index}].incorrectAttempts`, 0);
    });
  }

  if (record.worstTimesOfDay !== undefined) {
    if (!Array.isArray(record.worstTimesOfDay)) {
      fail("analyticsSummary.worstTimesOfDay", "array");
    }
    record.worstTimesOfDay.forEach((entry, index) => {
      const item = asRecord(entry, `analyticsSummary.worstTimesOfDay[${index}]`);
      asString(item.bucketLabel, `analyticsSummary.worstTimesOfDay[${index}].bucketLabel`);
      asNumber(item.totalAttempts, `analyticsSummary.worstTimesOfDay[${index}].totalAttempts`, 0);
      asNumber(item.firstTryCorrectRate, `analyticsSummary.worstTimesOfDay[${index}].firstTryCorrectRate`, 0, 1);
    });
  }

  if (record.binPurity !== undefined) {
    if (!Array.isArray(record.binPurity)) {
      fail("analyticsSummary.binPurity", "array");
    }
    record.binPurity.forEach((entry, index) => {
      const item = asRecord(entry, `analyticsSummary.binPurity[${index}]`);
      asEnumValue(item.disposalMethod, DISPOSAL_METHODS, `analyticsSummary.binPurity[${index}].disposalMethod`);
      asString(item.bucketLabel, `analyticsSummary.binPurity[${index}].bucketLabel`);
      asNumber(item.totalAttempts, `analyticsSummary.binPurity[${index}].totalAttempts`, 0);
      asNumber(item.correctAttempts, `analyticsSummary.binPurity[${index}].correctAttempts`, 0);
      asNumber(item.purityRate, `analyticsSummary.binPurity[${index}].purityRate`, 0, 1);
    });
  }

  if (record.leaderboard !== undefined) {
    if (!Array.isArray(record.leaderboard)) {
      fail("analyticsSummary.leaderboard", "array");
    }
    record.leaderboard.forEach((entry, index) => {
      const item = asRecord(entry, `analyticsSummary.leaderboard[${index}]`);
      asEnumValue(item.scopeType, ["floor", "building"], `analyticsSummary.leaderboard[${index}].scopeType`);
      asString(item.scopeId, `analyticsSummary.leaderboard[${index}].scopeId`);
      asString(item.scopeLabel, `analyticsSummary.leaderboard[${index}].scopeLabel`);
      asNumber(item.rank, `analyticsSummary.leaderboard[${index}].rank`, 1);
      asNumber(
        item.participationComplianceScore,
        `analyticsSummary.leaderboard[${index}].participationComplianceScore`,
        0,
        1
      );
    });
  }

  if (record.chartSeries !== undefined) {
    if (!Array.isArray(record.chartSeries)) {
      fail("analyticsSummary.chartSeries", "array");
    }
    record.chartSeries.forEach((series, index) => {
      const chartSeries = asRecord(series, `analyticsSummary.chartSeries[${index}]`);
      asString(chartSeries.metric, `analyticsSummary.chartSeries[${index}].metric`);
      if (!Array.isArray(chartSeries.points)) {
        fail(`analyticsSummary.chartSeries[${index}].points`, "array");
      }
      chartSeries.points.forEach((point, pointIndex) => {
        const chartPoint = asRecord(
          point,
          `analyticsSummary.chartSeries[${index}].points[${pointIndex}]`
        );
        asIsoDateTime(
          chartPoint.bucketStart,
          `analyticsSummary.chartSeries[${index}].points[${pointIndex}].bucketStart`
        );
        asString(
          chartPoint.bucketLabel,
          `analyticsSummary.chartSeries[${index}].points[${pointIndex}].bucketLabel`
        );
        asNumber(
          chartPoint.value,
          `analyticsSummary.chartSeries[${index}].points[${pointIndex}].value`
        );
      });
    });
  }
}