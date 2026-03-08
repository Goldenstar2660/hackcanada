import type { DashboardPageLoadContext } from "../app/types.js";

import { FilterControls } from "../features/filters/filter-controls.js";
import { matchesStationFilters } from "../lib/query/dashboard-query.js";

export interface ComparisonsPageModel {
  readonly analyses: Awaited<ReturnType<typeof loadComparisonsPage>>["analyses"];
  readonly availableFilters: Awaited<ReturnType<typeof loadComparisonsPage>>["availableFilters"];
  readonly availableStations: Awaited<ReturnType<typeof loadComparisonsPage>>["availableStations"];
}

export async function loadComparisonsPage(context: DashboardPageLoadContext): Promise<{
  analyses: Awaited<ReturnType<typeof context.providers.api.getComparisons>>;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"];
}> {
  const [directory, analyses] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getComparisons(context.filters)
  ]);

  return {
    analyses,
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

export function ComparisonsPage(props: {
  readonly model: ComparisonsPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  const visibleStationCount = props.model.availableStations.filter((station) => matchesStationFilters(station, props.context.filters)).length;

  return (
    <section className="dashboard-section-stack">
      <article className="dashboard-card dashboard-page-hero">
        <p className="dashboard-page-kicker">Comparison matrix</p>
        <div className="dashboard-row dashboard-row--baseline">
          <div>
            <h2 className="dashboard-page-title">Comparisons</h2>
            <p className="dashboard-page-copy">
              Grouped experiment views for buildings, locations, signage, layout, before-and-after changes, and A/B cohorts, all powered by the existing comparison scenarios.
            </p>
          </div>
          <div className="dashboard-chip-row">
            <span className="dashboard-chip dashboard-chip--active">{props.model.analyses.length} scenarios</span>
            <span className="dashboard-chip">{visibleStationCount} stations in scope</span>
            <span className="dashboard-chip dashboard-chip--warning">Manual export and AI narration remain deferred</span>
          </div>
        </div>
      </article>

      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        availableStations={props.model.availableStations}
        stationCount={visibleStationCount}
      />

      <section className="dashboard-grid dashboard-grid--cards" aria-label="Comparison scenarios">
        {props.model.analyses.map((analysis) => {
          const groupedResults = analysis.summary.groupedResults ?? [];
          const maxScore = Math.max(...groupedResults.map((group) => group.metrics.participationComplianceScore * 100), 1);

          return (
            <article key={analysis.scenario.id} className="dashboard-card dashboard-comparison-card">
              <div className="dashboard-row dashboard-row--baseline">
                <div>
                  <p className="dashboard-page-kicker">{analysis.scenario.id}</p>
                  <h3 className="dashboard-card-title">{analysis.scenario.label}</h3>
                  <p className="dashboard-subtitle">{analysis.scenario.description}</p>
                </div>
                <span className="dashboard-chip dashboard-chip--active">
                  {formatPercent(analysis.summary.totals.participationComplianceScore)} compliance
                </span>
              </div>

              <section className="dashboard-data-grid" aria-label={`${analysis.scenario.label} summary`}>
                <article className="dashboard-stat-panel">
                  <p className="dashboard-stat-label">Attempts</p>
                  <p className="dashboard-stat-value dashboard-stat-value--compact">{formatCount(analysis.summary.totals.totalAttempts)}</p>
                </article>
                <article className="dashboard-stat-panel">
                  <p className="dashboard-stat-label">Correct sorts</p>
                  <p className="dashboard-stat-value dashboard-stat-value--compact">{formatCount(analysis.summary.totals.totalCorrectSorts)}</p>
                </article>
                <article className="dashboard-stat-panel">
                  <p className="dashboard-stat-label">Groups returned</p>
                  <p className="dashboard-stat-value dashboard-stat-value--compact">{groupedResults.length}</p>
                </article>
              </section>

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
                        max={maxScore}
                        value={group.metrics.participationComplianceScore * 100}
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <p className="dashboard-status dashboard-status--empty">This comparison scenario returned no grouped results for the current filters.</p>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}