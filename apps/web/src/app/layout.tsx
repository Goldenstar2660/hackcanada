import type { DashboardRouteDefinition, DashboardRouteMatch } from "./types.js";

export interface DashboardLayoutProps {
  readonly currentRoute: DashboardRouteMatch;
  readonly navigationRoutes: readonly DashboardRouteDefinition[];
  readonly title: string;
  readonly description: string;
  readonly children: JSX.Element;
}

function isRouteSelected(currentPath: string, routePath: string): boolean {
  return currentPath === routePath || currentPath.startsWith(`${routePath}/`);
}

export function DashboardLayout(props: DashboardLayoutProps): JSX.Element {
  return (
    <div data-surface="binsight-dashboard" className="dashboard-shell">
      <header className="dashboard-header">
        <p className="dashboard-eyebrow">Binsight operator dashboard</p>
        <h1 className="dashboard-title">{props.title}</h1>
        <p className="dashboard-description">{props.description}</p>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <nav aria-label="Primary">
            <ul className="dashboard-nav-list">
              {props.navigationRoutes.map((route) => (
                <li key={route.id}>
                  <a
                    href={route.path}
                    aria-current={isRouteSelected(props.currentRoute.path, route.path) ? "page" : undefined}
                    className={`dashboard-nav-link${isRouteSelected(props.currentRoute.path, route.path) ? " is-active" : ""}`}
                  >
                    <strong className="dashboard-nav-title">{route.navigationLabel ?? route.label}</strong>
                    <span className="dashboard-nav-description">
                      {route.description}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="dashboard-main">{props.children}</main>
      </div>
    </div>
  );
}