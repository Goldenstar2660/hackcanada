import type { StationRecord } from "@binbuddy/contracts";

export interface StationDirectoryProps {
  readonly stations: readonly StationRecord[];
  readonly selectedStationId?: string;
}

export function StationDirectory(props: StationDirectoryProps): JSX.Element {
  return (
    <section>
      <div className="dashboard-row dashboard-row--baseline">
        <h2 className="dashboard-card-title">Station directory</h2>
        <p className="dashboard-muted">Every station card carries active rules preset, signage, and layout context.</p>
      </div>

      <div className="dashboard-grid dashboard-grid--cards">
        {props.stations.map((station) => (
          <article
            key={station.stationId}
            className={`dashboard-card ${station.stationId === props.selectedStationId ? "dashboard-card--selected" : "dashboard-card--accent"}`}
          >
            <div className="dashboard-card-link-row">
              <div>
                <h3 className="dashboard-card-title">{station.stationName}</h3>
                <p className="dashboard-subtitle">{station.stationId}</p>
              </div>
              <a href={`/stations/${station.stationId}`} className="dashboard-link">
                View detail
              </a>
            </div>

            <dl className="dashboard-detail-list">
              <div>
                <dt>Location</dt>
                <dd className="dashboard-detail-value">
                  {station.buildingLabel}, {station.floorLabel}, {station.locationLabel}
                </dd>
              </div>
              <div>
                <dt>Rules preset</dt>
                <dd className="dashboard-detail-value">
                  {station.activeRulesPreset.presetId} v{station.activeRulesPreset.version} ({station.activeRulesPreset.jurisdiction.city},{" "}
                  {station.activeRulesPreset.jurisdiction.provinceOrState})
                </dd>
              </div>
              <div>
                <dt>Zone mapping</dt>
                <dd className="dashboard-detail-value">
                  Left {station.activeRulesPreset.zoneMapping.left}, middle {station.activeRulesPreset.zoneMapping.middle}, right {station.activeRulesPreset.zoneMapping.right}
                </dd>
              </div>
              <div>
                <dt>Experiment variants</dt>
                <dd className="dashboard-detail-value">
                  Signage {station.signageVariant}, layout {station.layoutVariant}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}