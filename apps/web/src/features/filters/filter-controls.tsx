import type { StationDirectoryResponse } from "@binbuddy/contracts";

import type { DashboardFilterState } from "../../lib/query/dashboard-query.js";

export interface FilterControlsProps {
  readonly filters: DashboardFilterState;
  readonly availableFilters: StationDirectoryResponse["filters"];
  readonly stationCount?: number;
}

function renderSelectedValues(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "All";
}

export function FilterControls(props: FilterControlsProps): JSX.Element {
  return (
    <section aria-label="Dashboard filters" className="dashboard-card">
      <div className="dashboard-row">
        <div>
          <h2 className="dashboard-card-title">Filter surface</h2>
          <p className="dashboard-subtitle">
            Station, floor, building, location, signage, layout, and time range stay explicit in the route-level model.
          </p>
        </div>
        <div className="dashboard-muted">
          <strong>{props.stationCount ?? 0}</strong> stations in current directory scope
        </div>
      </div>

      <dl className="dashboard-definition-grid">
        <div>
          <dt>Station IDs</dt>
          <dd className="dashboard-detail-value">{renderSelectedValues(props.filters.stationIds)}</dd>
        </div>
        <div>
          <dt>Buildings</dt>
          <dd className="dashboard-detail-value">{renderSelectedValues(props.filters.buildingIds)}</dd>
        </div>
        <div>
          <dt>Floors</dt>
          <dd className="dashboard-detail-value">{renderSelectedValues(props.filters.floorIds)}</dd>
        </div>
        <div>
          <dt>Locations</dt>
          <dd className="dashboard-detail-value">{renderSelectedValues(props.filters.locationLabels)}</dd>
        </div>
        <div>
          <dt>Signage variants</dt>
          <dd className="dashboard-detail-value">{renderSelectedValues(props.filters.signageVariants)}</dd>
        </div>
        <div>
          <dt>Layout variants</dt>
          <dd className="dashboard-detail-value">{renderSelectedValues(props.filters.layoutVariants)}</dd>
        </div>
        <div>
          <dt>Time range</dt>
          <dd className="dashboard-detail-value">
            {props.filters.timeRange.label}: {props.filters.timeRange.start} to {props.filters.timeRange.end}
          </dd>
        </div>
        <div>
          <dt>Available facets</dt>
          <dd className="dashboard-detail-value">
            {props.availableFilters.buildings.length} buildings, {props.availableFilters.floors.length} floors, {props.availableFilters.locations.length} locations
          </dd>
        </div>
      </dl>
    </section>
  );
}