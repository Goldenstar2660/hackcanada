export const contractsPackage = {
  name: "contracts",
  status: "canonical domain and ingress contracts"
} as const;

export const DISPOSAL_METHODS = ["recycle", "compost", "garbage"] as const;
export type DisposalMethod = (typeof DISPOSAL_METHODS)[number];

export const DISPOSAL_ZONES = ["left", "middle", "right"] as const;
export type DisposalZone = (typeof DISPOSAL_ZONES)[number];

export const ATTEMPT_RESULTS = ["success", "failure"] as const;
export type AttemptResult = (typeof ATTEMPT_RESULTS)[number];

export const DEVICE_STATUSES = ["online", "offline", "degraded"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const DEVICE_PAYLOAD_VERSIONS = ["device.v1"] as const;
export type DevicePayloadVersion = (typeof DEVICE_PAYLOAD_VERSIONS)[number];

export const SESSION_STATES = [
  "idle",
  "detecting-person",
  "identifying-item",
  "guiding-user",
  "waiting-for-disposal",
  "syncing",
  "error"
] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export const CAMERA_FEED_STATUSES = ["active", "inactive", "stale", "unavailable"] as const;
export type CameraFeedStatus = (typeof CAMERA_FEED_STATUSES)[number];

export interface DisposalEvent {
  readonly stationId: string;
  readonly timestamp: string;
  readonly predictedItem: string;
  readonly correctDisposalMethod: DisposalMethod;
  readonly actualDisposalZone: DisposalZone;
  readonly attemptResult: AttemptResult;
  readonly modelConfidence: number;
  readonly llmFallbackUsed: boolean;
}

export interface LatestEventSummary {
  readonly timestamp: string;
  readonly predictedItem: string;
  readonly correctDisposalMethod: DisposalMethod;
  readonly actualDisposalZone: DisposalZone;
  readonly attemptResult: AttemptResult;
}

export interface DeviceHealth {
  readonly pi: DeviceStatus;
  readonly esp8266: DeviceStatus;
  readonly cloudSync: DeviceStatus;
}

export interface CameraFeedMetadata {
  readonly status: CameraFeedStatus;
  readonly storageObjectPath: string | null;
  readonly contentType: string | null;
  readonly lastUpdatedAt: string | null;
}

export interface LiveStationStatus {
  readonly stationId: string;
  readonly timestamp: string;
  readonly sessionState: SessionState;
  readonly cameraFeedActive: boolean;
  readonly currentDetectedItem?: string | null;
  readonly currentDisposalMethod?: DisposalMethod | null;
  readonly currentHandZone?: DisposalZone | null;
  readonly deviceHealth: DeviceHealth;
  readonly latestEvent?: LatestEventSummary | null;
  readonly cameraFeed?: CameraFeedMetadata | null;
}

export interface RulesPresetJurisdiction {
  readonly city: string;
  readonly provinceOrState: string;
}

export interface ItemMapping {
  readonly itemType: string;
  readonly disposalMethod: DisposalMethod;
}

export interface ZoneMapping {
  readonly left: DisposalMethod;
  readonly middle: DisposalMethod;
  readonly right: DisposalMethod;
}

export interface RulesPreset {
  readonly presetId: string;
  readonly version: string;
  readonly jurisdiction: RulesPresetJurisdiction;
  readonly supportedItems: readonly [string, ...string[]];
  readonly itemMappings: readonly [ItemMapping, ...ItemMapping[]];
  readonly zoneMapping: ZoneMapping;
  readonly lowConfidenceThreshold: number;
}

export interface RulesPresetSummary {
  readonly presetId: string;
  readonly version: string;
  readonly jurisdiction: RulesPresetJurisdiction;
  readonly zoneMapping: ZoneMapping;
  readonly lowConfidenceThreshold: number;
}

export interface StationMetadata {
  readonly stationId: string;
  readonly stationName: string;
  readonly buildingId: string;
  readonly buildingLabel: string;
  readonly floorId: string;
  readonly floorLabel: string;
  readonly locationLabel: string;
  readonly signageVariant: string;
  readonly layoutVariant: string;
  readonly activeRulesPresetId: string;
  readonly activeRulesPreset?: RulesPresetSummary | null;
}

export interface StationRecord extends StationMetadata {
  readonly activeRulesPreset: RulesPresetSummary;
}

export const METRIC_KEYS = [
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
export type MetricKey = (typeof METRIC_KEYS)[number];

export const ANALYTICS_GROUPING_DIMENSIONS = [
  "stationId",
  "buildingId",
  "floorId",
  "locationLabel",
  "signageVariant",
  "layoutVariant",
  "disposalMethod",
  "hour",
  "day"
] as const;
export type AnalyticsGroupingDimension = (typeof ANALYTICS_GROUPING_DIMENSIONS)[number];

export interface AnalyticsQuery {
  readonly timeRange: {
    readonly start: string;
    readonly end: string;
  };
  readonly stationIds?: readonly string[];
  readonly buildingIds?: readonly string[];
  readonly floorIds?: readonly string[];
  readonly locationLabels?: readonly string[];
  readonly signageVariants?: readonly string[];
  readonly layoutVariants?: readonly string[];
  readonly metrics: readonly [MetricKey, ...MetricKey[]];
  readonly groupBy?: readonly AnalyticsGroupingDimension[];
  readonly compareBy?: AnalyticsGroupingDimension | null;
  readonly timeBucket?: "hour" | "day";
}

export interface MetricTotals {
  readonly totalAttempts: number;
  readonly totalCorrectSorts: number;
  readonly firstTryCorrectRate: number;
  readonly participationComplianceScore: number;
}

export interface AnalyticsSummary {
  readonly generatedAt: string;
  readonly timeRange: {
    readonly start: string;
    readonly end: string;
  };
  readonly totals: MetricTotals;
  readonly groupedResults?: ReadonlyArray<{
    readonly groupKey: string;
    readonly groupLabel: string;
    readonly metrics: MetricTotals;
  }>;
  readonly topContaminationItems?: ReadonlyArray<{
    readonly itemType: string;
    readonly incorrectAttempts: number;
  }>;
  readonly worstTimesOfDay?: ReadonlyArray<{
    readonly bucketLabel: string;
    readonly totalAttempts: number;
    readonly firstTryCorrectRate: number;
  }>;
  readonly binPurity?: ReadonlyArray<{
    readonly disposalMethod: DisposalMethod;
    readonly bucketLabel: string;
    readonly totalAttempts: number;
    readonly correctAttempts: number;
    readonly purityRate: number;
  }>;
  readonly leaderboard?: ReadonlyArray<{
    readonly scopeType: "floor" | "building";
    readonly scopeId: string;
    readonly scopeLabel: string;
    readonly rank: number;
    readonly participationComplianceScore: number;
  }>;
  readonly chartSeries?: ReadonlyArray<{
    readonly metric: string;
    readonly points: ReadonlyArray<{
      readonly bucketStart: string;
      readonly bucketLabel: string;
      readonly value: number;
    }>;
  }>;
}

export type AnalyticsInsightCardId = "summary" | "recommendation";
export type AnalyticsInsightCardEmphasis = "primary" | "default";
export type AnalyticsInsightsStatus = "ready" | "placeholder";

export interface AnalyticsInsightCard {
  readonly id: AnalyticsInsightCardId;
  readonly title: string;
  readonly body: string;
  readonly emphasis: AnalyticsInsightCardEmphasis;
}

export interface AnalyticsInsightsResponse {
  readonly generatedAt: string;
  readonly model: string;
  readonly status: AnalyticsInsightsStatus;
  readonly cards: readonly [AnalyticsInsightCard, AnalyticsInsightCard];
  readonly fallbackReason?: string | null;
}

export interface EventHistoryQuery {
  readonly timeRange: {
    readonly start: string;
    readonly end: string;
  };
  readonly stationIds?: readonly string[];
  readonly buildingIds?: readonly string[];
  readonly floorIds?: readonly string[];
  readonly locationLabels?: readonly string[];
  readonly signageVariants?: readonly string[];
  readonly layoutVariants?: readonly string[];
  readonly attemptResults?: readonly AttemptResult[];
  readonly pageSize?: number;
  readonly cursor?: string | null;
}

export interface EventHistoryEntry {
  readonly eventId: string;
  readonly event: DisposalEvent;
  readonly station: StationMetadata;
}

export interface EventHistoryResponse {
  readonly generatedAt: string;
  readonly query: EventHistoryQuery;
  readonly entries: ReadonlyArray<EventHistoryEntry>;
  readonly nextCursor?: string | null;
}

export interface StationDirectoryFacetOption {
  readonly id: string;
  readonly label: string;
}

export interface StationDirectoryFloorOption extends StationDirectoryFacetOption {
  readonly buildingId: string;
}

export interface StationDirectoryFilters {
  readonly buildings: ReadonlyArray<StationDirectoryFacetOption>;
  readonly floors: ReadonlyArray<StationDirectoryFloorOption>;
  readonly locations: readonly string[];
  readonly signageVariants: readonly string[];
  readonly layoutVariants: readonly string[];
}

export interface StationDirectoryResponse {
  readonly generatedAt: string;
  readonly stations: ReadonlyArray<StationRecord>;
  readonly filters: StationDirectoryFilters;
  readonly liveStatusCollectionPath: string;
}

export const DEVICE_SESSION_PHASES = ["idle", "detecting", "guiding", "waiting_for_disposal", "complete"] as const;
export type DeviceSessionPhase = (typeof DEVICE_SESSION_PHASES)[number];

export interface DeviceDisposalEventIngress {
  readonly payload_version?: DevicePayloadVersion;
  readonly station_id: string;
  readonly timestamp: string;
  readonly predicted_item: string;
  readonly correct_disposal_method: DisposalMethod;
  readonly actual_disposal_zone: DisposalZone;
  readonly success: boolean;
  readonly model_confidence: number;
  readonly llm_fallback_used: boolean;
}

export interface DeviceLatestEventIngress {
  readonly timestamp: string;
  readonly predicted_item: string;
  readonly correct_disposal_method: DisposalMethod;
  readonly actual_disposal_zone: DisposalZone;
  readonly success: boolean;
}

export interface DeviceCameraFeedIngress {
  readonly status?: CameraFeedStatus;
  readonly storage_object_path?: string | null;
  readonly content_type?: string | null;
  readonly last_updated_at?: string | null;
}

export interface DeviceLiveStatusIngress {
  readonly payload_version?: DevicePayloadVersion;
  readonly station_id: string;
  readonly phase: DeviceSessionPhase;
  readonly predicted_item: string | null;
  readonly disposal_method: DisposalMethod | null;
  readonly timestamp?: string;
  readonly current_hand_zone?: DisposalZone | null;
  readonly camera_feed_active?: boolean;
  readonly device_health?: Partial<DeviceHealth>;
  readonly latest_event?: DeviceLatestEventIngress | null;
  readonly camera_feed?: DeviceCameraFeedIngress | null;
}