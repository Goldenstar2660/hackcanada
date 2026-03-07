import type { StationRecord } from "@binsight/contracts";

import type { DashboardPageLoadContext } from "../app/types.js";

import { FilterControls } from "../features/filters/filter-controls.js";

export interface StationDetailPageModel {
  readonly station: StationRecord | null;
  readonly siblingStations: readonly StationRecord[];
  readonly availableFilters: Awaited<ReturnType<typeof loadStationDetailPage>>["availableFilters"];
  readonly availableStations: readonly StationRecord[];
}

export async function loadStationDetailPage(context: DashboardPageLoadContext): Promise<{
  station: StationRecord | null;
  siblingStations: readonly StationRecord[];
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: readonly StationRecord[];
}> {
  const directory = await context.providers.api.getStationDirectory();
  const stationId = context.match.params.stationId;
  const station = directory.stations.find((entry) => entry.stationId === stationId) ?? null;
  const siblingStations = station
    ? directory.stations.filter((entry) => entry.floorId === station.floorId && entry.stationId !== station.stationId)
    : [];

  return {
    station,
    siblingStations,
    availableFilters: directory.filters,
    availableStations: directory.stations
  };
}

export function StationDetailPage(props: {
  readonly model: StationDetailPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  return (
    <section className="dashboard-section-stack">
      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        availableStations={props.model.availableStations}
        stationCount={1}
      />

      <article className="dashboard-card">
        <div className="dashboard-row">
          <div>
            <h2 className="dashboard-card-title">{props.model.station?.stationName ?? "Station not found"}</h2>
            <p className="dashboard-subtitle">
              {props.model.station
                ? `${props.model.station.buildingLabel}, ${props.model.station.floorLabel}, ${props.model.station.locationLabel}`
                : "Requested station ID is not present in the current directory."}
            </p>
          </div>
          {props.model.station ? (
            <a href={`/stations/${props.model.station.stationId}/live`} className="dashboard-link">
              Open live monitoring
            </a>
          ) : null}
        </div>

        {props.model.station ? (
          <dl className="dashboard-detail-list">
            <div>
              <dt>Active rules preset</dt>
              <dd className="dashboard-detail-value">
                {props.model.station.activeRulesPreset.presetId} v{props.model.station.activeRulesPreset.version}
              </dd>
            </div>
            <div>
              <dt>Jurisdiction</dt>
              <dd className="dashboard-detail-value">
                {props.model.station.activeRulesPreset.jurisdiction.city}, {props.model.station.activeRulesPreset.jurisdiction.provinceOrState}
              </dd>
            </div>
            <div>
              <dt>Variants</dt>
              <dd className="dashboard-detail-value">
                Signage {props.model.station.signageVariant}, layout {props.model.station.layoutVariant}
              </dd>
            </div>
          </dl>
        ) : null}
      </article>

      <article className="dashboard-card">
        <h3 className="dashboard-card-title">Nearby comparison set</h3>
        <ul className="dashboard-list">
          {props.model.siblingStations.map((station) => (
            <li key={station.stationId}>
              <a href={`/stations/${station.stationId}`} className="dashboard-link">
                {station.stationName}
              </a>{" "}
              ({station.locationLabel}, signage {station.signageVariant}, layout {station.layoutVariant})
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}