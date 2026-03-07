import { ANALYTICS_EXPERIMENT_DIMENSIONS, createBuildingDayRollupId, createExperimentDayRollupId, createFloorDayRollupId, createStationDayRollupId } from "../../firestore/collections.js";

import type { DisposalEvent } from "@binsight/contracts";

import type {
  AnalyticsRollupDocument,
  AnalyticsRollupRepository,
  DisposalEventRecord,
  StationRepository
} from "../../firestore/repositories/types.js";
import { FunctionError } from "../../functions/runtime.js";

import { applyDisposalEventToRollup, createDayKey, createEmptyRollup } from "../mappers/event-rollup.js";

export interface AnalyticsMaterializer {
  materializeEvent(record: DisposalEventRecord): Promise<readonly AnalyticsRollupDocument[]>;
}

export interface AnalyticsMaterializerDependencies {
  readonly analyticsRollupRepository: AnalyticsRollupRepository;
  readonly stationRepository: StationRepository;
}

function createStationRollupSeeds(event: DisposalEvent, station: Awaited<ReturnType<StationRepository["getStation"]>>) {
  if (!station) {
    throw new FunctionError(404, "station-metadata", `Station metadata not found for ${event.stationId}.`);
  }

  const dayKey = createDayKey(event.timestamp);
  const shared = {
    dayKey,
    stationId: station.stationId,
    buildingId: station.buildingId,
    floorId: station.floorId,
    locationLabel: station.locationLabel,
    signageVariant: station.signageVariant,
    layoutVariant: station.layoutVariant
  } as const;

  const seeds: AnalyticsRollupDocument[] = [
    createEmptyRollup({
      ...shared,
      rollupId: createStationDayRollupId(station.stationId, dayKey),
      scopeType: "station",
      scopeId: station.stationId,
      scopeLabel: station.stationName
    }),
    createEmptyRollup({
      ...shared,
      rollupId: createFloorDayRollupId(station.buildingId, station.floorId, dayKey),
      scopeType: "floor",
      scopeId: `${station.buildingId}:${station.floorId}`,
      scopeLabel: `${station.buildingLabel} / ${station.floorLabel}`
    }),
    createEmptyRollup({
      ...shared,
      rollupId: createBuildingDayRollupId(station.buildingId, dayKey),
      scopeType: "building",
      scopeId: station.buildingId,
      scopeLabel: station.buildingLabel
    })
  ];

  for (const dimension of ANALYTICS_EXPERIMENT_DIMENSIONS) {
    const experimentValue = station[dimension];
    seeds.push(
      createEmptyRollup({
        ...shared,
        rollupId: createExperimentDayRollupId(dimension, experimentValue, dayKey),
        scopeType: "experiment",
        scopeId: `${dimension}:${experimentValue}`,
        scopeLabel: experimentValue,
        experimentDimension: dimension,
        experimentValue
      })
    );
  }

  return seeds;
}

export function createAnalyticsMaterializer(
  dependencies: AnalyticsMaterializerDependencies
): AnalyticsMaterializer {
  return {
    async materializeEvent(record) {
      const station = await dependencies.stationRepository.getStation(record.event.stationId);
      const seeds = createStationRollupSeeds(record.event, station);
      const results: AnalyticsRollupDocument[] = [];

      for (const seed of seeds) {
        const existing = await dependencies.analyticsRollupRepository.getRollup(seed.rollupId);
        const updated = applyDisposalEventToRollup(existing ?? seed, record.event);
        results.push(await dependencies.analyticsRollupRepository.upsertRollup(updated));
      }

      return results;
    }
  };
}
