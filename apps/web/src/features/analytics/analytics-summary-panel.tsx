import type { AnalyticsSummary } from "@binbuddy/contracts";

import { createAnalyticsDisplayModel } from "./chart-adapters.js";

export interface AnalyticsSummaryPanelProps {
  readonly summary: AnalyticsSummary;
}

export function AnalyticsSummaryPanel(props: AnalyticsSummaryPanelProps): JSX.Element {
  const display = createAnalyticsDisplayModel(props.summary);

  return (
    <section className="dashboard-section-stack">
      <div className="dashboard-row dashboard-row--baseline">
        <h2 className="dashboard-card-title">Analytics overview</h2>
        <p className="dashboard-muted">Trend, contamination, purity, and leaderboard views come from backend APIs, not direct Firestore reads.</p>
      </div>

      <div className="dashboard-grid dashboard-grid--stats">
        {display.headlineCards.map((card) => (
          <article key={card.label} className="dashboard-card">
            <p className="dashboard-muted">{card.label}</p>
            <strong className="dashboard-kpi-value">{card.value}</strong>
            <p className="dashboard-subtitle">{card.note}</p>
          </article>
        ))}
      </div>

      <div className="dashboard-grid dashboard-grid--cards">
        <article className="dashboard-card">
          <h3 className="dashboard-card-title">Grouped results</h3>
          <ul className="dashboard-list">
            {(display.groupedResults ?? []).map((group) => (
              <li key={group.groupKey}>
                {group.groupLabel}: {group.metrics.totalCorrectSorts}/{group.metrics.totalAttempts} ({(group.metrics.participationComplianceScore * 100).toFixed(1)}%)
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-card">
          <h3 className="dashboard-card-title">Top contamination items</h3>
          <ul className="dashboard-list">
            {(display.topContaminationItems ?? []).map((item) => (
              <li key={item.itemType}>
                {item.itemType}: {item.incorrectAttempts} incorrect attempts
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-card">
          <h3 className="dashboard-card-title">Worst times of day</h3>
          <ul className="dashboard-list">
            {(display.worstTimesOfDay ?? []).map((item) => (
              <li key={item.bucketLabel}>
                {item.bucketLabel}: {(item.firstTryCorrectRate * 100).toFixed(1)}% across {item.totalAttempts} attempts
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-card">
          <h3 className="dashboard-card-title">Leaderboards</h3>
          <ul className="dashboard-list">
            {(display.leaderboard ?? []).map((item) => (
              <li key={`${item.scopeType}:${item.scopeId}`}>
                #{item.rank} {item.scopeLabel}: {(item.participationComplianceScore * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="dashboard-card">
        <h3 className="dashboard-card-title">Trend series</h3>
        <ul className="dashboard-list">
          {(display.chartSeries ?? []).map((series) => (
            <li key={series.metric}>
              {series.metric}: {series.points.map((point) => `${point.bucketLabel}=${point.value}`).join(", ")}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}