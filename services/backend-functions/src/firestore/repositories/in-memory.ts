import type {
  DisposalEvent,
  EventHistoryQuery,
  LiveStationStatus,
  RulesPreset,
  StationMetadata
} from "@binsight/contracts";

import { DEFAULT_DEVICE_HEALTH } from "../../domain/contracts.js";

import type {
  AnalyticsRollupDocument,
  AnalyticsRollupRepository,
  DisposalEventRecord,
  DisposalEventRepository,
  DisposalEventWriteResult,
  LiveStatusRepository,
  LiveStatusWriteResult,
  StationRepository
} from "./types.js";

export interface InMemoryRepositorySeed {
  readonly events?: readonly DisposalEventRecord[];
  readonly liveStatuses?: readonly LiveStationStatus[];
  readonly stations?: readonly StationMetadata[];
  readonly rulesPresets?: readonly RulesPreset[];
  readonly rollups?: readonly AnalyticsRollupDocument[];
}

function matchesStringFilter(candidate: string, filters?: readonly string[]): boolean {
  return !filters || filters.length === 0 || filters.includes(candidate);
}

function matchesEventQuery(event: DisposalEvent, station: StationMetadata | undefined, query: EventHistoryQuery): boolean {
  if (event.timestamp < query.timeRange.start || event.timestamp > query.timeRange.end) {
    return false;
  }

  if (!matchesStringFilter(event.stationId, query.stationIds)) {
    return false;
  }

  if (query.attemptResults && query.attemptResults.length > 0 && !query.attemptResults.includes(event.attemptResult)) {
    return false;
  }

  if (!station) {
    return !query.buildingIds && !query.floorIds && !query.locationLabels && !query.signageVariants && !query.layoutVariants;
  }

  return (
    matchesStringFilter(station.buildingId, query.buildingIds)
    && matchesStringFilter(station.floorId, query.floorIds)
    && matchesStringFilter(station.locationLabel, query.locationLabels)
    && matchesStringFilter(station.signageVariant, query.signageVariants)
    && matchesStringFilter(station.layoutVariant, query.layoutVariants)
  );
}

function mergeStatus(existing: LiveStationStatus | null, incoming: LiveStationStatus): LiveStationStatus {
  return {
    ...existing,
    ...incoming,
    deviceHealth: incoming.deviceHealth,
    latestEvent: incoming.latestEvent ?? existing?.latestEvent ?? null,
    cameraFeed:
      incoming.cameraFeed
      ?? (incoming.cameraFeedActive ? existing?.cameraFeed ?? null : null)
  };
}

export function createInMemoryDisposalEventRepository(
  eventStore: Map<string, DisposalEventRecord>,
  stationStore: Map<string, StationMetadata>
): DisposalEventRepository {
  return {
    async saveEvent(eventId, event) {
      const existing = eventStore.get(eventId);
      if (existing) {
        return {
          status: "duplicate",
          record: existing
        } satisfies DisposalEventWriteResult;
      }

      const record: DisposalEventRecord = {
        eventId,
        event,
        writtenAt: new Date().toISOString()
      };
      eventStore.set(eventId, record);

      return {
        status: "created",
        record
      } satisfies DisposalEventWriteResult;
    },

    async listEvents(query) {
      const pageSize = query.pageSize ?? 50;
      const matches = [...eventStore.values()]
        .filter((record) => matchesEventQuery(record.event, stationStore.get(record.event.stationId), query))
        .sort((left, right) => right.event.timestamp.localeCompare(left.event.timestamp));

      if (!query.cursor) {
        return matches.slice(0, pageSize);
      }

      const cursorIndex = matches.findIndex((record) => record.eventId === query.cursor);
      const sliceStart = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      return matches.slice(sliceStart, sliceStart + pageSize);
    },

    async getEvent(eventId) {
      return eventStore.get(eventId) ?? null;
    }
  };
}

export function createInMemoryLiveStatusRepository(
  statusStore: Map<string, LiveStationStatus>
): LiveStatusRepository {
  return {
    async upsertStatus(status) {
      const existing = statusStore.get(status.stationId) ?? null;
      const merged = mergeStatus(existing, status);
      statusStore.set(status.stationId, merged);

      return {
        status: existing ? "updated" : "created",
        statusDocument: merged
      } satisfies LiveStatusWriteResult;
    },

    async patchCameraFeed(stationId, cameraFeed, timestamp, active) {
      const existing = statusStore.get(stationId) ?? null;
      const nextStatus: LiveStationStatus = {
        stationId,
        timestamp,
        sessionState: existing?.sessionState ?? (active ? "guiding-user" : "idle"),
        cameraFeedActive: active,
        currentDetectedItem: existing?.currentDetectedItem ?? null,
        currentDisposalMethod: existing?.currentDisposalMethod ?? null,
        currentHandZone: existing?.currentHandZone ?? null,
        deviceHealth: existing?.deviceHealth ?? DEFAULT_DEVICE_HEALTH,
        latestEvent: existing?.latestEvent ?? null,
        cameraFeed: cameraFeed ?? null
      };

      statusStore.set(stationId, nextStatus);
      return {
        status: existing ? "updated" : "created",
        statusDocument: nextStatus
      } satisfies LiveStatusWriteResult;
    },

    async getStatus(stationId) {
      return statusStore.get(stationId) ?? null;
    }
  };
}

export function createInMemoryStationRepository(
  stationStore: Map<string, StationMetadata>,
  rulesPresetStore: Map<string, RulesPreset>
): StationRepository {
  return {
    async listStations() {
      return [...stationStore.values()];
    },

    async getStation(stationId) {
      return stationStore.get(stationId) ?? null;
    },

    async getRulesPreset(presetId) {
      return rulesPresetStore.get(presetId) ?? null;
    }
  };
}

export function createInMemoryAnalyticsRollupRepository(
  rollupStore: Map<string, AnalyticsRollupDocument>
): AnalyticsRollupRepository {
  return {
    async getRollup(rollupId) {
      return rollupStore.get(rollupId) ?? null;
    },

    async upsertRollup(document) {
      rollupStore.set(document.rollupId, document);
      return document;
    },

    async listRollups() {
      return [...rollupStore.values()];
    }
  };
}

export function createInMemoryPhase2Repositories(seed: InMemoryRepositorySeed = {}) {
  const eventStore = new Map((seed.events ?? []).map((record) => [record.eventId, record]));
  const statusStore = new Map((seed.liveStatuses ?? []).map((status) => [status.stationId, status]));
  const stationStore = new Map((seed.stations ?? []).map((station) => [station.stationId, station]));
  const rulesPresetStore = new Map((seed.rulesPresets ?? []).map((preset) => [preset.presetId, preset]));
  const rollupStore = new Map((seed.rollups ?? []).map((rollup) => [rollup.rollupId, rollup]));

  return {
    disposalEventRepository: createInMemoryDisposalEventRepository(eventStore, stationStore),
    liveStatusRepository: createInMemoryLiveStatusRepository(statusStore),
    stationRepository: createInMemoryStationRepository(stationStore, rulesPresetStore),
    analyticsRollupRepository: createInMemoryAnalyticsRollupRepository(rollupStore)
  };
}
