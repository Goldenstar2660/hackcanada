import type { StationDirectoryResponse, StationRecord } from "@binsight/contracts";

import type { DashboardFilterState } from "../../lib/query/dashboard-query.js";

export interface FilterControlsProps {
  readonly actionPath: string;
  readonly filters: DashboardFilterState;
  readonly availableFilters: StationDirectoryResponse["filters"];
  readonly availableStations?: readonly StationRecord[];
  readonly stationCount?: number;
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function FilterControls(props: FilterControlsProps): JSX.Element {
  const stationOptions = props.availableStations ?? [];
  const stationValues = [...props.filters.stationIds];
  const buildingValues = [...props.filters.buildingIds];
  const floorValues = [...props.filters.floorIds];
  const locationValues = [...props.filters.locationLabels];
  const signageValues = [...props.filters.signageVariants];
  const layoutValues = [...props.filters.layoutVariants];
  const scopedStationCount = props.stationCount ?? stationOptions.length;

  return (
    <section aria-label="Dashboard filters" className="dashboard-card dashboard-filter-shell">
      <div className="dashboard-row dashboard-row--baseline">
        <div>
          <p className="dashboard-page-kicker">Fleet and route filters</p>
          <h2 className="dashboard-card-title">Filter controls</h2>
          <p className="dashboard-subtitle">
            Adjust device, location, experiment, and time filters with the existing GET query contract while using the shared Stitch translation layer.
          </p>
        </div>
        <div className="dashboard-chip-row dashboard-filter-summary" aria-label="Filter summary">
          <span className="dashboard-chip dashboard-chip--active">{scopedStationCount} devices in scope</span>
          <span className="dashboard-chip">Time label {props.filters.timeRange.label}</span>
          <span className="dashboard-chip">Route-backed GET query</span>
        </div>
      </div>

      <form method="get" action={props.actionPath} className="dashboard-filter-form">
        <div className="dashboard-grid dashboard-grid--wide dashboard-filter-grid">
          <label className="dashboard-field">
            <span className="dashboard-field-label">Devices</span>
            <select
              name="stationId"
              multiple={true}
              size={Math.min(Math.max(stationOptions.length, 2), 6)}
              className="dashboard-select"
              defaultValue={stationValues}
            >
              {stationOptions.map((station) => (
                <option key={station.stationId} value={station.stationId}>
                  {station.stationName} ({station.stationId})
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-field">
            <span className="dashboard-field-label">Buildings</span>
            <select
              name="buildingId"
              multiple={true}
              size={Math.min(Math.max(props.availableFilters.buildings.length, 2), 6)}
              className="dashboard-select"
              defaultValue={buildingValues}
            >
              {props.availableFilters.buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-field">
            <span className="dashboard-field-label">Floors</span>
            <select
              name="floorId"
              multiple={true}
              size={Math.min(Math.max(props.availableFilters.floors.length, 2), 6)}
              className="dashboard-select"
              defaultValue={floorValues}
            >
              {props.availableFilters.floors.map((floor) => (
                <option key={`${floor.buildingId}:${floor.id}`} value={floor.id}>
                  {floor.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-field">
            <span className="dashboard-field-label">Locations</span>
            <select
              name="location"
              multiple={true}
              size={Math.min(Math.max(props.availableFilters.locations.length, 2), 6)}
              className="dashboard-select"
              defaultValue={locationValues}
            >
              {props.availableFilters.locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-field">
            <span className="dashboard-field-label">Signage variants</span>
            <select
              name="signage"
              multiple={true}
              size={Math.min(Math.max(props.availableFilters.signageVariants.length, 2), 5)}
              className="dashboard-select"
              defaultValue={signageValues}
            >
              {props.availableFilters.signageVariants.map((variant) => (
                <option key={variant} value={variant}>
                  {variant}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-field">
            <span className="dashboard-field-label">Layout variants</span>
            <select
              name="layout"
              multiple={true}
              size={Math.min(Math.max(props.availableFilters.layoutVariants.length, 2), 5)}
              className="dashboard-select"
              defaultValue={layoutValues}
            >
              {props.availableFilters.layoutVariants.map((variant) => (
                <option key={variant} value={variant}>
                  {variant}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-field">
            <span className="dashboard-field-label">Time label</span>
            <input name="timeLabel" type="text" defaultValue={props.filters.timeRange.label} className="dashboard-input" />
          </label>

          <label className="dashboard-field">
            <span className="dashboard-field-label">Start</span>
            <input
              name="timeStart"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(props.filters.timeRange.start)}
              className="dashboard-input"
            />
          </label>

          <label className="dashboard-field">
            <span className="dashboard-field-label">End</span>
            <input
              name="timeEnd"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(props.filters.timeRange.end)}
              className="dashboard-input"
            />
          </label>
        </div>

        <div className="dashboard-row dashboard-row--actions">
          <p className="dashboard-small-text dashboard-filter-hint">
            Hold Ctrl or Cmd to pick multiple values. Submitting updates the route query used by analytics, history, live deep links, and device directory filtering.
          </p>
          <div className="dashboard-action-group">
            <a href={props.actionPath} className="dashboard-button dashboard-button--ghost">
              Reset filters
            </a>
            <button type="submit" className="dashboard-button">
              Apply filters
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}