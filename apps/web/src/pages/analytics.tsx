import type { AnalyticsSummary } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { createAnalyticsDisplayModel } from "../features/analytics/chart-adapters.js";
import { FilterControls } from "../features/filters/filter-controls.js";
import { matchesStationFilters } from "../lib/query/dashboard-query.js";

export interface AnalyticsPageModel {
  readonly summary: AnalyticsSummary;
  readonly availableFilters: Awaited<ReturnType<typeof loadAnalyticsPage>>["availableFilters"];
  readonly availableStations: Awaited<ReturnType<typeof loadAnalyticsPage>>["availableStations"];
}

export async function loadAnalyticsPage(context: DashboardPageLoadContext): Promise<{
  summary: AnalyticsSummary;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"];
}> {
  const [directory, summary] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getAnalytics(context.filters, {
      groupBy: ["buildingId"],
      timeBucket: "day"
    })
  ]);

  return {
    summary,
    availableFilters: directory.filters,
    availableStations: directory.stations
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

function formatMetricLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AnalyticsPage(props: {
  readonly model: AnalyticsPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  const display = createAnalyticsDisplayModel(props.model.summary);
  const visibleStationCount = props.model.availableStations.filter((station) => matchesStationFilters(station, props.context.filters)).length;
  const incorrectAttempts = Math.max(props.model.summary.totals.totalAttempts - props.model.summary.totals.totalCorrectSorts, 0);
  const contaminationRate = props.model.summary.totals.totalAttempts > 0
    ? incorrectAttempts / props.model.summary.totals.totalAttempts
    : 0;
  const chartSeries = display.chartSeries ?? [];
  const supportLists = [
    {
      title: "Top contamination items",
      empty: "No contamination items are available for the current scope.",
      items: (display.topContaminationItems ?? []).map((item) => ({
        label: item.itemType,
        value: `${item.incorrectAttempts} incorrect attempts`
      }))
    },
    {
      title: "Worst times of day",
      empty: "No low-performing time buckets were returned by the analytics API.",
      items: (display.worstTimesOfDay ?? []).map((item) => ({
        label: item.bucketLabel,
        value: `${formatPercent(item.firstTryCorrectRate)} across ${formatCount(item.totalAttempts)} attempts`
      }))
    },
    {
      title: "Bin purity by bucket",
      empty: "No purity buckets are available for the current selection.",
      items: (display.binPurity ?? []).slice(0, 6).map((item) => ({
        label: `${item.disposalMethod} · ${item.bucketLabel}`,
        value: `${formatPercent(item.purityRate)} purity on ${formatCount(item.totalAttempts)} attempts`
      }))
    },
    {
      title: "Leaderboard",
      empty: "No leaderboard entries are available for the current filter set.",
      items: (display.leaderboard ?? []).map((item) => ({
        label: `#${item.rank} ${item.scopeLabel}`,
        value: `${formatPercent(item.participationComplianceScore)} ${item.scopeType}`
      }))
    }
  ] as const;

  return (
    <section className="dashboard-section-stack">
      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        availableStations={props.model.availableStations}
        stationCount={visibleStationCount}
      />

      <section className="dashboard-analytics-grid" aria-label="Analytics KPI cards">
        <article className="dashboard-analytics-kpi">
          <p className="dashboard-field-label">Correct bin placement</p>
          <strong className="dashboard-analytics-kpi-value">{formatPercent(props.model.summary.totals.firstTryCorrectRate)}</strong>
          <p className="dashboard-detail-value">First-try correct rate from the current analytics summary.</p>
          <progress className="dashboard-analytics-progress" max={100} value={props.model.summary.totals.firstTryCorrectRate * 100} />
        </article>
        <article className="dashboard-analytics-kpi">
          <p className="dashboard-field-label">Contamination rate</p>
          <strong className="dashboard-analytics-kpi-value">{formatPercent(contaminationRate)}</strong>
          <p className="dashboard-detail-value">Derived from incorrect attempts in the selected analytics scope.</p>
          <progress className="dashboard-analytics-progress dashboard-analytics-progress--warning" max={100} value={contaminationRate * 100} />
        </article>
        <article className="dashboard-analytics-kpi">
          <p className="dashboard-field-label">Total item count</p>
          <strong className="dashboard-analytics-kpi-value">{formatCount(props.model.summary.totals.totalAttempts)}</strong>
          <p className="dashboard-detail-value">All disposal attempts returned by the analytics materialization pipeline.</p>
        </article>
        <article className="dashboard-analytics-kpi">
          <p className="dashboard-field-label">Participation score</p>
          <strong className="dashboard-analytics-kpi-value">{formatPercent(props.model.summary.totals.participationComplianceScore)}</strong>
          <p className="dashboard-detail-value">Headline compliance score used throughout comparisons and leaderboards.</p>
        </article>
      </section>

      <section className="dashboard-analytics-insights-shell" aria-label="AI insights placeholders">
        <div className="dashboard-analytics-insights-header">
          <p className="dashboard-page-kicker">AI-powered insights</p>
          <h3 className="dashboard-card-title">Placeholder insight cards</h3>
        </div>
        <div className="dashboard-analytics-insights-grid">
          <article className="dashboard-analytics-insight-card dashboard-analytics-insight-card--primary">
            <p className="dashboard-analytics-insight-copy">
              AI insight summaries will appear here once the analytics narration service is wired to reviewed production prompts and approved result formatting.
            </p>
          </article>
          <article className="dashboard-analytics-insight-card">
            <p className="dashboard-analytics-insight-copy dashboard-analytics-insight-copy--muted">
              Comparative recommendations, anomaly flags, and location-level actions remain placeholders until the later AI insights implementation phase ships.
            </p>
          </article>
        </div>
      </section>

      <article className="dashboard-card">
        <div className="dashboard-row dashboard-row--baseline">
          <div>
            <h3 className="dashboard-card-title">Classification trends</h3>
            <p className="dashboard-subtitle">Chart shells are rendered from the existing analytics chart series, without introducing a new charting library.</p>
          </div>
        </div>

        {chartSeries.length > 0 ? (
          <div className="dashboard-chart-grid">
            {chartSeries.map((series) => {
              const peakValue = Math.max(...series.points.map((point) => point.value), 1);

              return (
                <article key={series.metric} className="dashboard-chart-shell">
                  <div className="dashboard-chart-shell-header">
                    <h4 className="dashboard-card-title">{formatMetricLabel(series.metric)}</h4>
                    <span className="dashboard-field-label">{series.points.length} buckets</span>
                  </div>
                  <div className="dashboard-chart-bars" aria-label={`${formatMetricLabel(series.metric)} series`}>
                    {series.points.map((point) => (
                      <div key={`${series.metric}:${point.bucketStart}`} className="dashboard-chart-row">
                        <span className="dashboard-chart-point-label">{point.bucketLabel}</span>
                        <progress className="dashboard-chart-track" max={peakValue} value={point.value} />
                        <span className="dashboard-field-label">{point.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="dashboard-status dashboard-status--empty">No chart series were returned for the current analytics query.</p>
        )}
      </article>

      <section className="dashboard-support-grid" aria-label="Analytics support data">
        {supportLists.map((list) => (
          <article key={list.title} className="dashboard-card">
            <h3 className="dashboard-card-title">{list.title}</h3>
            {list.items.length > 0 ? (
              <div className="dashboard-support-list">
                {list.items.map((item) => (
                  <div key={`${list.title}:${item.label}`} className="dashboard-support-list-item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-status dashboard-status--empty">{list.empty}</p>
            )}
          </article>
        ))}
      </section>
    </section>
  );
}