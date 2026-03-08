import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import type { DashboardAppDependencies, DashboardPageLoadContext, DashboardProviderRegistry } from "./types.js";
import type { DashboardBrowserAuthState, DashboardBrowserServices } from "./types.js";
import type { DashboardFilterState } from "../lib/query/dashboard-query.js";

import { DashboardLayout } from "./layout.js";
import { getNavigationRoutes, matchDashboardRoute, renderDashboardRoute } from "./router.js";
import { createDashboardApiClient } from "../lib/api/dashboard-api.js";
import { createFirebaseCallableInvoker, createOperatorDashboardGateway } from "../lib/api/dashboard-gateway.js";
import { createLiveMonitoringGateway } from "../lib/firebase/live-monitoring.js";
import {
  createAuthorizedLiveStatusClient,
  createFirestoreLiveStatusTransport,
  createOperatorSessionFromUser
} from "../lib/firebase/live-status.js";
import { normalizeDashboardFilters, parseDashboardFilters } from "../lib/query/dashboard-query.js";

export interface DashboardAppRenderRequest {
  readonly path?: string;
  readonly filters?: Partial<DashboardFilterState>;
}

export interface DashboardAppRenderResult {
  readonly context: DashboardPageLoadContext;
  readonly element: JSX.Element;
}

interface BrowserPageState {
  readonly status: "loading" | "ready" | "error";
  readonly result?: DashboardAppRenderResult;
  readonly error?: unknown;
}

export interface DashboardBrowserApplicationProps {
  readonly services: DashboardBrowserServices;
  readonly initialPath?: string;
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

function createInitialAuthState(): DashboardBrowserAuthState {
  return {
    status: "loading",
    user: null,
    session: null
  };
}

function normalizeRoutePath(input: string): string {
  if (!input) {
    return "/stations";
  }

  return input.startsWith("/") ? input : `/${input}`;
}

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown dashboard error.";
}

function isUnauthorizedError(error: unknown): boolean {
  const message = getFriendlyErrorMessage(error).toLowerCase();
  return message.includes("permission") || message.includes("unauth") || message.includes("operator");
}

function serializeFormToSearchParams(form: HTMLFormElement): URLSearchParams {
  const params = new URLSearchParams();
  const formData = new FormData(form);

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value.length > 0) {
      params.append(key, value);
    }
  }

  return params;
}

function DashboardStandaloneShell(props: {
  readonly children: JSX.Element;
  readonly footerAction?: JSX.Element;
}): JSX.Element {
  return (
    <section className="dashboard-shell dashboard-shell--standalone dashboard-auth-shell">
      <header className="dashboard-auth-header">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark" aria-hidden="true">DS</span>
          <span className="dashboard-brand-wordmark">BiNSIGHT</span>
        </div>
        <nav className="dashboard-auth-nav" aria-label="Dashboard sections preview">
          <span>Dashboard</span>
          <span>Analytics</span>
          <span>Devices</span>
          <span>Settings</span>
        </nav>
        <div className="dashboard-auth-actions" aria-hidden="true">
          <span className="dashboard-auth-icon-button">Alerts</span>
          <span className="dashboard-auth-avatar">OP</span>
        </div>
      </header>

      <main className="dashboard-auth-main">{props.children}</main>

      <footer className="dashboard-auth-footer">
        <p className="dashboard-auth-footer-copy">2026 Binsight operator systems</p>
        {props.footerAction ?? <span className="dashboard-auth-footer-action">Firebase Auth email access only</span>}
      </footer>
    </section>
  );
}

function DashboardLoadingState(): JSX.Element {
  return (
    <DashboardStandaloneShell>
      <article className="dashboard-card dashboard-card--auth dashboard-auth-card">
        <p className="dashboard-auth-kicker">System handshake</p>
        <h1 className="dashboard-card-title dashboard-auth-title">Loading operator dashboard</h1>
        <p className="dashboard-subtitle dashboard-auth-copy">Connecting to Firebase Auth, backend callables, and the live-status subscription surface.</p>
      </article>
    </DashboardStandaloneShell>
  );
}

function DashboardErrorState(props: { readonly error: unknown }): JSX.Element {
  return (
    <DashboardStandaloneShell>
      <article className="dashboard-card dashboard-card--auth dashboard-auth-card">
        <p className="dashboard-auth-kicker">Access control</p>
        <h1 className="dashboard-card-title dashboard-auth-title">{isUnauthorizedError(props.error) ? "Operator access required" : "Dashboard load failed"}</h1>
        <p className="dashboard-subtitle dashboard-auth-copy">{getFriendlyErrorMessage(props.error)}</p>
      </article>
    </DashboardStandaloneShell>
  );
}

function DashboardLoginState(props: {
  readonly onSubmit: (email: string, password: string) => Promise<void>;
  readonly busy: boolean;
  readonly error: string | null;
}): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <DashboardStandaloneShell
      footerAction={<span className="dashboard-auth-footer-action">Social sign-in is unavailable in this demo build</span>}
    >
      <article className="dashboard-card dashboard-card--auth dashboard-auth-card">
        <div className="dashboard-auth-card-header">
          <p className="dashboard-auth-kicker">Operator access</p>
          <h1 className="dashboard-card-title dashboard-auth-title">Login to BiNSIGHT</h1>
          <p className="dashboard-subtitle dashboard-auth-copy">Access the waste-sorting dashboard with a Firebase Auth email and password account.</p>
        </div>

        {props.error ? <p className="dashboard-status dashboard-status--warning">{props.error}</p> : null}

        <form
          className="dashboard-section-stack dashboard-auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void props.onSubmit(email, password);
          }}
        >
          <label className="dashboard-field">
            <span className="dashboard-field-label">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              className="dashboard-input"
              autoComplete="email"
              placeholder="name@company.com"
              required={true}
            />
          </label>

          <label className="dashboard-field">
            <span className="dashboard-auth-password-row">
              <span className="dashboard-field-label">Password</span>
              <span className="dashboard-auth-inline-link" aria-disabled="true">Reset unavailable</span>
            </span>
            <span className="dashboard-auth-password-input">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                className="dashboard-input"
                autoComplete="current-password"
                placeholder="Enter your password"
                required={true}
              />
              <button
                type="button"
                className="dashboard-auth-visibility"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          <button type="submit" className="dashboard-button dashboard-button--primary" disabled={props.busy}>
            {props.busy ? "Signing in..." : "Login to dashboard"}
          </button>
        </form>

        <div className="dashboard-auth-divider" aria-hidden="true">
          <span>Or continue with</span>
        </div>

        <div className="dashboard-auth-social-grid" aria-label="Unavailable social sign-in providers">
          <button type="button" className="dashboard-auth-social-button" disabled={true} aria-disabled="true">
            <span className="dashboard-auth-social-badge">G</span>
            <span>Google unavailable</span>
          </button>
          <button type="button" className="dashboard-auth-social-button" disabled={true} aria-disabled="true">
            <span className="dashboard-auth-social-badge">GH</span>
            <span>GitHub unavailable</span>
          </button>
        </div>

        <p className="dashboard-auth-footnote">
          Need access? Contact the demo operator admin to provision an email-password account.
        </p>
      </article>
    </DashboardStandaloneShell>
  );
}

export function DashboardBrowserApplication(props: DashboardBrowserApplicationProps): JSX.Element {
  const [authState, setAuthState] = useState<DashboardBrowserAuthState>(createInitialAuthState);
  const [pageState, setPageState] = useState<BrowserPageState>({ status: "loading" });
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(() => normalizeRoutePath(props.initialPath ?? `${window.location.pathname}${window.location.search}`));
  const deferredPath = useDeferredValue(currentPath);

  const dependencies = useMemo<DashboardAppDependencies | null>(() => {
    if (!authState.session) {
      return null;
    }

    const api = createOperatorDashboardGateway(createDashboardApiClient(createFirebaseCallableInvoker(props.services.functions)));
    const liveClient = createAuthorizedLiveStatusClient(
      authState.session,
      createFirestoreLiveStatusTransport(props.services.firestore)
    );

    return {
      api,
      live: createLiveMonitoringGateway(liveClient)
    };
  }, [authState.session, props.services.firestore, props.services.functions]);

  useEffect(() => {
    void setPersistence(props.services.auth, browserLocalPersistence).catch(() => undefined);

    return onAuthStateChanged(props.services.auth, (user) => {
      if (!user) {
        startTransition(() => {
          setAuthState({ status: "signed-out", user: null, session: null });
          setPageState({ status: "loading" });
        });
        return;
      }

      void createOperatorSessionFromUser(user)
        .then((session) => {
          startTransition(() => {
            setAuthState({ status: "signed-in", user, session });
            setLoginError(null);
          });
        })
        .catch((error) => {
          startTransition(() => {
            setAuthState({ status: "signed-out", user: null, session: null });
            setLoginError(getFriendlyErrorMessage(error));
          });
        });
    });
  }, [props.services.auth]);

  useEffect(() => {
    const handlePopState = () => {
      startTransition(() => {
        setCurrentPath(normalizeRoutePath(`${window.location.pathname}${window.location.search}`));
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!dependencies) {
      return;
    }

    let cancelled = false;
    setPageState((current) => ({ status: "loading", result: current.result }));

    void renderDashboardApplication(dependencies, { path: deferredPath })
      .then((result) => {
        if (!cancelled) {
          startTransition(() => {
            setPageState({ status: "ready", result });
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          startTransition(() => {
            setPageState({ status: "error", error });
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredPath, dependencies]);

  const navigate = (nextPath: string, replace = false) => {
    const normalizedPath = normalizeRoutePath(nextPath);
    if (replace) {
      window.history.replaceState(null, "", normalizedPath);
    } else {
      window.history.pushState(null, "", normalizedPath);
    }
    startTransition(() => {
      setCurrentPath(normalizedPath);
    });
  };

  if (authState.status === "loading") {
    return <DashboardLoadingState />;
  }

  if (authState.status === "signed-out") {
    return (
      <DashboardLoginState
        busy={loginBusy}
        error={loginError}
        onSubmit={async (email, password) => {
          setLoginBusy(true);
          setLoginError(null);
          try {
            await signInWithEmailAndPassword(props.services.auth, email.trim(), password);
          } catch (error) {
            setLoginError(getFriendlyErrorMessage(error));
          } finally {
            setLoginBusy(false);
          }
        }}
      />
    );
  }

  const hasVisiblePage = Boolean(pageState.result);
  const showTransitionIndicator = pageState.status === "loading" && hasVisiblePage;

  return (
    <div
      onClickCapture={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const anchor = target.closest("a");
        if (!(anchor instanceof HTMLAnchorElement)) {
          return;
        }

        if (
          event.defaultPrevented
          || anchor.target
          || anchor.hasAttribute("download")
          || event.metaKey
          || event.ctrlKey
          || event.shiftKey
          || event.altKey
        ) {
          return;
        }

        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) {
          return;
        }

        event.preventDefault();
        navigate(`${url.pathname}${url.search}`);
      }}
      onSubmitCapture={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLFormElement)) {
          return;
        }

        const method = (target.method || "get").toLowerCase();
        if (method !== "get") {
          return;
        }

        const action = target.getAttribute("action") || deferredPath;
        const url = new URL(action, window.location.origin);
        if (url.origin !== window.location.origin) {
          return;
        }

        event.preventDefault();
        const search = serializeFormToSearchParams(target).toString();
        navigate(search.length > 0 ? `${url.pathname}?${search}` : url.pathname);
      }}
    >
      <div className="dashboard-operator-bar">
        <div>
          <strong>Operator session</strong>
          <span className="dashboard-operator-meta">{authState.user?.email ?? authState.user?.uid}</span>
        </div>
        <button
          type="button"
          className="dashboard-button dashboard-button--ghost"
          onClick={() => {
            void signOut(props.services.auth);
          }}
        >
          Sign out
        </button>
      </div>
      {showTransitionIndicator ? (
        <p className="dashboard-status" aria-live="polite">
          Loading next dashboard view...
        </p>
      ) : null}
      {pageState.status === "loading" && !hasVisiblePage ? <DashboardLoadingState /> : null}
      {pageState.status === "error" ? <DashboardErrorState error={pageState.error} /> : null}
      {(pageState.status === "ready" || pageState.status === "loading")
        ? pageState.result?.element ?? <DashboardErrorState error={new Error("Missing dashboard render result.")} />
        : null}
    </div>
  );
}