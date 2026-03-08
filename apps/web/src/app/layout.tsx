import type { DashboardRouteDefinition, DashboardRouteMatch } from "./types.js";

const APP_LOGO_SRC = new URL("../../assets/logo.png", import.meta.url).href;

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
  const showFooter = props.currentRoute.route.id !== "devices" && props.currentRoute.route.id !== "device-detail";

  return (
    <div data-surface="binsight-dashboard" className="dashboard-shell dashboard-shell--app">
      <header className="dashboard-auth-header dashboard-app-header">
        <a href="/dashboard" className="dashboard-brand dashboard-brand-link" aria-label="Binsight dashboard home">
          <img className="dashboard-brand-image" src={APP_LOGO_SRC} alt="Binsight" />
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
      </header>

      <main className="dashboard-main dashboard-main--app">
        <section className="dashboard-header dashboard-header--app">
          <p className="dashboard-eyebrow">Binsight operator system</p>
          <h1 className="dashboard-title">{props.title}</h1>
          <p className="dashboard-description">{props.description}</p>
        </section>

        {props.children}
      </main>
      {showFooter ? (
        <footer className="dashboard-auth-footer dashboard-app-footer">
          <span className="dashboard-auth-footer-copy">Visible IA: landing, login, dashboard, analytics, devices, and device details.</span>
          <span className="dashboard-auth-footer-action">System routes stay deferred until supported designs exist.</span>
        </footer>
      ) : null}
    </div>
  );
}