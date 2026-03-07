import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const COLLECTIONS = {
  stations: "stations",
  rulesPresets: "rulesPresets",
  stationLiveStatus: "stationLiveStatus",
  disposalEvents: "disposalEvents",
  analyticsMaterializationLedger: "analyticsMaterializationLedger",
  analyticsStationDay: "analyticsStationDay",
  analyticsFloorDay: "analyticsFloorDay",
  analyticsBuildingDay: "analyticsBuildingDay",
  analyticsExperimentDay: "analyticsExperimentDay"
};

const SEED_REFERENCE_DATE = new Date("2026-03-07T15:00:00.000Z");

const STATIONS = [
  {
    stationId: "demo-station-001",
    stationName: "Ottawa Demo Station",
    buildingId: "ottawa-hq",
    buildingLabel: "Ottawa HQ",
    floorId: "floor-01",
    floorLabel: "Floor 1",
    locationLabel: "Cafeteria South",
    signageVariant: "photo-poster-v2",
    layoutVariant: "entry-left"
  },
  {
    stationId: "demo-station-002",
    stationName: "Ottawa Comparison Station",
    buildingId: "ottawa-hq",
    buildingLabel: "Ottawa HQ",
    floorId: "floor-02",
    floorLabel: "Floor 2",
    locationLabel: "Cafeteria North",
    signageVariant: "text-poster-v1",
    layoutVariant: "entry-left"
  },
  {
    stationId: "demo-station-003",
    stationName: "Commons Station",
    buildingId: "student-commons",
    buildingLabel: "Student Commons",
    floorId: "floor-01",
    floorLabel: "Ground Floor",
    locationLabel: "Food Hall",
    signageVariant: "photo-poster-v2",
    layoutVariant: "center-island"
  }
];

const ZONE_TO_METHOD = {
  left: "recycle",
  middle: "compost",
  right: "garbage"
};

const ITEM_TO_METHOD = {
  "plastic-bottle": "recycle",
  "paper-takeout-container": "recycle",
  "banana-peel": "compost",
  "apple-core": "compost",
  "coffee-cup": "garbage",
  "pizza-box": "garbage",
  "unknown-item": "garbage",
  "fallback-item": "garbage"
};

const STATION_SCENARIOS = {
  "demo-station-001": {
    dayOffsets: [5, 4, 3, 2, 1],
    plansByDay: [
      [true, false, true, false, true, false],
      [true, true, false, true, false, true],
      [true, true, false, true, true, false],
      [true, true, true, true, false, true],
      [true, true, true, true, true, false]
    ]
  },
  "demo-station-002": {
    dayOffsets: [5, 4, 3, 2, 1],
    plansByDay: [
      [true, false, false, true, false, false],
      [true, false, false, true, false, true],
      [true, false, true, false, false, true],
      [true, true, false, true, false, false],
      [true, true, false, true, false, true]
    ]
  },
  "demo-station-003": {
    dayOffsets: [5, 4, 3, 2, 1],
    plansByDay: [
      [true, true, true, false, true, true],
      [true, true, true, true, true, false],
      [true, true, true, true, true, false],
      [true, true, true, true, true, true],
      [true, true, true, true, true, true]
    ]
  }
};

const EVENT_BLUEPRINTS = [
  { hour: 8, minute: 10, item: "coffee-cup", failureZone: "left" },
  { hour: 10, minute: 5, item: "plastic-bottle", failureZone: "right" },
  { hour: 11, minute: 40, item: "banana-peel", failureZone: "right" },
  { hour: 12, minute: 15, item: "paper-takeout-container", failureZone: "middle" },
  { hour: 14, minute: 5, item: "apple-core", failureZone: "left" },
  { hour: 16, minute: 25, item: "pizza-box", failureZone: "left" }
];

function createMetricTotals(totalAttempts = 0, totalCorrectSorts = 0) {
  const rate = totalAttempts === 0 ? 0 : totalCorrectSorts / totalAttempts;
  return {
    totalAttempts,
    totalCorrectSorts,
    firstTryCorrectRate: rate,
    participationComplianceScore: rate
  };
}

function createEmptyMethodMetrics() {
  return {
    recycle: { totalAttempts: 0, correctAttempts: 0 },
    compost: { totalAttempts: 0, correctAttempts: 0 },
    garbage: { totalAttempts: 0, correctAttempts: 0 }
  };
}

function createDayKey(timestamp) {
  return timestamp.slice(0, 10).replace(/-/g, "");
}

function createHourBucketStart(timestamp) {
  const date = new Date(timestamp);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function createEventId(stationId, timestamp, predictedItem) {
  return `${stationId}_${timestamp}_${predictedItem.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

function createRollupId(scopeType, scopeId, dayKey, dimension, value) {
  if (scopeType === "station") {
    return `${scopeId}_${dayKey}`;
  }
  if (scopeType === "floor") {
    const [buildingId, floorId] = scopeId.split(":", 2);
    return `${buildingId}_${floorId}_${dayKey}`;
  }
  if (scopeType === "building") {
    return `${scopeId}_${dayKey}`;
  }
  return `${dimension}_${value}_${dayKey}`;
}

function createEmptyRollup(seed) {
  return {
    ...seed,
    totals: createMetricTotals(),
    contaminationItems: {},
    hourlyBuckets: {},
    updatedAt: SEED_REFERENCE_DATE.toISOString()
  };
}

function applyEventToRollup(rollup, event) {
  const correctSort = event.attemptResult === "success";
  const bucketStart = createHourBucketStart(event.timestamp);
  const existingBucket = rollup.hourlyBuckets[bucketStart];
  const nextMethodMetrics = {
    ...(existingBucket?.byDisposalMethod ?? createEmptyMethodMetrics())
  };
  nextMethodMetrics[event.correctDisposalMethod] = {
    totalAttempts: nextMethodMetrics[event.correctDisposalMethod].totalAttempts + 1,
    correctAttempts: nextMethodMetrics[event.correctDisposalMethod].correctAttempts + (correctSort ? 1 : 0)
  };

  return {
    ...rollup,
    totals: createMetricTotals(
      rollup.totals.totalAttempts + 1,
      rollup.totals.totalCorrectSorts + (correctSort ? 1 : 0)
    ),
    contaminationItems: correctSort
      ? rollup.contaminationItems
      : {
          ...rollup.contaminationItems,
          [event.predictedItem]: (rollup.contaminationItems[event.predictedItem] ?? 0) + 1
        },
    hourlyBuckets: {
      ...rollup.hourlyBuckets,
      [bucketStart]: {
        bucketStart,
        bucketLabel: bucketStart.slice(11, 16),
        totalAttempts: (existingBucket?.totalAttempts ?? 0) + 1,
        correctAttempts: (existingBucket?.correctAttempts ?? 0) + (correctSort ? 1 : 0),
        byDisposalMethod: nextMethodMetrics
      }
    },
    updatedAt: SEED_REFERENCE_DATE.toISOString()
  };
}

function createSeededEvent(stationId, date, blueprint, success) {
  const predictedItem = blueprint.item;
  const correctDisposalMethod = ITEM_TO_METHOD[predictedItem];
  const actualDisposalZone = success
    ? Object.entries(ZONE_TO_METHOD).find(([, method]) => method === correctDisposalMethod)?.[0]
    : blueprint.failureZone;

  if (!actualDisposalZone) {
    throw new Error(`Could not resolve actual disposal zone for ${predictedItem}.`);
  }

  const timestamp = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    blueprint.hour,
    blueprint.minute,
    0,
    0
  )).toISOString();

  return {
    eventId: createEventId(stationId, timestamp, predictedItem),
    event: {
      stationId,
      timestamp,
      predictedItem,
      correctDisposalMethod,
      actualDisposalZone,
      attemptResult: success ? "success" : "failure",
      modelConfidence: success ? 0.93 : 0.72,
      llmFallbackUsed: predictedItem === "unknown-item" || predictedItem === "fallback-item"
    }
  };
}

function buildSeedDataset() {
  const stationById = new Map(STATIONS.map((station) => [station.stationId, station]));
  const events = [];

  for (const [stationId, scenario] of Object.entries(STATION_SCENARIOS)) {
    scenario.dayOffsets.forEach((dayOffset, index) => {
      const date = new Date(SEED_REFERENCE_DATE);
      date.setUTCDate(date.getUTCDate() - dayOffset);
      const dayPlan = scenario.plansByDay[index];

      dayPlan.forEach((success, eventIndex) => {
        const blueprint = EVENT_BLUEPRINTS[eventIndex % EVENT_BLUEPRINTS.length];
        events.push(createSeededEvent(stationId, date, blueprint, success));
      });
    });
  }

  events.sort((left, right) => left.event.timestamp.localeCompare(right.event.timestamp));

  const latestEventsByStation = new Map();
  for (const entry of events) {
    latestEventsByStation.set(entry.event.stationId, entry.event);
  }

  const liveStatuses = STATIONS.map((station) => {
    const latestEvent = latestEventsByStation.get(station.stationId) ?? null;

    if (station.stationId === "demo-station-001") {
      return {
        stationId: station.stationId,
        timestamp: SEED_REFERENCE_DATE.toISOString(),
        sessionState: "guiding-user",
        cameraFeedActive: false,
        currentDetectedItem: "plastic-bottle",
        currentDisposalMethod: "recycle",
        currentHandZone: "left",
        deviceHealth: {
          pi: "online",
          esp8266: "online",
          cloudSync: "online"
        },
        latestEvent: latestEvent
          ? {
              timestamp: latestEvent.timestamp,
              predictedItem: latestEvent.predictedItem,
              correctDisposalMethod: latestEvent.correctDisposalMethod,
              actualDisposalZone: latestEvent.actualDisposalZone,
              attemptResult: latestEvent.attemptResult
            }
          : null
      };
    }

    return {
      stationId: station.stationId,
      timestamp: SEED_REFERENCE_DATE.toISOString(),
      sessionState: "idle",
      cameraFeedActive: false,
      currentDetectedItem: null,
      currentDisposalMethod: null,
      currentHandZone: null,
      deviceHealth: {
        pi: "online",
        esp8266: station.stationId === "demo-station-002" ? "degraded" : "online",
        cloudSync: "online"
      },
      latestEvent: latestEvent
        ? {
            timestamp: latestEvent.timestamp,
            predictedItem: latestEvent.predictedItem,
            correctDisposalMethod: latestEvent.correctDisposalMethod,
            actualDisposalZone: latestEvent.actualDisposalZone,
            attemptResult: latestEvent.attemptResult
          }
        : null
    };
  });

  const rollups = materializeRollups(events.map((entry) => entry.event), stationById);

  return {
    events,
    liveStatuses,
    rollups
  };
}

function materializeRollups(events, stationById) {
  const rollups = new Map();
  const dimensions = ["locationLabel", "signageVariant", "layoutVariant"];

  for (const event of events) {
    const station = stationById.get(event.stationId);
    if (!station) {
      throw new Error(`Station metadata missing for ${event.stationId}.`);
    }

    const dayKey = createDayKey(event.timestamp);
    const seeds = [
      {
        collection: COLLECTIONS.analyticsStationDay,
        rollupId: createRollupId("station", station.stationId, dayKey),
        document: createEmptyRollup({
          rollupId: createRollupId("station", station.stationId, dayKey),
          scopeType: "station",
          scopeId: station.stationId,
          scopeLabel: station.stationName,
          dayKey,
          stationId: station.stationId,
          buildingId: station.buildingId,
          floorId: station.floorId,
          locationLabel: station.locationLabel,
          signageVariant: station.signageVariant,
          layoutVariant: station.layoutVariant
        })
      },
      {
        collection: COLLECTIONS.analyticsFloorDay,
        rollupId: createRollupId("floor", `${station.buildingId}:${station.floorId}`, dayKey),
        document: createEmptyRollup({
          rollupId: createRollupId("floor", `${station.buildingId}:${station.floorId}`, dayKey),
          scopeType: "floor",
          scopeId: `${station.buildingId}:${station.floorId}`,
          scopeLabel: `${station.buildingLabel} / ${station.floorLabel}`,
          dayKey,
          stationId: station.stationId,
          buildingId: station.buildingId,
          floorId: station.floorId,
          locationLabel: station.locationLabel,
          signageVariant: station.signageVariant,
          layoutVariant: station.layoutVariant
        })
      },
      {
        collection: COLLECTIONS.analyticsBuildingDay,
        rollupId: createRollupId("building", station.buildingId, dayKey),
        document: createEmptyRollup({
          rollupId: createRollupId("building", station.buildingId, dayKey),
          scopeType: "building",
          scopeId: station.buildingId,
          scopeLabel: station.buildingLabel,
          dayKey,
          stationId: station.stationId,
          buildingId: station.buildingId,
          floorId: station.floorId,
          locationLabel: station.locationLabel,
          signageVariant: station.signageVariant,
          layoutVariant: station.layoutVariant
        })
      }
    ];

    for (const dimension of dimensions) {
      const value = station[dimension];
      const rollupId = createRollupId("experiment", `${dimension}:${value}`, dayKey, dimension, value);
      seeds.push({
        collection: COLLECTIONS.analyticsExperimentDay,
        rollupId,
        document: createEmptyRollup({
          rollupId,
          scopeType: "experiment",
          scopeId: `${dimension}:${value}`,
          scopeLabel: value,
          dayKey,
          stationId: station.stationId,
          buildingId: station.buildingId,
          floorId: station.floorId,
          locationLabel: station.locationLabel,
          signageVariant: station.signageVariant,
          layoutVariant: station.layoutVariant,
          experimentDimension: dimension,
          experimentValue: value
        })
      });
    }

    for (const seed of seeds) {
      const key = `${seed.collection}/${seed.rollupId}`;
      const existing = rollups.get(key)?.document ?? seed.document;
      rollups.set(key, {
        collection: seed.collection,
        rollupId: seed.rollupId,
        document: applyEventToRollup(existing, event)
      });
    }
  }

  return [...rollups.values()];
}

async function loadOttawaPreset() {
  const presetPath = path.join(repoRoot, "packages/rules/presets/demo-canada-ottawa.1.0.0.json");
  const presetJson = await readFile(presetPath, "utf8");
  return JSON.parse(presetJson);
}

async function commitInChunks(firestore, writes) {
  const chunkSize = 400;
  for (let index = 0; index < writes.length; index += chunkSize) {
    const batch = firestore.batch();
    const chunk = writes.slice(index, index + chunkSize);
    for (const write of chunk) {
      write(batch);
    }
    await batch.commit();
  }
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required for the demo seed workflow.");
  }

  const storageBucket = process.env.BINSIGHT_STORAGE_BUCKET;
  initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket
  });

  const firestore = getFirestore();
  const preset = await loadOttawaPreset();
  const dataset = buildSeedDataset();

  const writes = [];
  writes.push((batch) => {
    batch.set(
      firestore.collection(COLLECTIONS.rulesPresets).doc(preset.presetId),
      preset,
      { merge: true }
    );
  });

  for (const station of STATIONS) {
    writes.push((batch) => {
      batch.set(
        firestore.collection(COLLECTIONS.stations).doc(station.stationId),
        {
          ...station,
          activeRulesPresetId: preset.presetId
        },
        { merge: true }
      );
    });
  }

  for (const status of dataset.liveStatuses) {
    writes.push((batch) => {
      batch.set(
        firestore.collection(COLLECTIONS.stationLiveStatus).doc(status.stationId),
        status,
        { merge: true }
      );
    });
  }

  for (const entry of dataset.events) {
    writes.push((batch) => {
      batch.set(
        firestore.collection(COLLECTIONS.analyticsMaterializationLedger).doc(entry.eventId),
        {
          eventId: entry.eventId,
          createdAt: SEED_REFERENCE_DATE.toISOString(),
          source: "seed-demo-data"
        },
        { merge: true }
      );
      batch.set(
        firestore.collection(COLLECTIONS.disposalEvents).doc(entry.eventId),
        entry.event,
        { merge: true }
      );
    });
  }

  for (const rollup of dataset.rollups) {
    writes.push((batch) => {
      batch.set(
        firestore.collection(rollup.collection).doc(rollup.rollupId),
        rollup.document,
        { merge: false }
      );
    });
  }

  await commitInChunks(firestore, writes);

  console.log(JSON.stringify({
    projectId,
    presetId: preset.presetId,
    presetVersion: preset.version,
    stationsSeeded: STATIONS.length,
    liveStatusesSeeded: dataset.liveStatuses.length,
    eventsSeeded: dataset.events.length,
    rollupsSeeded: dataset.rollups.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});