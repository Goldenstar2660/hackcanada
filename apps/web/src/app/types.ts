import type { Auth, User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { Functions } from "firebase/functions";

import type { OperatorDashboardGateway } from "../lib/api/dashboard-gateway.js";
import type { OperatorSession } from "../lib/firebase/live-status.js";
import type { LiveMonitoringGateway } from "../lib/firebase/live-monitoring.js";
import type { DashboardFilterState } from "../lib/query/dashboard-query.js";

export interface DashboardAppDependencies {
  readonly api: OperatorDashboardGateway;
  readonly live: LiveMonitoringGateway;
  readonly now?: () => Date;
}

export interface DashboardBrowserServices {
  readonly auth: Auth;
  readonly firestore: Firestore;
  readonly functions: Functions;
}

export type DashboardBrowserAuthStatus = "loading" | "signed-out" | "signed-in";

export interface DashboardBrowserAuthState {
  readonly status: DashboardBrowserAuthStatus;
  readonly user: User | null;
  readonly session: OperatorSession | null;
}

export type DashboardRouteAccess = "public" | "protected";

export type DashboardRouteId =
  | "landing"
  | "login"
  | "analytics"
  | "devices"
  | "device-detail"
  | "live-monitoring"
  | "event-history";

export interface DashboardProviderRegistry extends DashboardAppDependencies {
  readonly now: () => Date;
}

export interface DashboardRouteDefinition {
  readonly id: DashboardRouteId;
  readonly label: string;
  readonly description: string;
  readonly path: string;
  readonly access: DashboardRouteAccess;
  readonly navigationLabel?: string;
  readonly showInNavigation: boolean;
}

export interface DashboardRouteMatch {
  readonly route: DashboardRouteDefinition;
  readonly path: string;
  readonly requestedPath: string;
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