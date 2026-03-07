import type {
  DisposalEvent,
  EventHistoryQuery,
  LiveStationStatus,
  MetricTotals,
  RulesPreset,
  StationMetadata
} from "@binbuddy/contracts";

import type { AnalyticsExperimentDimension } from "../collections.js";

export interface DisposalEventRecord {
  readonly eventId: string;
  readonly event: DisposalEvent;
  readonly writtenAt: string;
}

export interface DisposalEventWriteResult {
  readonly status: "created" | "duplicate";
  readonly record: DisposalEventRecord;
}

export interface DisposalEventRepository {
  saveEvent(eventId: string, event: DisposalEvent): Promise<DisposalEventWriteResult>;
  listEvents(query: EventHistoryQuery): Promise<readonly DisposalEventRecord[]>;
  getEvent(eventId: string): Promise<DisposalEventRecord | null>;
}

export interface LiveStatusWriteResult {
  readonly status: "created" | "updated";
  readonly statusDocument: LiveStationStatus;
}

export interface LiveStatusRepository {
  upsertStatus(status: LiveStationStatus): Promise<LiveStatusWriteResult>;
  patchCameraFeed(stationId: string, cameraFeed: LiveStationStatus["cameraFeed"], timestamp: string, active: boolean): Promise<LiveStatusWriteResult>;
  getStatus(stationId: string): Promise<LiveStationStatus | null>;
}

export interface StationRepository {
  listStations(): Promise<readonly StationMetadata[]>;
  getStation(stationId: string): Promise<StationMetadata | null>;
  getRulesPreset(presetId: string): Promise<RulesPreset | null>;
}

export interface AnalyticsBucketMethodMetrics {
  readonly totalAttempts: number;
  readonly correctAttempts: number;
}

export interface AnalyticsBucketSummary {
  readonly bucketStart: string;
  readonly bucketLabel: string;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly byDisposalMethod: Readonly<Record<"recycle" | "compost" | "garbage", AnalyticsBucketMethodMetrics>>;
}

export interface AnalyticsRollupDocument {
  readonly rollupId: string;
  readonly scopeType: "station" | "floor" | "building" | "experiment";
  readonly scopeId: string;
  readonly scopeLabel: string;
  readonly dayKey: string;
  readonly stationId?: string;
  readonly buildingId?: string;
  readonly floorId?: string;
  readonly locationLabel?: string;
  readonly signageVariant?: string;
  readonly layoutVariant?: string;
  readonly experimentDimension?: AnalyticsExperimentDimension;
  readonly experimentValue?: string;
  readonly totals: MetricTotals;
  readonly contaminationItems: Readonly<Record<string, number>>;
  readonly hourlyBuckets: Readonly<Record<string, AnalyticsBucketSummary>>;
  readonly updatedAt: string;
}

export interface AnalyticsRollupRepository {
  getRollup(rollupId: string): Promise<AnalyticsRollupDocument | null>;
  upsertRollup(document: AnalyticsRollupDocument): Promise<AnalyticsRollupDocument>;
  listRollups(): Promise<readonly AnalyticsRollupDocument[]>;
}
