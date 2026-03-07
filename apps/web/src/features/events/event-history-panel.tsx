import type { EventHistoryResponse } from "@binbuddy/contracts";

export interface EventHistoryPanelProps {
  readonly response: EventHistoryResponse;
}

export function EventHistoryPanel(props: EventHistoryPanelProps): JSX.Element {
  return (
    <section>
      <div className="dashboard-row dashboard-row--baseline">
        <h2 className="dashboard-card-title">Disposal event history</h2>
        <p className="dashboard-muted">Served through the backend event-history API with explicit filters and pagination.</p>
      </div>

      <div className="dashboard-table-shell">
        <table className="dashboard-table">
          <thead className="dashboard-table-head">
            <tr>
              <th className="dashboard-table-cell">Timestamp</th>
              <th className="dashboard-table-cell">Station</th>
              <th className="dashboard-table-cell">Predicted item</th>
              <th className="dashboard-table-cell">Correct method</th>
              <th className="dashboard-table-cell">Actual zone</th>
              <th className="dashboard-table-cell">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {props.response.entries.map((entry) => (
              <tr key={entry.eventId} className="dashboard-table-row">
                <td className="dashboard-table-cell">{entry.event.timestamp}</td>
                <td className="dashboard-table-cell">
                  {entry.station.stationName}
                  <div className="dashboard-small-text">{entry.station.locationLabel}</div>
                </td>
                <td className="dashboard-table-cell">{entry.event.predictedItem}</td>
                <td className="dashboard-table-cell">{entry.event.correctDisposalMethod}</td>
                <td className="dashboard-table-cell">{entry.event.actualDisposalZone}</td>
                <td className="dashboard-table-cell">{entry.event.attemptResult}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="dashboard-note">
        Next cursor: {props.response.nextCursor ?? "No additional pages in current result set."}
      </p>
    </section>
  );
}