const landingNavigation = [
  {
    label: "Dashboard",
    href: "/dashboard"
  },
  {
    label: "Analytics",
    href: "/analytics"
  },
  {
    label: "Devices",
    href: "/devices"
  },
  {
    label: "System",
    status: "deferred"
  }
] as const;

const landingMetrics = [
  {
    value: "94.2%",
    label: "Network Precision",
    note: "Static presentation metric until a public-safe live source exists."
  },
  {
    value: "12.8%",
    label: "Contamination",
    note: "Static presentation metric that stays labeled until public analytics are approved."
  },
  {
    value: "24",
    label: "Active Nodes",
    note: "Public-safe placeholder count aligned to the landing-page mockup."
  }
] as const;

export function LandingPage(): JSX.Element {
  return (
    <section className="dashboard-public-shell">
      <div className="dashboard-public-grid-layer" aria-hidden="true" />
      <div className="dashboard-public-sun-slats" aria-hidden="true" />

      <div className="dashboard-public-wrapper">
        <nav className="dashboard-public-nav" aria-label="Public navigation preview">
          {landingNavigation.map((item) => "href" in item ? (
            <a key={item.label} href={item.href} className="dashboard-public-nav-link">
              {item.label}
            </a>
          ) : (
            <span
              key={item.label}
              className="dashboard-public-nav-link is-disabled"
              aria-disabled="true"
              title={`${item.label} remains deferred in this phase`}
            >
              {item.label}
            </span>
          ))}
        </nav>

        <section className="dashboard-public-stage">
          <div className="dashboard-public-hero">
            <h1 className="dashboard-public-title">
              We are
              <br />
              Experts
              <br />
              Refining
              <br />
              Disposal.
            </h1>

            <p className="dashboard-public-description">
              Computer vision for waste classification. Binsight hardware identifies materials in real time,
              signals the correct disposal path, and keeps the protected operator experience behind the existing
              Firebase Auth gate.
            </p>
          </div>

          <aside className="dashboard-public-brand-panel">
            <div>
              <p className="dashboard-public-brand-name">B<span>i</span>NSIGHT</p>
              <p className="dashboard-public-brand-subtitle">By Vastum Generis</p>
            </div>

            <div className="dashboard-section-stack">
              <a href="/login" className="dashboard-button dashboard-button--primary dashboard-public-login-button">
                System Login
              </a>
              <p className="dashboard-public-brand-note">
                System destinations remain deferred until supported designs and public-safe routing are approved.
              </p>
            </div>
          </aside>
        </section>

        <footer className="dashboard-public-footer" aria-label="Public metrics preview">
          {landingMetrics.map((metric) => (
            <article key={metric.label} className="dashboard-public-stat-item">
              <p className="dashboard-public-stat-value">{metric.value}</p>
              <p className="dashboard-public-stat-label">{metric.label}</p>
              <p className="dashboard-public-stat-note">{metric.note}</p>
            </article>
          ))}
        </footer>
      </div>
    </section>
  );
}