import type { AnalyticsSummary, StationDirectoryResponse } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { matchesStationFilters } from "../lib/query/dashboard-query.js";

const dashboardNavigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    current: true
  },
  {
    label: "Analytics",
    href: "/analytics"
  },
  {
    label: "Devices",
    href: "/devices"
  },
  {
    label: "System",
    status: "placeholder"
  }
] as const;

export interface DashboardPageModel {
  readonly summary: AnalyticsSummary;
  readonly availableFilters: StationDirectoryResponse["filters"];
  readonly visibleStations: readonly StationDirectoryResponse["stations"][number][];
  readonly facilityCount: number;
  readonly floorCount: number;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getLocationSelectionLabel(filters: DashboardPageLoadContext["filters"]): string {
  if (filters.locationLabels.length === 0) {
    return "All locations";
  }

  if (filters.locationLabels.length === 1) {
    return filters.locationLabels[0];
  }

  return `${filters.locationLabels.length} locations selected`;
}

function createScopeHighlights(context: DashboardPageLoadContext, model: DashboardPageModel): readonly string[] {
  const highlights = [
    ...context.filters.buildingIds.map((value) => `Building ${value}`),
    ...context.filters.floorIds.map((value) => `Floor ${value}`),
    ...context.filters.locationLabels,
    ...context.filters.signageVariants.map((value) => `Signage ${value}`),
    ...context.filters.layoutVariants.map((value) => `Layout ${value}`)
  ];

  if (highlights.length > 0) {
    return highlights;
  }

  return [
    `${model.facilityCount} facilities`,
    `${model.floorCount} floors`,
    `${model.visibleStations.length} active nodes`
  ];
}

export async function loadDashboardPage(context: DashboardPageLoadContext): Promise<DashboardPageModel> {
  const [directory, summary] = await Promise.all([
    context.providers.api.getStationDirectory(),
    context.providers.api.getAnalytics(context.filters, {
      groupBy: ["buildingId"],
      timeBucket: "day"
    })
  ]);

  const visibleStations = directory.stations.filter((station) => matchesStationFilters(station, context.filters));
  const facilityCount = new Set(visibleStations.map((station) => station.buildingId)).size;
  const floorCount = new Set(visibleStations.map((station) => `${station.buildingId}:${station.floorId}`)).size;

  return {
    summary,
    availableFilters: directory.filters,
    visibleStations,
    facilityCount,
    floorCount
  };
}

export function DashboardPage(props: {
  readonly model: DashboardPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  const incorrectAttempts = Math.max(props.model.summary.totals.totalAttempts - props.model.summary.totals.totalCorrectSorts, 0);
  const contaminationRate = props.model.summary.totals.totalAttempts > 0
    ? incorrectAttempts / props.model.summary.totals.totalAttempts
    : 0;
  const locationSelectionLabel = getLocationSelectionLabel(props.context.filters);
  const scopeHighlights = createScopeHighlights(props.context, props.model);
  const dashboardMetrics: ReadonlyArray<{
    value: string;
    label: string;
    detail: string;
    progress: number;
    warning?: boolean;
  }> = [
    {
      value: formatPercent(props.model.summary.totals.firstTryCorrectRate),
      label: "Correct bin placement",
      detail: "First-try success across the current dashboard scope.",
      progress: props.model.summary.totals.firstTryCorrectRate * 100
    },
    {
      value: formatPercent(contaminationRate),
      label: "Contamination rate",
      detail: "Derived from incorrect attempts returned by analytics.",
      progress: contaminationRate * 100,
      warning: true
    },
    {
      value: formatCount(props.model.visibleStations.length),
      label: "Active nodes",
      detail: "Station-directory records that match the current filters.",
      progress: props.model.visibleStations.length === 0 || props.model.availableFilters.locations.length === 0
        ? 0
        : (props.model.visibleStations.length / Math.max(props.model.availableFilters.locations.length, props.model.visibleStations.length)) * 100
    }
  ] as const;
  const contaminationItems = props.model.summary.topContaminationItems ?? [];
  const visibleStations = props.model.visibleStations.slice(0, 5);

  return (
    <section className="dashboard-home-shell" data-route-surface="dashboard-home">
      <div className="dashboard-home-frame">
        <header className="dashboard-home-header">
          <div className="dashboard-home-brand-lockup">
            <span className="dashboard-home-brand-mark" aria-hidden="true">DS</span>
            <div>
              <p className="dashboard-home-brand-name">B<span>i</span>NSIGHT</p>
              <p className="dashboard-home-brand-subtitle">Protected operator surface</p>
            </div>
          </div>

          <nav className="dashboard-home-nav" aria-label="Primary dashboard navigation">
          {dashboardNavigation.map((item) => {
            if (!("href" in item)) {
              return (
                <span key={item.label} className="dashboard-home-nav-link is-disabled" aria-disabled="true">
                  {item.label}
                </span>
              );
            }

            const isCurrent = "current" in item && item.current === true;

            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={`dashboard-home-nav-link${isCurrent ? " is-active" : ""}`}
              >
                {item.label}
              </a>
            );
          })}
          </nav>

          <div className="dashboard-home-profile" aria-label="Current dashboard mode">
            <span className="dashboard-home-profile-status">Live</span>
            <span className="dashboard-home-profile-avatar" aria-hidden="true">VG</span>
          </div>
        </header>

        <section className="dashboard-home-hero">
          <div>
            <p className="dashboard-home-kicker">Operator dashboard</p>
            <h1 className="dashboard-home-title">B<span>i</span>NSIGHT</h1>
          </div>

          <div className="dashboard-home-hero-copy">
            <p className="dashboard-home-description">
              Computer vision for waste classification. This dashboard keeps the Stitch layout language, but only binds to data already present in the analytics summary and station-directory contracts.
              <span className="dashboard-home-inline-note"> Generated {formatTimestamp(props.model.summary.generatedAt)}.</span>
            </p>

            <div className="dashboard-home-controls">
              <div className="dashboard-home-field">
                <label className="dashboard-home-field-label" htmlFor="dashboard-location-select">Select location</label>
                <div className="dashboard-home-select-shell">
                  <select id="dashboard-location-select" className="dashboard-home-select" defaultValue={locationSelectionLabel} disabled={true}>
                    <option value={locationSelectionLabel}>{locationSelectionLabel}</option>
                    {props.model.availableFilters.locations
                      .filter((location) => location !== locationSelectionLabel)
                      .map((location) => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="dashboard-home-actions">
                <a href="/analytics" className="dashboard-button dashboard-button--primary dashboard-home-primary-action">Open analytics</a>
                <a href="/devices" className="dashboard-button dashboard-button--ghost">View devices</a>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-home-metrics" aria-label="Dashboard summary metrics">
          {dashboardMetrics.map((metric) => (
            <article key={metric.label} className="dashboard-home-metric-card">
              <div className="dashboard-home-metric-top">
                <span className="dashboard-home-metric-label">{metric.label}</span>
                <span className={`dashboard-home-metric-delta${metric.warning ? " is-warning" : ""}`}>
                  {metric.warning ? "Monitor" : "Live"}
                </span>
              </div>
              <p className="dashboard-home-metric-value">{metric.value}</p>
              <p className="dashboard-home-metric-detail">{metric.detail}</p>
              <progress
                className={`dashboard-home-progress${metric.warning ? " is-warning" : ""}`}
                max={100}
                value={Math.max(6, Math.min(metric.progress, 100))}
              />
            </article>
          ))}
        </section>

        <section className="dashboard-home-lower-grid">
          <article className="dashboard-home-panel dashboard-home-panel--map">
            <div className="dashboard-home-panel-header">
              <div>
                <p className="dashboard-home-panel-kicker">Device map</p>
                <h2 className="dashboard-home-panel-title">Spatial network preview</h2>
              </div>
              <span className="dashboard-home-panel-badge">{formatCount(props.model.visibleStations.length)} nodes</span>
            </div>

            <p className="dashboard-home-panel-copy">
              The design expects a facility map. Until that asset exists in the app, this panel uses live location and facility counts from the filtered station directory.
            </p>

            <div className="dashboard-home-map-placeholder" aria-label="Facility coverage placeholder">
              {scopeHighlights.slice(0, 6).map((highlight, index) => (
                <span
                  key={highlight}
                  className={`dashboard-home-map-node dashboard-home-map-node--${index}`}
                >
                  {highlight}
                </span>
              ))}
            </div>

            <div className="dashboard-home-map-meta">
              <div>
                <span className="dashboard-home-meta-label">Facilities</span>
                <strong>{formatCount(props.model.facilityCount)}</strong>
              </div>
              <div>
                <span className="dashboard-home-meta-label">Floors</span>
                <strong>{formatCount(props.model.floorCount)}</strong>
              </div>
            </div>
          </article>

          <article className="dashboard-home-panel">
            <div className="dashboard-home-panel-header">
              <div>
                <p className="dashboard-home-panel-kicker">Network snapshot</p>
                <h2 className="dashboard-home-panel-title">Current system core</h2>
              </div>
            </div>

            <div className="dashboard-home-facts-grid">
              <article>
                <span className="dashboard-home-meta-label">Total attempts</span>
                <strong>{formatCount(props.model.summary.totals.totalAttempts)}</strong>
              </article>
              <article>
                <span className="dashboard-home-meta-label">Correct sorts</span>
                <strong>{formatCount(props.model.summary.totals.totalCorrectSorts)}</strong>
              </article>
              <article>
                <span className="dashboard-home-meta-label">Participation score</span>
                <strong>{formatPercent(props.model.summary.totals.participationComplianceScore)}</strong>
              </article>
              <article>
                <span className="dashboard-home-meta-label">Filter window</span>
                <strong>{props.context.filters.timeRange.label}</strong>
              </article>
            </div>

            <div className="dashboard-home-chip-row" aria-label="Scope highlights">
              {scopeHighlights.map((highlight) => (
                <span key={highlight} className="dashboard-home-chip">{highlight}</span>
              ))}
            </div>
          </article>

          <article className="dashboard-home-panel">
            <div className="dashboard-home-panel-header">
              <div>
                <p className="dashboard-home-panel-kicker">Contamination watch</p>
                <h2 className="dashboard-home-panel-title">Highest incorrect items</h2>
              </div>
            </div>

            {contaminationItems.length > 0 ? (
              <div className="dashboard-home-list">
                {contaminationItems.slice(0, 4).map((item) => (
                  <article key={item.itemType} className="dashboard-home-list-row">
                    <div>
                      <h3>{item.itemType}</h3>
                      <p>Incorrect disposal attempts in the current scope.</p>
                    </div>
                    <strong>{formatCount(item.incorrectAttempts)}</strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className="dashboard-home-empty-state">No contamination list is currently available for this filter scope.</p>
            )}
          </article>

          <article className="dashboard-home-panel">
            <div className="dashboard-home-panel-header">
              <div>
                <p className="dashboard-home-panel-kicker">Active devices</p>
                <h2 className="dashboard-home-panel-title">Filtered station directory</h2>
              </div>
            </div>

            {visibleStations.length > 0 ? (
              <div className="dashboard-home-list">
                {visibleStations.map((station) => (
                  <article key={station.stationId} className="dashboard-home-list-row">
                    <div>
                      <h3>{station.stationName}</h3>
                      <p>{station.buildingLabel} · {station.floorLabel} · {station.locationLabel}</p>
                    </div>
                    <a href={`/devices/${station.stationId}`} className="dashboard-home-inline-link">Open</a>
                  </article>
                ))}
              </div>
            ) : (
              <p className="dashboard-home-empty-state">No active devices match the current filter state.</p>
            )}
          </article>
        </section>

        <footer className="dashboard-home-footer">
          <span>Generated from live analytics and directory contracts.</span>
          <span>Map overlays and scan workflows remain placeholders until dedicated app assets exist.</span>
        </footer>
      </div>
    </section>
  );
}