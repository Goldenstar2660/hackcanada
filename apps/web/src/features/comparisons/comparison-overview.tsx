import type { ComparisonAnalysisResult } from "../../lib/api/dashboard-gateway.js";

export interface ComparisonOverviewProps {
  readonly analyses: readonly ComparisonAnalysisResult[];
}

export function ComparisonOverview(props: ComparisonOverviewProps): JSX.Element {
  return (
    <section className="dashboard-section-stack">
      <div className="dashboard-row dashboard-row--baseline">
        <h2 className="dashboard-card-title">Comparison and experiment views</h2>
        <p className="dashboard-muted">
          Building, location, signage, layout, before-after, and A/B analyses all route through backend analytics queries.
        </p>
      </div>

      <div className="dashboard-grid dashboard-grid--cards">
        {props.analyses.map((analysis) => (
          <article key={analysis.scenario.id} className="dashboard-card">
            <h3 className="dashboard-card-title">{analysis.scenario.label}</h3>
            <p className="dashboard-muted">{analysis.scenario.description}</p>
            <p className="dashboard-note">
              Compliance score: {(analysis.summary.totals.participationComplianceScore * 100).toFixed(1)}%
            </p>
            <p>Total attempts: {analysis.summary.totals.totalAttempts}</p>
            <ul className="dashboard-list">
              {(analysis.summary.groupedResults ?? []).map((group) => (
                <li key={group.groupKey}>
                  {group.groupLabel}: {(group.metrics.participationComplianceScore * 100).toFixed(1)}%
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}