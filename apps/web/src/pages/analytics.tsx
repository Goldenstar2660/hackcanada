import type { AnalyticsSummary } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { createAnalyticsDisplayModel } from "../features/analytics/chart-adapters.js";
import { FilterControls } from "../features/filters/filter-controls.js";
import { ComparisonsCompatibilitySection } from "./comparisons.js";
import { matchesStationFilters } from "../lib/query/dashboard-query.js";

export interface AnalyticsPageModel {
  readonly summary: AnalyticsSummary;
  readonly comparisonAnalyses: Awaited<ReturnType<typeof loadAnalyticsPage>>["comparisonAnalyses"];
  readonly availableFilters: Awaited<ReturnType<typeof loadAnalyticsPage>>["availableFilters"];
  readonly availableStations: Awaited<ReturnType<typeof loadAnalyticsPage>>["availableStations"];
}

export async function loadAnalyticsPage(context: DashboardPageLoadContext): Promise<{
  summary: AnalyticsSummary;
  comparisonAnalyses: Awaited<ReturnType<typeof context.providers.api.getComparisons>>;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"];
}> {
  const [directory, summary, comparisonAnalyses] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getAnalytics(context.filters, {
      groupBy: ["buildingId"],
      timeBucket: "day"
    }),
    context.providers.api.getComparisons(context.filters)
  ]);

  return {
    summary,
    comparisonAnalyses,
    availableFilters: directory.filters,
    availableStations: directory.stations
  };
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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
  const arrivedFromComparisons = props.context.match.requestedPath === "/comparisons";
  const visibleStationCount = props.model.availableStations.filter((station) => matchesStationFilters(station, props.context.filters)).length;
  const incorrectAttempts = Math.max(props.model.summary.totals.totalAttempts - props.model.summary.totals.totalCorrectSorts, 0);
  const contaminationRate = props.model.summary.totals.totalAttempts > 0
    ? incorrectAttempts / props.model.summary.totals.totalAttempts
    : 0;
  const groupedResults = display.groupedResults ?? [];
  const maxGroupedScore = Math.max(...groupedResults.map((group) => group.metrics.participationComplianceScore * 100), 1);
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
      <article className="dashboard-card dashboard-page-hero">
        <p className="dashboard-page-kicker">System metrics v4.0</p>
        <div className="dashboard-row dashboard-row--baseline">
          <div>
            <h2 className="dashboard-page-title">Analytics overview</h2>
            <p className="dashboard-page-copy">
              Stitch-style KPI, comparison, and trend sections rendered on top of the existing analytics summary contract, comparison scenarios, and current route-backed query state.
            </p>
          </div>
          <div className="dashboard-page-actions">
            <button type="button" className="dashboard-button dashboard-button--ghost" disabled={true}>
              Export report unavailable
            </button>
            <button type="button" className="dashboard-button" disabled={true}>
              AI insights deferred
            </button>
          </div>
        </div>
        <div className="dashboard-chip-row" aria-label="Analytics summary">
          <span className="dashboard-chip dashboard-chip--active">{visibleStationCount} stations in scope</span>
          <span className="dashboard-chip">Generated {formatTimestamp(props.model.summary.generatedAt)}</span>
          <span className="dashboard-chip">Time window {props.context.filters.timeRange.label}</span>
          <span className="dashboard-chip">{props.model.comparisonAnalyses.length} comparison scenarios loaded</span>
          <span className="dashboard-chip dashboard-chip--warning">Export and AI actions are intentionally non-functional</span>
        </div>
      </article>

      {arrivedFromComparisons ? (
        <article className="dashboard-card dashboard-secondary-route-card">
          <div className="dashboard-row dashboard-row--baseline">
            <div>
              <p className="dashboard-page-kicker">Compatibility path</p>
              <h3 className="dashboard-card-title">The legacy comparisons route now resolves into Analytics</h3>
              <p className="dashboard-subtitle">
                Existing demo links can continue to use /comparisons during rollout, but the visible information architecture keeps summary, grouped comparisons, and trends together under Analytics.
              </p>
            </div>
            <div className="dashboard-page-actions dashboard-secondary-route-actions">
              <a href="/analytics" className="dashboard-button dashboard-button--ghost">Canonical analytics route</a>
              <button type="button" className="dashboard-button" disabled={true}>Standalone comparisons removed</button>
            </div>
          </div>
        </article>
      ) : null}

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
          <p className="dashboard-detail-value">Derived from incorrect attempts in the selected route-backed scope.</p>
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

      <section className="dashboard-comparison-layout">
        <article className="dashboard-card dashboard-comparison-controls">
          <p className="dashboard-page-kicker">Comparison tool</p>
          <h3 className="dashboard-card-title">Current grouped variance</h3>
          <p className="dashboard-subtitle">
            This view preserves the existing analytics request and grouped results while translating the Stitch comparison shell into the shared dashboard CSS surface.
          </p>
          <div className="dashboard-chip-row">
            <span className="dashboard-chip dashboard-chip--active">Grouped by building</span>
            <span className="dashboard-chip">Backend query preserved</span>
            <span className="dashboard-chip">No manual refresh contract</span>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-row dashboard-row--baseline">
            <div>
              <h3 className="dashboard-card-title">Cross-location variance</h3>
              <p className="dashboard-subtitle">Participation score by current grouping from the analytics summary response.</p>
            </div>
          </div>

          {groupedResults.length > 0 ? (
            <div className="dashboard-section-stack">
              {groupedResults.map((group) => (
                <article key={group.groupKey} className="dashboard-comparison-row">
                  <div className="dashboard-comparison-row-top">
                    <span>{group.groupLabel}</span>
                    <span>
                      {formatPercent(group.metrics.participationComplianceScore)} · {formatCount(group.metrics.totalAttempts)} attempts
                    </span>
                  </div>
                  <progress
                    className="dashboard-comparison-track"
                    max={maxGroupedScore}
                    value={group.metrics.participationComplianceScore * 100}
                  />
                </article>
              ))}
            </div>
          ) : (
            <p className="dashboard-status dashboard-status--empty">The current analytics summary did not return grouped comparison rows.</p>
          )}
        </article>
      </section>

      <ComparisonsCompatibilitySection
        analyses={props.model.comparisonAnalyses}
        requestedPath={props.context.match.requestedPath}
      />

      <section className="dashboard-insight-grid" aria-label="Deferred analytics actions">
        <article className="dashboard-insight-card dashboard-insight-card--disabled">
          <p className="dashboard-page-kicker">AI-powered insights</p>
          <h3 className="dashboard-card-title">Narrative insight cards are deferred</h3>
          <p className="dashboard-subtitle">
            The current product scope supports operator analysis from historical and grouped data, but it does not expose a backed narrative-generation contract for AI text cards.
          </p>
        </article>
        <article className="dashboard-insight-card dashboard-insight-card--disabled">
          <p className="dashboard-page-kicker">Export reports</p>
          <h3 className="dashboard-card-title">Report export remains unimplemented by design</h3>
          <p className="dashboard-subtitle">
            Export controls stay visible as explicit follow-on work instead of implying that a backend report-generation flow exists today.
          </p>
        </article>
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