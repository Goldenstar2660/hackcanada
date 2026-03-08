import type { AnalyticsInsightsResponse } from "@binsight/contracts";

export function AnalyticsInsightsPanel(props: {
  readonly insights: AnalyticsInsightsResponse;
  readonly kicker?: string;
}): JSX.Element {
  return (
    <section className="dashboard-analytics-insights-shell" aria-label="AI insights placeholders">
      <div className="dashboard-analytics-insights-header">
        <p className="dashboard-page-kicker">{props.kicker ?? "AI-powered insights"}</p>
        <h3 className="dashboard-card-title">
          {props.insights.status === "ready" ? "Generated insight cards" : "Insight placeholders"}
        </h3>
      </div>
      <div className="dashboard-analytics-insights-grid">
        {props.insights.cards.map((card) => (
          <article
            key={card.id}
            className={`dashboard-analytics-insight-card${card.emphasis === "primary" ? " dashboard-analytics-insight-card--primary" : ""}`}
          >
            <p className="dashboard-field-label dashboard-analytics-insight-label">{card.title}</p>
            <p className={`dashboard-analytics-insight-copy${card.emphasis === "primary" ? "" : " dashboard-analytics-insight-copy--muted"}`}>
              {card.body}
            </p>
          </article>
        ))}
      </div>
      {props.insights.status === "placeholder" && props.insights.fallbackReason ? (
        <p className="dashboard-status dashboard-status--empty dashboard-analytics-insight-status">
          AI insight fallback active: {props.insights.fallbackReason}
        </p>
      ) : null}
    </section>
  );
}