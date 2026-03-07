import type {
  AnalyticsQuery,
  AnalyticsSummary,
  DisposalEvent,
  DisposalMethod,
  MetricTotals,
  MetricKey,
  StationMetadata
} from "@binsight/contracts";

import type {
  AnalyticsBucketSummary,
  AnalyticsRollupDocument
} from "../../firestore/repositories/types.js";

type DispositionMetrics = Record<"recycle" | "compost" | "garbage", { totalAttempts: number; correctAttempts: number }>;

function createEmptyMethodMetrics(): DispositionMetrics {
  return {
    recycle: { totalAttempts: 0, correctAttempts: 0 },
    compost: { totalAttempts: 0, correctAttempts: 0 },
    garbage: { totalAttempts: 0, correctAttempts: 0 }
  };
}

export function createDayKey(timestamp: string): string {
  return timestamp.slice(0, 10).replace(/-/g, "");
}

export function createHourBucketStart(timestamp: string): string {
  const date = new Date(timestamp);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

export function createMetricTotals(totalAttempts = 0, totalCorrectSorts = 0): MetricTotals {
  const safeAttempts = totalAttempts <= 0 ? 0 : totalAttempts;
  const safeCorrectSorts = totalCorrectSorts <= 0 ? 0 : totalCorrectSorts;
  const rate = safeAttempts === 0 ? 0 : safeCorrectSorts / safeAttempts;

  return {
    totalAttempts: safeAttempts,
    totalCorrectSorts: safeCorrectSorts,
    firstTryCorrectRate: rate,
    participationComplianceScore: rate
  };
}

function incrementMethodMetrics(
  methodMetrics: DispositionMetrics,
  disposalMethod: DisposalMethod,
  correct: boolean
): DispositionMetrics {
  return {
    ...methodMetrics,
    [disposalMethod]: {
      totalAttempts: methodMetrics[disposalMethod].totalAttempts + 1,
      correctAttempts: methodMetrics[disposalMethod].correctAttempts + (correct ? 1 : 0)
    }
  };
}

export function createEmptyRollup(
  seed: Omit<AnalyticsRollupDocument, "totals" | "contaminationItems" | "hourlyBuckets" | "updatedAt">
): AnalyticsRollupDocument {
  return {
    ...seed,
    totals: createMetricTotals(),
    contaminationItems: {},
    hourlyBuckets: {},
    updatedAt: new Date().toISOString()
  };
}

export function applyDisposalEventToRollup(
  rollup: AnalyticsRollupDocument,
  event: DisposalEvent
): AnalyticsRollupDocument {
  const correctSort = event.attemptResult === "success";
  const bucketStart = createHourBucketStart(event.timestamp);
  const existingBucket = rollup.hourlyBuckets[bucketStart];
  const nextMethodMetrics = incrementMethodMetrics(
    existingBucket?.byDisposalMethod ?? createEmptyMethodMetrics(),
    event.correctDisposalMethod,
    correctSort
  );
  const nextBucket: AnalyticsBucketSummary = {
    bucketStart,
    bucketLabel: bucketStart.slice(11, 16),
    totalAttempts: (existingBucket?.totalAttempts ?? 0) + 1,
    correctAttempts: (existingBucket?.correctAttempts ?? 0) + (correctSort ? 1 : 0),
    byDisposalMethod: nextMethodMetrics
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
      [bucketStart]: nextBucket
    },
    updatedAt: new Date().toISOString()
  };
}

export function aggregateRollups(rollups: readonly AnalyticsRollupDocument[]) {
  const contaminationItems: Record<string, number> = {};
  const hourlyBuckets: Record<string, AnalyticsBucketSummary> = {};

  let totalAttempts = 0;
  let totalCorrectSorts = 0;

  for (const rollup of rollups) {
    totalAttempts += rollup.totals.totalAttempts;
    totalCorrectSorts += rollup.totals.totalCorrectSorts;

    for (const [itemType, count] of Object.entries(rollup.contaminationItems)) {
      contaminationItems[itemType] = (contaminationItems[itemType] ?? 0) + count;
    }

    for (const [bucketStart, bucket] of Object.entries(rollup.hourlyBuckets)) {
      const existingBucket = hourlyBuckets[bucketStart];
      const byDisposalMethod = createEmptyMethodMetrics();

      for (const disposalMethod of ["recycle", "compost", "garbage"] as const) {
        byDisposalMethod[disposalMethod] = {
          totalAttempts:
            (existingBucket?.byDisposalMethod[disposalMethod].totalAttempts ?? 0)
            + bucket.byDisposalMethod[disposalMethod].totalAttempts,
          correctAttempts:
            (existingBucket?.byDisposalMethod[disposalMethod].correctAttempts ?? 0)
            + bucket.byDisposalMethod[disposalMethod].correctAttempts
        };
      }

      hourlyBuckets[bucketStart] = {
        bucketStart,
        bucketLabel: bucket.bucketLabel,
        totalAttempts: (existingBucket?.totalAttempts ?? 0) + bucket.totalAttempts,
        correctAttempts: (existingBucket?.correctAttempts ?? 0) + bucket.correctAttempts,
        byDisposalMethod
      };
    }
  }

  return {
    totals: createMetricTotals(totalAttempts, totalCorrectSorts),
    contaminationItems,
    hourlyBuckets
  };
}

export function createTopContaminationItems(contaminationItems: Readonly<Record<string, number>>) {
  return Object.entries(contaminationItems)
    .map(([itemType, incorrectAttempts]) => ({ itemType, incorrectAttempts }))
    .sort((left, right) => right.incorrectAttempts - left.incorrectAttempts)
    .slice(0, 5);
}

export function createWorstTimesOfDay(hourlyBuckets: Readonly<Record<string, AnalyticsBucketSummary>>) {
  return Object.values(hourlyBuckets)
    .map((bucket) => ({
      bucketLabel: bucket.bucketLabel,
      totalAttempts: bucket.totalAttempts,
      firstTryCorrectRate: bucket.totalAttempts === 0 ? 0 : bucket.correctAttempts / bucket.totalAttempts
    }))
    .sort((left, right) => left.firstTryCorrectRate - right.firstTryCorrectRate)
    .slice(0, 5);
}

export function createBinPurity(
  hourlyBuckets: Readonly<Record<string, AnalyticsBucketSummary>>,
  timeBucket: AnalyticsQuery["timeBucket"] = "hour"
) {
  const buckets = Object.values(hourlyBuckets).sort((left, right) => left.bucketStart.localeCompare(right.bucketStart));

  if (timeBucket === "day") {
    const byDay = new Map<string, DispositionMetrics>();
    for (const bucket of buckets) {
      const dayLabel = bucket.bucketStart.slice(0, 10);
      const existing = byDay.get(dayLabel) ?? createEmptyMethodMetrics();
      let nextMetrics = existing;
      for (const disposalMethod of ["recycle", "compost", "garbage"] as const) {
        nextMetrics = {
          ...nextMetrics,
          [disposalMethod]: {
            totalAttempts:
              nextMetrics[disposalMethod].totalAttempts + bucket.byDisposalMethod[disposalMethod].totalAttempts,
            correctAttempts:
              nextMetrics[disposalMethod].correctAttempts + bucket.byDisposalMethod[disposalMethod].correctAttempts
          }
        };
      }
      byDay.set(dayLabel, nextMetrics);
    }

    return [...byDay.entries()].flatMap(([bucketLabel, metrics]) =>
      (["recycle", "compost", "garbage"] as const).map((disposalMethod) => ({
        disposalMethod,
        bucketLabel,
        totalAttempts: metrics[disposalMethod].totalAttempts,
        correctAttempts: metrics[disposalMethod].correctAttempts,
        purityRate:
          metrics[disposalMethod].totalAttempts === 0
            ? 0
            : metrics[disposalMethod].correctAttempts / metrics[disposalMethod].totalAttempts
      }))
    );
  }

  return buckets.flatMap((bucket) =>
    (["recycle", "compost", "garbage"] as const).map((disposalMethod) => ({
      disposalMethod,
      bucketLabel: bucket.bucketLabel,
      totalAttempts: bucket.byDisposalMethod[disposalMethod].totalAttempts,
      correctAttempts: bucket.byDisposalMethod[disposalMethod].correctAttempts,
      purityRate:
        bucket.byDisposalMethod[disposalMethod].totalAttempts === 0
          ? 0
          : bucket.byDisposalMethod[disposalMethod].correctAttempts
            / bucket.byDisposalMethod[disposalMethod].totalAttempts
    }))
  );
}

export function createChartSeries(
  rollups: readonly AnalyticsRollupDocument[],
  metrics: readonly MetricKey[],
  timeBucket: AnalyticsQuery["timeBucket"] = "day"
): AnalyticsSummary["chartSeries"] {
  if (timeBucket === "hour") {
    const aggregated = aggregateRollups(rollups);
    const sortedBuckets = Object.values(aggregated.hourlyBuckets).sort((left, right) => left.bucketStart.localeCompare(right.bucketStart));

    return metrics.map((metric) => ({
      metric,
      points: sortedBuckets.map((bucket) => ({
        bucketStart: bucket.bucketStart,
        bucketLabel: bucket.bucketLabel,
        value: metric === "totalCorrectSorts"
          ? bucket.correctAttempts
          : metric === "firstTryCorrectRate" || metric === "participationComplianceScore"
            ? (bucket.totalAttempts === 0 ? 0 : bucket.correctAttempts / bucket.totalAttempts)
            : bucket.totalAttempts
      }))
    }));
  }

  const sortedRollups = [...rollups].sort((left, right) => left.dayKey.localeCompare(right.dayKey));
  return metrics.map((metric) => ({
    metric,
    points: sortedRollups.map((rollup) => ({
      bucketStart: `${rollup.dayKey.slice(0, 4)}-${rollup.dayKey.slice(4, 6)}-${rollup.dayKey.slice(6, 8)}T00:00:00.000Z`,
      bucketLabel: `${rollup.dayKey.slice(0, 4)}-${rollup.dayKey.slice(4, 6)}-${rollup.dayKey.slice(6, 8)}`,
      value: metric === "totalCorrectSorts"
        ? rollup.totals.totalCorrectSorts
        : metric === "firstTryCorrectRate" || metric === "participationComplianceScore"
          ? rollup.totals.firstTryCorrectRate
          : rollup.totals.totalAttempts
    }))
  }));
}

export function createLeaderboardEntries(
  rollups: readonly AnalyticsRollupDocument[],
  scopeType: "floor" | "building"
): AnalyticsSummary["leaderboard"] {
  const grouped = new Map<string, { scopeLabel: string; totals: MetricTotals }>();

  for (const rollup of rollups.filter((entry) => entry.scopeType === scopeType)) {
    const existing = grouped.get(rollup.scopeId);
    grouped.set(rollup.scopeId, {
      scopeLabel: rollup.scopeLabel,
      totals: createMetricTotals(
        (existing?.totals.totalAttempts ?? 0) + rollup.totals.totalAttempts,
        (existing?.totals.totalCorrectSorts ?? 0) + rollup.totals.totalCorrectSorts
      )
    });
  }

  return [...grouped.entries()]
    .map(([scopeId, value]) => ({
      scopeType,
      scopeId,
      scopeLabel: value.scopeLabel,
      participationComplianceScore: value.totals.participationComplianceScore,
      rank: 0
    }))
    .sort((left, right) => right.participationComplianceScore - left.participationComplianceScore)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
}

export function matchesStationFilters(station: StationMetadata, query: Pick<AnalyticsQuery, "stationIds" | "buildingIds" | "floorIds" | "locationLabels" | "signageVariants" | "layoutVariants">): boolean {
  return (
    (!query.stationIds || query.stationIds.length === 0 || query.stationIds.includes(station.stationId))
    && (!query.buildingIds || query.buildingIds.length === 0 || query.buildingIds.includes(station.buildingId))
    && (!query.floorIds || query.floorIds.length === 0 || query.floorIds.includes(station.floorId))
    && (!query.locationLabels || query.locationLabels.length === 0 || query.locationLabels.includes(station.locationLabel))
    && (!query.signageVariants || query.signageVariants.length === 0 || query.signageVariants.includes(station.signageVariant))
    && (!query.layoutVariants || query.layoutVariants.length === 0 || query.layoutVariants.includes(station.layoutVariant))
  );
}
