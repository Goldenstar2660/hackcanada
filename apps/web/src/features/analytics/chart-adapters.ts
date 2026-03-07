import type { AnalyticsSummary } from "@binsight/contracts";

export interface AnalyticsCardView {
  readonly label: string;
  readonly value: string;
  readonly note: string;
}

export interface AnalyticsDisplayModel {
  readonly headlineCards: readonly AnalyticsCardView[];
  readonly groupedResults: AnalyticsSummary["groupedResults"];
  readonly topContaminationItems: AnalyticsSummary["topContaminationItems"];
  readonly worstTimesOfDay: AnalyticsSummary["worstTimesOfDay"];
  readonly binPurity: AnalyticsSummary["binPurity"];
  readonly leaderboard: AnalyticsSummary["leaderboard"];
  readonly chartSeries: AnalyticsSummary["chartSeries"];
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function createAnalyticsDisplayModel(summary: AnalyticsSummary): AnalyticsDisplayModel {
  return {
    headlineCards: [
      {
        label: "Total attempts",
        value: String(summary.totals.totalAttempts),
        note: "Raw disposal attempts in the selected time range."
      },
      {
        label: "Correct sorts",
        value: String(summary.totals.totalCorrectSorts),
        note: "Successful sorting attempts from backend rollups."
      },
      {
        label: "First-try correct rate",
        value: formatPercent(summary.totals.firstTryCorrectRate),
        note: "Primary compliance KPI from materialized analytics."
      },
      {
        label: "Participation score",
        value: formatPercent(summary.totals.participationComplianceScore),
        note: "Headline operator score for leaderboard and trend views."
      }
    ],
    groupedResults: summary.groupedResults,
    topContaminationItems: summary.topContaminationItems,
    worstTimesOfDay: summary.worstTimesOfDay,
    binPurity: summary.binPurity,
    leaderboard: summary.leaderboard,
    chartSeries: summary.chartSeries
  };
}