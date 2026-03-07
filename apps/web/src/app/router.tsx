import type {
  DashboardPageLoadContext,
  DashboardPageRenderResult,
  DashboardRouteDefinition,
  DashboardRouteMatch
} from "./types.js";

import { AnalyticsPage, loadAnalyticsPage } from "../pages/analytics.js";
import { ComparisonsPage, loadComparisonsPage } from "../pages/comparisons.js";
import { EventHistoryPage, loadEventHistoryPage } from "../pages/event-history.js";
import { LiveMonitoringPage, loadLiveMonitoringPage } from "../pages/live-monitoring.js";
import { StationDetailPage, loadStationDetailPage } from "../pages/station-detail.js";
import { StationsPage, loadStationsPage } from "../pages/stations.js";

export const dashboardRoutes = [
  {
    id: "stations",
    label: "Stations",
    description: "Station directory with active rules preset and metadata context.",
    path: "/stations",
    navigationLabel: "Stations",
    showInNavigation: true
  },
  {
    id: "station-detail",
    label: "Station detail",
    description: "Operator metadata view for one station.",
    path: "/stations/:stationId",
    showInNavigation: false
  },
  {
    id: "live-monitoring",
    label: "Live monitoring",
    description: "Live status and latest-frame camera monitoring.",
    path: "/stations/:stationId/live",
    navigationLabel: "Live view",
    showInNavigation: true
  },
  {
    id: "event-history",
    label: "Event history",
    description: "Filtered disposal attempt history served by the backend.",
    path: "/history",
    navigationLabel: "History",
    showInNavigation: true
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "KPI summaries, contamination trends, and leaderboards.",
    path: "/analytics",
    navigationLabel: "Analytics",
    showInNavigation: true
  },
  {
    id: "comparisons",
    label: "Comparisons",
    description: "Before-after, A/B, signage, layout, building, and location analysis.",
    path: "/comparisons",
    navigationLabel: "Comparisons",
    showInNavigation: true
  }
] as const satisfies readonly DashboardRouteDefinition[];

export const DEFAULT_DASHBOARD_PATH = "/stations";

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

export function getNavigationRoutes(): readonly DashboardRouteDefinition[] {
  return dashboardRoutes.filter((route) => route.showInNavigation);
}

export function matchDashboardRoute(path: string): DashboardRouteMatch {
  for (const route of dashboardRoutes) {
    const params = matchSegments(route.path, path);
    if (params) {
      return {
        route,
        path,
        params
      };
    }
  }

  return {
    route: dashboardRoutes[0],
    path: DEFAULT_DASHBOARD_PATH,
    params: {}
  };
}

export async function renderDashboardRoute(context: DashboardPageLoadContext): Promise<DashboardPageRenderResult> {
  switch (context.match.route.id) {
    case "stations": {
      const model = await loadStationsPage(context);
      return {
        title: "Station directory",
        description: "Browse stations, metadata, and active rules presets before drilling into live or historical views.",
        body: <StationsPage model={model} context={context} />
      };
    }

    case "station-detail": {
      const model = await loadStationDetailPage(context);
      return {
        title: "Station detail",
        description: "Inspect one station's active rules preset, experiment variants, and neighboring comparison set.",
        body: <StationDetailPage model={model} context={context} />
      };
    }

    case "live-monitoring": {
      const model = await loadLiveMonitoringPage(context);
      return {
        title: "Live monitoring",
        description: "Listen to the bounded live-status document and surface stale or unavailable camera feed states explicitly.",
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

    case "comparisons": {
      const model = await loadComparisonsPage(context);
      return {
        title: "Comparisons",
        description: "Review cross-station, building, signage, layout, before-after, and A/B comparisons without direct historical Firestore queries.",
        body: <ComparisonsPage model={model} context={context} />
      };
    }
  }
}