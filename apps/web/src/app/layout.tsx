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
  const isSecondaryRoute = !props.currentRoute.route.showInNavigation;
  const isCompatibilityPath = props.currentRoute.requestedPath !== props.currentRoute.path;

  return (
    <div data-surface="binsight-dashboard" className="dashboard-shell dashboard-shell--app">
      <header className="dashboard-auth-header dashboard-app-header">
        <a href="/dashboard" className="dashboard-brand dashboard-brand-link" aria-label="Binsight dashboard home">
          <span className="dashboard-brand-mark" aria-hidden="true">DS</span>
          <span className="dashboard-brand-wordmark">BiNSIGHT</span>
        </a>

        <nav className="dashboard-top-nav" aria-label="Primary">
          {props.navigationRoutes.map((route) => (
            <a
              key={route.id}
              href={route.path}
              aria-current={isRouteSelected(props.currentRoute.path, route.path) ? "page" : undefined}
              className={`dashboard-top-nav-link${isRouteSelected(props.currentRoute.path, route.path) ? " is-active" : ""}`}
            >
              {route.navigationLabel ?? route.label}
            </a>
          ))}
        </nav>

        <div className="dashboard-auth-actions">
          <span className="dashboard-auth-icon-button">LIVE</span>
          <span className="dashboard-auth-avatar">OP</span>
        </div>
      </header>

      <main className="dashboard-main dashboard-main--app">
        <section className="dashboard-header dashboard-header--app">
          <p className="dashboard-eyebrow">Binsight operator system</p>
          <div className="dashboard-row dashboard-row--baseline">
            <div>
              <h1 className="dashboard-title">{props.title}</h1>
              <p className="dashboard-description">{props.description}</p>
            </div>
            <div className="dashboard-chip-row" aria-label="Route context">
              <span className="dashboard-chip dashboard-chip--active">
                {isSecondaryRoute ? "Secondary route" : "Primary route"}
              </span>
              <span className="dashboard-chip">Visible IA: Dashboard, Analytics, and Devices</span>
              {isSecondaryRoute ? <span className="dashboard-chip dashboard-chip--warning">Deep link retained for migration safety</span> : null}
              {isCompatibilityPath ? <span className="dashboard-chip">Compatibility path {props.currentRoute.requestedPath}</span> : null}
            </div>
          </div>
        </section>

        {props.children}
      </main>

      <footer className="dashboard-auth-footer dashboard-app-footer">
        <span className="dashboard-auth-footer-copy">Visible IA: landing, login, dashboard, analytics, devices, and device details.</span>
        <span className="dashboard-auth-footer-action">System routes stay deferred until supported designs exist.</span>
      </footer>
    </div>
  );
}