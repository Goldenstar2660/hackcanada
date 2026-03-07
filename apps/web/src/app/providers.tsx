import type { DashboardAppDependencies, DashboardPageLoadContext, DashboardProviderRegistry } from "./types.js";
import type { DashboardFilterState } from "../lib/query/dashboard-query.js";

import { DashboardLayout } from "./layout.js";
import { getNavigationRoutes, matchDashboardRoute, renderDashboardRoute } from "./router.js";
import { normalizeDashboardFilters, parseDashboardFilters } from "../lib/query/dashboard-query.js";

export interface DashboardAppRenderRequest {
  readonly path?: string;
  readonly filters?: Partial<DashboardFilterState>;
}

export interface DashboardAppRenderResult {
  readonly context: DashboardPageLoadContext;
  readonly element: JSX.Element;
}

function splitRoutePath(inputPath: string): { pathname: string; searchParams: URLSearchParams } {
  const [pathname, search = ""] = inputPath.split("?", 2);

  return {
    pathname: pathname || "/stations",
    searchParams: new URLSearchParams(search)
  };
}

export function createDashboardProviderRegistry(dependencies: DashboardAppDependencies): DashboardProviderRegistry {
  return {
    ...dependencies,
    now: dependencies.now ?? (() => new Date())
  };
}

export function DashboardProviders(props: { readonly children: JSX.Element }): JSX.Element {
  return <>{props.children}</>;
}

export async function renderDashboardApplication(
  dependencies: DashboardAppDependencies,
  request: DashboardAppRenderRequest = {}
): Promise<DashboardAppRenderResult> {
  const providers = createDashboardProviderRegistry(dependencies);
  const route = splitRoutePath(request.path ?? "/stations");
  const match = matchDashboardRoute(route.pathname);
  const queryFilters = parseDashboardFilters(route.searchParams, providers.now());
  const filters = normalizeDashboardFilters(
    request.filters
      ? {
        ...queryFilters,
        ...request.filters,
        timeRange: request.filters.timeRange ?? queryFilters.timeRange
      }
      : queryFilters,
    providers.now()
  );
  const context: DashboardPageLoadContext = {
    providers,
    match,
    filters
  };
  const page = await renderDashboardRoute(context);

  return {
    context,
    element: (
      <DashboardProviders>
        <DashboardLayout
          currentRoute={match}
          navigationRoutes={getNavigationRoutes()}
          title={page.title}
          description={page.description}
        >
          {page.body}
        </DashboardLayout>
      </DashboardProviders>
    )
  };
}