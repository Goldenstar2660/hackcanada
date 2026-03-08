import type {
  DashboardPageLoadContext,
  DashboardPageRenderResult,
  DashboardRouteId,
  DashboardRouteDefinition,
  DashboardRouteMatch
} from "./types.js";

import { AnalyticsPage, loadAnalyticsPage } from "../pages/analytics.js";
import { EventHistoryPage, loadEventHistoryPage } from "../pages/event-history.js";
import { LandingPage } from "../pages/landing.js";
import { LiveMonitoringPage, loadLiveMonitoringPage } from "../pages/live-monitoring.js";
import { StationDetailPage, loadStationDetailPage } from "../pages/station-detail.js";
import { StationsPage, loadStationsPage } from "../pages/stations.js";

const dashboardRouteMap = {
  landing: {
    id: "landing",
    label: "Landing",
    description: "Public entry route for the mockup-first Binsight shell.",
    path: "/",
    access: "public",
    showInNavigation: false
  },
  login: {
    id: "login",
    label: "Login",
    description: "Public operator sign-in entry.",
    path: "/login",
    access: "public",
    showInNavigation: false
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    description: "KPI summaries, contamination trends, and grouped comparisons.",
    path: "/analytics",
    access: "protected",
    navigationLabel: "Analytics",
    showInNavigation: true
  },
  devices: {
    id: "devices",
    label: "Devices",
    description: "Operator directory for the current device fleet and metadata context.",
    path: "/devices",
    access: "protected",
    navigationLabel: "Devices",
    showInNavigation: true
  },
  "device-detail": {
    id: "device-detail",
    label: "Device details",
    description: "Operator metadata and recent-scan view for one device.",
    path: "/devices/:deviceId",
    access: "protected",
    showInNavigation: false
  },
  "live-monitoring": {
    id: "live-monitoring",
    label: "Live monitoring",
    description: "Secondary live device route backed by Firestore status updates.",
    path: "/devices/:deviceId/live",
    access: "protected",
    showInNavigation: false
  },
  "event-history": {
    id: "event-history",
    label: "Event history",
    description: "Secondary recent-scan route served by the backend history API.",
    path: "/history",
    access: "protected",
    showInNavigation: false
  }
} as const satisfies Record<DashboardRouteId, DashboardRouteDefinition>;

interface DashboardRoutePattern {
  readonly path: string;
  readonly routeId: DashboardRouteId;
  readonly normalizeParams?: (params: Readonly<Record<string, string>>) => Readonly<Record<string, string>>;
}

export const dashboardRoutes = Object.values(dashboardRouteMap) as readonly DashboardRouteDefinition[];

export const DEFAULT_DASHBOARD_PATH = "/analytics";

const dashboardRoutePatterns = [
  {
    path: "/",
    routeId: "landing"
  },
  {
    path: "/login",
    routeId: "login"
  },
  {
    path: "/analytics",
    routeId: "analytics"
  },
  {
    path: "/devices",
    routeId: "devices"
  },
  {
    path: "/devices/:deviceId",
    routeId: "device-detail",
    normalizeParams: (params) => ({
      ...params,
      stationId: params.deviceId
    })
  },
  {
    path: "/devices/:deviceId/live",
    routeId: "live-monitoring",
    normalizeParams: (params) => ({
      ...params,
      stationId: params.deviceId
    })
  },
  {
    path: "/history",
    routeId: "event-history"
  },
  {
    path: "/comparisons",
    routeId: "analytics"
  },
  {
    path: "/stations",
    routeId: "devices"
  },
  {
    path: "/stations/:stationId",
    routeId: "device-detail",
    normalizeParams: (params) => ({
      ...params,
      deviceId: params.stationId
    })
  },
  {
    path: "/stations/:stationId/live",
    routeId: "live-monitoring",
    normalizeParams: (params) => ({
      ...params,
      deviceId: params.stationId
    })
  }
] as const satisfies readonly DashboardRoutePattern[];

function matchSegments(template: string, inputPath: string): Readonly<Record<string, string>> | null {
  const templateSegments = template.split("/").filter(Boolean);
  const inputSegments = inputPath.split("/").filter(Boolean);

  if (templateSegments.length !== inputSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < templateSegments.length; index += 1) {
    const templateSegment = templateSegments[index];
    const inputSegment = inputSegments[index];
    if (templateSegment.startsWith(":")) {
      params[templateSegment.slice(1)] = decodeURIComponent(inputSegment);
      continue;
    }

    if (templateSegment !== inputSegment) {
      return null;
    }
  }

  return params;
}

function buildRoutePath(template: string, params: Readonly<Record<string, string>>): string {
  const builtPath = template.replaceAll(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key];
    return value ? encodeURIComponent(value) : "";
  });

  return builtPath.replaceAll(/\/+/g, "/").replace(/\/$/, "") || "/";
}

export function getNavigationRoutes(): readonly DashboardRouteDefinition[] {
  return dashboardRoutes.filter((route) => route.access === "protected" && route.showInNavigation);
}

export function isPublicDashboardRoute(match: DashboardRouteMatch): boolean {
  return match.route.access === "public";
}

export function matchDashboardRoute(path: string): DashboardRouteMatch {
  for (const routePattern of dashboardRoutePatterns) {
    const rawParams = matchSegments(routePattern.path, path);
    if (rawParams) {
      const params = "normalizeParams" in routePattern && routePattern.normalizeParams
        ? routePattern.normalizeParams(rawParams)
        : rawParams;
      const route = dashboardRouteMap[routePattern.routeId];
      return {
        route,
        path: buildRoutePath(route.path, params),
        requestedPath: path,
        params
      };
    }
  }

  const fallbackRoute = dashboardRouteMap.landing;

  return {
    route: fallbackRoute,
    path: fallbackRoute.path,
    requestedPath: path,
    params: {}
  };
}

export async function renderDashboardRoute(context: DashboardPageLoadContext): Promise<DashboardPageRenderResult> {
  switch (context.match.route.id) {
    case "landing": {
      return {
        title: "Binsight",
        description: "Public landing route aligned to the Stitch entry experience.",
        body: <LandingPage />
      };
    }

    case "login": {
      return {
        title: "Login",
        description: "Public login route reserved for the operator sign-in experience.",
        body: (
          <section className="dashboard-section-stack">
            <article className="dashboard-card">
              <p className="dashboard-page-kicker">Public route</p>
              <h2 className="dashboard-card-title">Login remains outside the protected operator shell.</h2>
              <p className="dashboard-subtitle">Signed-in sessions are redirected to analytics instead of rendering the login route inside the operator shell.</p>
            </article>
          </section>
        )
      };
    }

    case "devices": {
      const model = await loadStationsPage(context);
      return {
        title: "Devices",
        description: "Browse device profiles, metadata, and live-entry points before drilling into recent scans or realtime monitoring.",
        body: <StationsPage model={model} context={context} />
      };
    }

    case "device-detail": {
      const model = await loadStationDetailPage(context);
      return {
        title: "Device details",
        description: "Inspect one device profile, its current rules context, recent scan history, and nearby comparison set.",
        body: <StationDetailPage model={model} context={context} />
      };
    }

    case "live-monitoring": {
      const model = await loadLiveMonitoringPage(context);
      return {
        title: "Live device monitoring",
        description: "Listen to the bounded live-status document and surface stale or unavailable feed states explicitly.",
        body: <LiveMonitoringPage model={model} context={context} />
      };
    }

    case "event-history": {
      const model = await loadEventHistoryPage(context);
      return {
        title: "Event history",
        description: "Review backend-filtered disposal attempts across station, floor, building, location, and time dimensions.",
        body: <EventHistoryPage model={model} context={context} />
      };
    }

    case "analytics": {
      const model = await loadAnalyticsPage(context);
      return {
        title: "Analytics",
        description: "Track KPIs, contamination items, worst times of day, purity, and leaderboard rollups from backend analytics read models.",
        body: <AnalyticsPage model={model} context={context} />
      };
    }
  }
}