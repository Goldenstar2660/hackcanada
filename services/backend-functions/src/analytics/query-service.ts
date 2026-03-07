import type {
  AnalyticsGroupingDimension,
  AnalyticsQuery,
  AnalyticsSummary,
  EventHistoryQuery,
  EventHistoryResponse,
  StationDirectoryResponse,
  StationRecord
} from "@binbuddy/contracts";

import { DIRECT_OPERATOR_READ_COLLECTIONS } from "../firestore/collections.js";
import { joinStationRecord } from "../domain/contracts.js";
import { FunctionError } from "../functions/runtime.js";

import type {
  AnalyticsRollupDocument,
  AnalyticsRollupRepository,
  DisposalEventRepository,
  StationRepository
} from "../firestore/repositories/types.js";
import {
  aggregateRollups,
  createBinPurity,
  createChartSeries,
  createLeaderboardEntries,
  createMetricTotals,
  createTopContaminationItems,
  createWorstTimesOfDay,
  matchesStationFilters
} from "./mappers/event-rollup.js";

export interface DashboardQueryService {
  getAnalyticsSummary(query: AnalyticsQuery): Promise<AnalyticsSummary>;
  getEventHistory(query: EventHistoryQuery): Promise<EventHistoryResponse>;
  getStationDirectory(): Promise<StationDirectoryResponse>;
}

export interface DashboardQueryServiceDependencies {
  readonly analyticsRollupRepository: AnalyticsRollupRepository;
  readonly disposalEventRepository: DisposalEventRepository;
  readonly stationRepository: StationRepository;
}

function normalizeStationRecords(stations: readonly Awaited<ReturnType<StationRepository["getStation"]>>[], presetsById: Map<string, Awaited<ReturnType<StationRepository["getRulesPreset"]>>>) {
  const records: StationRecord[] = [];
  for (const station of stations) {
    if (!station) {
      continue;
    }

    const preset = presetsById.get(station.activeRulesPresetId);
    if (!preset) {
      throw new FunctionError(500, "station-directory-preset", `Missing rules preset ${station.activeRulesPresetId} for station ${station.stationId}.`);
    }

    records.push(joinStationRecord(station, preset));
  }

  return records;
}

function rollupMatchesQuery(rollup: AnalyticsRollupDocument, stationIds: ReadonlySet<string>, query: AnalyticsQuery): boolean {
  const dayKeyStart = query.timeRange.start.slice(0, 10).replace(/-/g, "");
  const dayKeyEnd = query.timeRange.end.slice(0, 10).replace(/-/g, "");

  if (rollup.dayKey < dayKeyStart || rollup.dayKey > dayKeyEnd) {
    return false;
  }

  if (rollup.stationId && stationIds.size > 0 && !stationIds.has(rollup.stationId)) {
    return false;
  }

  if (query.buildingIds && query.buildingIds.length > 0 && rollup.buildingId && !query.buildingIds.includes(rollup.buildingId)) {
    return false;
  }

  if (query.floorIds && query.floorIds.length > 0 && rollup.floorId && !query.floorIds.includes(rollup.floorId)) {
    return false;
  }

  if (query.locationLabels && query.locationLabels.length > 0 && rollup.locationLabel && !query.locationLabels.includes(rollup.locationLabel)) {
    return false;
  }

  if (query.signageVariants && query.signageVariants.length > 0 && rollup.signageVariant && !query.signageVariants.includes(rollup.signageVariant)) {
    return false;
  }

  if (query.layoutVariants && query.layoutVariants.length > 0 && rollup.layoutVariant && !query.layoutVariants.includes(rollup.layoutVariant)) {
    return false;
  }

  return true;
}

function resolveGroupedScope(groupBy: readonly AnalyticsGroupingDimension[] | undefined, compareBy: AnalyticsGroupingDimension | null | undefined) {
  const dimension = compareBy ?? groupBy?.[0] ?? null;
  switch (dimension) {
    case "buildingId":
      return { scopeType: "building", experimentDimension: null } as const;
    case "floorId":
      return { scopeType: "floor", experimentDimension: null } as const;
    case "locationLabel":
    case "signageVariant":
    case "layoutVariant":
      return { scopeType: "experiment", experimentDimension: dimension } as const;
    case "stationId":
    default:
      return { scopeType: "station", experimentDimension: null } as const;
  }
}

export function createDashboardQueryService(
  dependencies: DashboardQueryServiceDependencies
): DashboardQueryService {
  return {
    async getAnalyticsSummary(query) {
      const stations = await dependencies.stationRepository.listStations();
      const matchingStations = stations.filter((station) => matchesStationFilters(station, query));
      const stationIds = new Set(matchingStations.map((station) => station.stationId));
      const rollups = await dependencies.analyticsRollupRepository.listRollups();
      const filteredStationRollups = rollups.filter(
        (rollup) => rollup.scopeType === "station" && rollupMatchesQuery(rollup, stationIds, query)
      );
      const aggregated = aggregateRollups(filteredStationRollups);
      const groupedScope = resolveGroupedScope(query.groupBy, query.compareBy);
      const groupedRollups = rollups.filter((rollup) => {
        if (rollup.scopeType !== groupedScope.scopeType) {
          return false;
        }

        if (groupedScope.experimentDimension && rollup.experimentDimension !== groupedScope.experimentDimension) {
          return false;
        }

        return rollupMatchesQuery(rollup, stationIds, query);
      });

      const groupedResults = [...groupedRollups.reduce((groups, rollup) => {
        const existing = groups.get(rollup.scopeId) ?? {
          groupKey: rollup.scopeId,
          groupLabel: rollup.scopeLabel,
          totals: createMetricTotals()
        };

        groups.set(rollup.scopeId, {
          groupKey: rollup.scopeId,
          groupLabel: rollup.scopeLabel,
          totals: createMetricTotals(
            existing.totals.totalAttempts + rollup.totals.totalAttempts,
            existing.totals.totalCorrectSorts + rollup.totals.totalCorrectSorts
          )
        });

        return groups;
      }, new Map<string, { groupKey: string; groupLabel: string; totals: AnalyticsSummary["totals"] }>()).values()].map((entry) => ({
        groupKey: entry.groupKey,
        groupLabel: entry.groupLabel,
        metrics: entry.totals
      }));

      const leaderboard = [
        ...(query.metrics.includes("floorLeaderboard") ? createLeaderboardEntries(rollups.filter((rollup) => rollupMatchesQuery(rollup, stationIds, query)), "floor") ?? [] : []),
        ...(query.metrics.includes("buildingLeaderboard") ? createLeaderboardEntries(rollups.filter((rollup) => rollupMatchesQuery(rollup, stationIds, query)), "building") ?? [] : [])
      ];

      return {
        generatedAt: new Date().toISOString(),
        timeRange: query.timeRange,
        totals: aggregated.totals,
        groupedResults: groupedResults.length > 0 ? groupedResults : undefined,
        topContaminationItems:
          query.metrics.includes("topContaminationItems")
            ? createTopContaminationItems(aggregated.contaminationItems)
            : undefined,
        worstTimesOfDay:
          query.metrics.includes("worstTimesOfDay")
            ? createWorstTimesOfDay(aggregated.hourlyBuckets)
            : undefined,
        binPurity:
          query.metrics.includes("binPurityByHour") || query.metrics.includes("binPurityByDay")
            ? createBinPurity(aggregated.hourlyBuckets, query.metrics.includes("binPurityByDay") ? "day" : (query.timeBucket ?? "hour"))
            : undefined,
        leaderboard: leaderboard.length > 0 ? leaderboard : undefined,
        chartSeries: createChartSeries(
          filteredStationRollups,
          query.metrics.filter((metric) => (
            metric === "totalAttempts"
            || metric === "totalCorrectSorts"
            || metric === "firstTryCorrectRate"
            || metric === "participationComplianceScore"
          )),
          query.timeBucket
        )
      };
    },

    async getEventHistory(query) {
      const entries = await dependencies.disposalEventRepository.listEvents(query);
      const stations = await dependencies.stationRepository.listStations();
      const stationsById = new Map(stations.map((station) => [station.stationId, station]));

      return {
        generatedAt: new Date().toISOString(),
        query,
        entries: entries.map((entry) => ({
          eventId: entry.eventId,
          event: entry.event,
          station: stationsById.get(entry.event.stationId) ?? {
            stationId: entry.event.stationId,
            stationName: entry.event.stationId,
            buildingId: "unknown",
            buildingLabel: "Unknown",
            floorId: "unknown",
            floorLabel: "Unknown",
            locationLabel: "Unknown",
            signageVariant: "unknown",
            layoutVariant: "unknown",
            activeRulesPresetId: "unknown",
            activeRulesPreset: null
          }
        })),
        nextCursor: entries.length === (query.pageSize ?? 50) ? entries.at(-1)?.eventId ?? null : null
      };
    },

    async getStationDirectory() {
      const stations = await dependencies.stationRepository.listStations();
      const presetsById = new Map(
        await Promise.all(
          [...new Set(stations.map((station) => station.activeRulesPresetId))].map(async (presetId) => [
            presetId,
            await dependencies.stationRepository.getRulesPreset(presetId)
          ] as const)
        )
      );
      const stationRecords = normalizeStationRecords(stations, presetsById);

      return {
        generatedAt: new Date().toISOString(),
        stations: stationRecords,
        filters: {
          buildings: [...new Map(stationRecords.map((station) => [station.buildingId, { id: station.buildingId, label: station.buildingLabel }])).values()],
          floors: [...new Map(stationRecords.map((station) => [
            `${station.buildingId}:${station.floorId}`,
            {
              id: station.floorId,
              label: station.floorLabel,
              buildingId: station.buildingId
            }
          ])).values()],
          locations: [...new Set(stationRecords.map((station) => station.locationLabel))].sort(),
          signageVariants: [...new Set(stationRecords.map((station) => station.signageVariant))].sort(),
          layoutVariants: [...new Set(stationRecords.map((station) => station.layoutVariant))].sort()
        },
        liveStatusCollectionPath: DIRECT_OPERATOR_READ_COLLECTIONS[0]
      };
    }
  };
}
