import type { StationRecord } from "@binsight/contracts";

export interface StationDirectoryProps {
  readonly stations: readonly StationRecord[];
  readonly selectedStationId?: string;
}

function formatZoneMapping(station: StationRecord): string {
  return `L ${station.activeRulesPreset.zoneMapping.left} / M ${station.activeRulesPreset.zoneMapping.middle} / R ${station.activeRulesPreset.zoneMapping.right}`;
}

export function StationDirectory(props: StationDirectoryProps): JSX.Element {
  return (
    <section className="dashboard-section-stack">
      <div className="dashboard-row dashboard-row--baseline">
        <h2 className="dashboard-card-title">Fleet roster</h2>
        <p className="dashboard-muted">Each card preserves the current directory seam and the primary device detail route.</p>
      </div>

      <div className="dashboard-directory-grid">
        {props.stations.length > 0 ? props.stations.map((station) => (
          <article
            key={station.stationId}
            className={`dashboard-card dashboard-directory-card dashboard-device-card ${station.stationId === props.selectedStationId ? "dashboard-card--selected" : "dashboard-card--accent"}`}
          >
            <div className="dashboard-directory-media dashboard-directory-media--device" aria-hidden="true">
              <p className="dashboard-directory-label">Device profile</p>
              <p className="dashboard-directory-mark">{station.stationId}</p>
              <div className="dashboard-device-card-media-meta">
                <span className="dashboard-device-card-status">Rules active</span>
              </div>
            </div>

            <div className="dashboard-directory-copy">
              <h3 className="dashboard-card-title">{station.stationName}</h3>
              <p className="dashboard-device-card-subtitle">{station.buildingLabel} · {station.floorLabel}</p>
              <div className="dashboard-chip-row">
                <span className="dashboard-chip dashboard-chip--active">{station.locationLabel}</span>
                <span className="dashboard-chip">Signage {station.signageVariant}</span>
                <span className="dashboard-chip">Layout {station.layoutVariant}</span>
              </div>
              <div className="dashboard-directory-location">
                <p className="dashboard-field-label">Location</p>
                <p className="dashboard-detail-value">{station.buildingLabel}, {station.floorLabel}</p>
              </div>
            </div>

            <dl className="dashboard-definition-grid dashboard-directory-metadata">
              <div>
                <dt className="dashboard-field-label">Rules preset</dt>
                <dd className="dashboard-detail-value">
                  {station.activeRulesPreset.presetId} v{station.activeRulesPreset.version}
                </dd>
              </div>
              <div>
                <dt className="dashboard-field-label">Jurisdiction</dt>
                <dd className="dashboard-detail-value">
                  {station.activeRulesPreset.jurisdiction.city}, {station.activeRulesPreset.jurisdiction.provinceOrState}
                </dd>
              </div>
              <div>
                <dt className="dashboard-field-label">Zone mapping</dt>
                <dd className="dashboard-detail-value">{formatZoneMapping(station)}</dd>
              </div>
              <div>
                <dt className="dashboard-field-label">Variants</dt>
                <dd className="dashboard-detail-value">Signage {station.signageVariant} / Layout {station.layoutVariant}</dd>
              </div>
            </dl>

            <div className="dashboard-directory-actions">
              <a href={`/devices/${station.stationId}`} className="dashboard-button dashboard-button--ghost">
                Details
              </a>
            </div>
          </article>
        )) : (
          <article className="dashboard-card dashboard-directory-empty">
            <p className="dashboard-page-kicker">No devices in scope</p>
            <h3 className="dashboard-card-title">Adjust the current filters</h3>
            <p className="dashboard-subtitle">The route query excluded all known devices from the current directory view.</p>
          </article>
        )}
      </div>
    </section>
  );
}