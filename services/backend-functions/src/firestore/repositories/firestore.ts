import type {
  DisposalEvent,
  EventHistoryQuery,
  LiveStationStatus,
  RulesPreset,
  StationMetadata
} from "@binbuddy/contracts";

import type {
  CollectionReference,
  DocumentData,
  Firestore,
  FirestoreDataConverter,
  Query,
  QueryDocumentSnapshot
} from "firebase-admin/firestore";

import {
  ANALYTICS_EXPERIMENT_DIMENSIONS,
  FIRESTORE_COLLECTIONS,
  disposalEventDocumentPath,
  stationLiveStatusDocumentPath,
  stationDocumentPath,
  rulesPresetDocumentPath
} from "../collections.js";
import {
  disposalEventConverter,
  liveStationStatusConverter,
  rulesPresetConverter,
  stationMetadataConverter,
  type FirestoreDocument
} from "../converters.js";

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

function cloneValue<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function createAdminConverter<TModel>(
  converter: {
    toFirestore(model: TModel): FirestoreDocument;
    fromFirestore(document: FirestoreDocument): TModel;
  }
): FirestoreDataConverter<TModel> {
  return {
    toFirestore(modelObject) {
      return converter.toFirestore(modelObject) as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>) {
      return converter.fromFirestore(snapshot.data() as FirestoreDocument);
    }
  };
}

const disposalEventAdminConverter = createAdminConverter(disposalEventConverter);
const liveStationStatusAdminConverter = createAdminConverter(liveStationStatusConverter);
const stationMetadataAdminConverter = createAdminConverter(stationMetadataConverter);
const rulesPresetAdminConverter = createAdminConverter(rulesPresetConverter);

const analyticsRollupAdminConverter: FirestoreDataConverter<AnalyticsRollupDocument> = {
  toFirestore(modelObject) {
    return cloneValue(modelObject) as unknown as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>) {
    return cloneValue(snapshot.data() as unknown as AnalyticsRollupDocument);
  }
};

function matchesStringFilter(candidate: string, filters?: readonly string[]): boolean {
  return !filters || filters.length === 0 || filters.includes(candidate);
}

function matchesEventQuery(
  event: DisposalEvent,
  station: StationMetadata | undefined,
  query: EventHistoryQuery
): boolean {
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

function isAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    ("code" in error && (error as { code?: unknown }).code === 6)
    || error.message.toLowerCase().includes("already exists")
  );
}

function isMissingDocument(snapshot: { exists: boolean }): boolean {
  return snapshot.exists !== true;
}

function requireSnapshotData<TValue>(snapshot: { data(): TValue | undefined }, message: string): TValue {
  const value = snapshot.data();
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

function applyQueryBounds<TValue>(
  baseQuery: Query<TValue>,
  query: EventHistoryQuery,
  stationIdsFromMetadata?: readonly string[]
): Query<TValue> {
  let nextQuery = baseQuery
    .where("timestamp", ">=", query.timeRange.start)
    .where("timestamp", "<=", query.timeRange.end)
    .orderBy("timestamp", "desc");

  const stationIds = stationIdsFromMetadata ?? query.stationIds;
  if (stationIds && stationIds.length === 1) {
    nextQuery = nextQuery.where("stationId", "==", stationIds[0]);
  }

  if (query.attemptResults && query.attemptResults.length === 1) {
    nextQuery = nextQuery.where("attemptResult", "==", query.attemptResults[0]);
  }

  if (query.cursor) {
    nextQuery = nextQuery.startAfter(query.cursor);
  }

  return nextQuery.limit((query.pageSize ?? 50) * 5);
}

export class FirestoreDisposalEventRepository implements DisposalEventRepository {
  private readonly events: CollectionReference<DisposalEvent>;

  private readonly stations: CollectionReference<StationMetadata>;

  constructor(firestore: Firestore) {
    this.events = firestore
      .collection(FIRESTORE_COLLECTIONS.disposalEvents)
      .withConverter(disposalEventAdminConverter);
    this.stations = firestore
      .collection(FIRESTORE_COLLECTIONS.stations)
      .withConverter(stationMetadataAdminConverter);
  }

  async saveEvent(eventId: string, event: DisposalEvent): Promise<DisposalEventWriteResult> {
    const document = this.events.doc(eventId);

    try {
      await document.create(event);
      return {
        status: "created",
        record: {
          eventId,
          event,
          writtenAt: new Date().toISOString()
        }
      };
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }

      const existing = await document.get();
      if (isMissingDocument(existing)) {
        throw error;
      }

      return {
        status: "duplicate",
        record: {
          eventId,
          event: requireSnapshotData(existing, `Existing disposal event ${eventId} was missing data.`),
          writtenAt: new Date().toISOString()
        }
      };
    }
  }

  async listEvents(query: EventHistoryQuery): Promise<readonly DisposalEventRecord[]> {
    let stationIdsFromMetadata: readonly string[] | undefined;
    const requiresStationMetadataFiltering = Boolean(
      query.buildingIds?.length
      || query.floorIds?.length
      || query.locationLabels?.length
      || query.signageVariants?.length
      || query.layoutVariants?.length
    );

    const stationsById = new Map<string, StationMetadata>();
    if (requiresStationMetadataFiltering) {
      const stationSnapshots = await this.stations.get();
      for (const snapshot of stationSnapshots.docs) {
        const station = snapshot.data();
        if (
          matchesStringFilter(station.buildingId, query.buildingIds)
          && matchesStringFilter(station.floorId, query.floorIds)
          && matchesStringFilter(station.locationLabel, query.locationLabels)
          && matchesStringFilter(station.signageVariant, query.signageVariants)
          && matchesStringFilter(station.layoutVariant, query.layoutVariants)
        ) {
          stationsById.set(station.stationId, station);
        }
      }

      stationIdsFromMetadata = [...stationsById.keys()];
      if (stationIdsFromMetadata.length === 0) {
        return [];
      }
    }

    const snapshots = await applyQueryBounds(this.events, query, stationIdsFromMetadata).get();
    const records = snapshots.docs.map((snapshot) => ({
      eventId: snapshot.id,
      event: snapshot.data(),
      writtenAt: new Date().toISOString()
    } satisfies DisposalEventRecord));

    const filtered = records.filter((record) => matchesEventQuery(record.event, stationsById.get(record.event.stationId), query));
    return filtered.slice(0, query.pageSize ?? 50);
  }

  async getEvent(eventId: string): Promise<DisposalEventRecord | null> {
    const snapshot = await this.events.doc(eventId).get();
    if (isMissingDocument(snapshot)) {
      return null;
    }

    return {
      eventId,
      event: requireSnapshotData(snapshot, `Disposal event ${eventId} was missing data.`),
      writtenAt: new Date().toISOString()
    };
  }
}

export class FirestoreLiveStatusRepository implements LiveStatusRepository {
  private readonly statuses: CollectionReference<LiveStationStatus>;

  constructor(firestore: Firestore) {
    this.statuses = firestore
      .collection(FIRESTORE_COLLECTIONS.stationLiveStatus)
      .withConverter(liveStationStatusAdminConverter);
  }

  async upsertStatus(status: LiveStationStatus): Promise<LiveStatusWriteResult> {
    const document = this.statuses.doc(status.stationId);
    const existing = await document.get();
    const merged = mergeStatus(
      isMissingDocument(existing)
        ? null
        : requireSnapshotData(existing, `Live status ${status.stationId} was missing data.`),
      status
    );
    await document.set(merged, { merge: true });

    return {
      status: isMissingDocument(existing) ? "created" : "updated",
      statusDocument: merged
    };
  }

  async patchCameraFeed(
    stationId: string,
    cameraFeed: LiveStationStatus["cameraFeed"],
    timestamp: string,
    active: boolean
  ): Promise<LiveStatusWriteResult> {
    const document = this.statuses.doc(stationId);
    const existing = await document.get();
    const previous = isMissingDocument(existing)
      ? null
      : requireSnapshotData(existing, `Live status ${stationId} was missing data.`);
    const nextStatus: LiveStationStatus = {
      stationId,
      timestamp,
      sessionState: previous?.sessionState ?? (active ? "guiding-user" : "idle"),
      cameraFeedActive: active,
      currentDetectedItem: previous?.currentDetectedItem ?? null,
      currentDisposalMethod: previous?.currentDisposalMethod ?? null,
      currentHandZone: previous?.currentHandZone ?? null,
      deviceHealth: previous?.deviceHealth ?? {
        pi: "offline",
        esp8266: "offline",
        cloudSync: active ? "online" : "degraded"
      },
      latestEvent: previous?.latestEvent ?? null,
      cameraFeed: cameraFeed ?? null
    };

    await document.set(nextStatus, { merge: true });
    return {
      status: previous ? "updated" : "created",
      statusDocument: nextStatus
    };
  }

  async getStatus(stationId: string): Promise<LiveStationStatus | null> {
    const snapshot = await this.statuses.doc(stationId).get();
    return isMissingDocument(snapshot)
      ? null
      : requireSnapshotData(snapshot, `Live status ${stationId} was missing data.`);
  }
}

export class FirestoreStationRepository implements StationRepository {
  private readonly stations: CollectionReference<StationMetadata>;

  private readonly rulesPresets: CollectionReference<RulesPreset>;

  constructor(firestore: Firestore) {
    this.stations = firestore
      .collection(FIRESTORE_COLLECTIONS.stations)
      .withConverter(stationMetadataAdminConverter);
    this.rulesPresets = firestore
      .collection(FIRESTORE_COLLECTIONS.rulesPresets)
      .withConverter(rulesPresetAdminConverter);
  }

  async listStations(): Promise<readonly StationMetadata[]> {
    const snapshot = await this.stations.get();
    return snapshot.docs.map((document) => document.data());
  }

  async getStation(stationId: string): Promise<StationMetadata | null> {
    const snapshot = await this.stations.doc(stationId).get();
    return isMissingDocument(snapshot)
      ? null
      : requireSnapshotData(snapshot, `Station ${stationId} was missing data.`);
  }

  async getRulesPreset(presetId: string): Promise<RulesPreset | null> {
    const snapshot = await this.rulesPresets.doc(presetId).get();
    return isMissingDocument(snapshot)
      ? null
      : requireSnapshotData(snapshot, `Rules preset ${presetId} was missing data.`);
  }
}

export class FirestoreAnalyticsRollupRepository implements AnalyticsRollupRepository {
  private readonly collections: readonly CollectionReference<AnalyticsRollupDocument>[];

  constructor(firestore: Firestore) {
    this.collections = [
      FIRESTORE_COLLECTIONS.analyticsStationDay,
      FIRESTORE_COLLECTIONS.analyticsFloorDay,
      FIRESTORE_COLLECTIONS.analyticsBuildingDay,
      FIRESTORE_COLLECTIONS.analyticsExperimentDay
    ].map((collectionName) => firestore.collection(collectionName).withConverter(analyticsRollupAdminConverter));
  }

  async getRollup(rollupId: string): Promise<AnalyticsRollupDocument | null> {
    for (const collection of this.collections) {
      const snapshot = await collection.doc(rollupId).get();
      if (!isMissingDocument(snapshot)) {
        return requireSnapshotData(snapshot, `Analytics rollup ${rollupId} was missing data.`);
      }
    }

    return null;
  }

  async upsertRollup(document: AnalyticsRollupDocument): Promise<AnalyticsRollupDocument> {
    const collection = this.collections.find((candidate) => candidate.id === this.resolveCollectionName(document));
    if (!collection) {
      throw new Error(`Unsupported analytics rollup scope ${document.scopeType}.`);
    }

    await collection.doc(document.rollupId).set(document, { merge: false });
    return document;
  }

  async listRollups(): Promise<readonly AnalyticsRollupDocument[]> {
    const snapshots = await Promise.all(this.collections.map(async (collection) => collection.get()));
    return snapshots.flatMap((snapshot) => snapshot.docs.map((document) => document.data()));
  }

  private resolveCollectionName(document: AnalyticsRollupDocument): string {
    switch (document.scopeType) {
      case "station":
        return FIRESTORE_COLLECTIONS.analyticsStationDay;
      case "floor":
        return FIRESTORE_COLLECTIONS.analyticsFloorDay;
      case "building":
        return FIRESTORE_COLLECTIONS.analyticsBuildingDay;
      case "experiment":
        return FIRESTORE_COLLECTIONS.analyticsExperimentDay;
      default:
        return FIRESTORE_COLLECTIONS.analyticsExperimentDay;
    }
  }
}

export function createFirestorePhase2Repositories(firestore: Firestore) {
  const stationRepository = new FirestoreStationRepository(firestore);

  return {
    disposalEventRepository: new FirestoreDisposalEventRepository(firestore),
    liveStatusRepository: new FirestoreLiveStatusRepository(firestore),
    stationRepository,
    analyticsRollupRepository: new FirestoreAnalyticsRollupRepository(firestore)
  };
}

export function createDocumentReferencePaths() {
  return {
    disposalEventDocumentPath,
    rulesPresetDocumentPath,
    stationDocumentPath,
    stationLiveStatusDocumentPath
  };
}