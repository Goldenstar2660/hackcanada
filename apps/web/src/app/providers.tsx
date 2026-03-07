import type { DashboardAppDependencies, DashboardPageLoadContext, DashboardProviderRegistry } from "./types.js";
import type { DashboardFilterState } from "../lib/query/dashboard-query.js";

import { DashboardLayout } from "./layout.js";
import { getNavigationRoutes, matchDashboardRoute, renderDashboardRoute } from "./router.js";
import { normalizeDashboardFilters } from "../lib/query/dashboard-query.js";

export interface DashboardAppRenderRequest {
  readonly path?: string;
  readonly filters?: Partial<DashboardFilterState>;
}

export interface DashboardAppRenderResult {
  readonly context: DashboardPageLoadContext;
  readonly element: JSX.Element;
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
  const match = matchDashboardRoute(request.path ?? "/stations");
  const filters = normalizeDashboardFilters(request.filters, providers.now());
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