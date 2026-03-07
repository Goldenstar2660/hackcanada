import type { OperatorDashboardGateway } from "../lib/api/dashboard-gateway.js";
import type { LiveMonitoringGateway } from "../lib/firebase/live-monitoring.js";
import type { DashboardFilterState } from "../lib/query/dashboard-query.js";

export interface DashboardAppDependencies {
  readonly api: OperatorDashboardGateway;
  readonly live: LiveMonitoringGateway;
  readonly now?: () => Date;
}

export interface DashboardProviderRegistry extends DashboardAppDependencies {
  readonly now: () => Date;
}

export interface DashboardRouteDefinition {
  readonly id:
    | "stations"
    | "station-detail"
    | "live-monitoring"
    | "event-history"
    | "analytics"
    | "comparisons";
  readonly label: string;
  readonly description: string;
  readonly path: string;
  readonly navigationLabel?: string;
  readonly showInNavigation: boolean;
}

export interface DashboardRouteMatch {
  readonly route: DashboardRouteDefinition;
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
}

export interface DashboardPageLoadContext {
  readonly providers: DashboardProviderRegistry;
  readonly match: DashboardRouteMatch;
  readonly filters: DashboardFilterState;
}

export interface DashboardPageRenderResult {
  readonly title: string;
  readonly description: string;
  readonly body: JSX.Element;
}