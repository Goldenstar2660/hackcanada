import type { DashboardPageLoadContext } from "../app/types.js";
import type { LiveStationSnapshot } from "../lib/firebase/live-monitoring.js";

import { useEffect, useState } from "react";

import { FilterControls } from "../features/filters/filter-controls.js";
import { LiveStationPanel } from "../features/live/live-station-panel.js";
import { createUnavailableSnapshot } from "../lib/firebase/live-monitoring.js";

export interface LiveMonitoringRealtimeBinding {
  readonly stationId: string;
  subscribe(
    onSnapshot: (snapshot: LiveStationSnapshot) => void,
    onError?: (error: unknown) => void
  ): () => void;
}

export interface LiveMonitoringPageModel {
  readonly station: Awaited<ReturnType<typeof loadLiveMonitoringPage>>["station"];
  readonly snapshot: Awaited<ReturnType<typeof loadLiveMonitoringPage>>["snapshot"];
  readonly availableFilters: Awaited<ReturnType<typeof loadLiveMonitoringPage>>["availableFilters"];
  readonly availableStations: Awaited<ReturnType<typeof loadLiveMonitoringPage>>["availableStations"];
  readonly realtime: LiveMonitoringRealtimeBinding | null;
}

export function createLiveMonitoringRealtimeBinding(
  live: DashboardPageLoadContext["providers"]["live"],
  stationId: string
): LiveMonitoringRealtimeBinding {
  return {
    stationId,
    subscribe(onSnapshot, onError) {
      return live.subscribeToStation(stationId, onSnapshot, onError);
    }
  };
}

export async function loadLiveMonitoringPage(context: DashboardPageLoadContext): Promise<{
  station: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"][number] | null;
  snapshot: Awaited<ReturnType<typeof context.providers.live.createSnapshot>>;
  availableFilters: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["filters"];
  availableStations: Awaited<ReturnType<typeof context.providers.api.getStationDirectory>>["stations"];
  realtime: LiveMonitoringRealtimeBinding | null;
}> {
  const stationId = context.match.params.stationId;
  const directory = await context.providers.api.getStationDirectory();
  const station = directory.stations.find((entry) => entry.stationId === stationId) ?? null;
  const realtime = station ? createLiveMonitoringRealtimeBinding(context.providers.live, station.stationId) : null;
  const snapshot = createUnavailableSnapshot(stationId);

  return {
    station,
    snapshot,
    availableFilters: directory.filters,
    availableStations: directory.stations,
    realtime
  };
}

export function LiveMonitoringPage(props: {
  readonly model: LiveMonitoringPageModel;
  readonly context: DashboardPageLoadContext;
}): JSX.Element {
  const [snapshot, setSnapshot] = useState(props.model.snapshot);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  useEffect(() => {
    setSnapshot(props.model.snapshot);
    setSubscriptionError(null);
  }, [props.model.snapshot]);

  useEffect(() => {
    if (!props.model.realtime) {
      return undefined;
    }

    const unsubscribe = props.model.realtime.subscribe(
      (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setSubscriptionError(null);
      },
      (error) => {
        const message = error instanceof Error ? error.message : "Live status subscription failed.";
        setSubscriptionError(message);
      }
    );

    return unsubscribe;
  }, [props.model.realtime]);

  return (
    <section>
      <FilterControls
        actionPath={props.context.match.path}
        filters={props.context.filters}
        availableFilters={props.model.availableFilters}
        availableStations={props.model.availableStations}
        stationCount={1}
      />
      <article className="dashboard-card">
        <h2 className="dashboard-card-title">Live presentation state</h2>
        <p className="dashboard-subtitle">
          This view stays text-first for the demo. Camera capture, storage, and rendering remain outside this phase.
        </p>
        {subscriptionError ? <p className="dashboard-status dashboard-status--warning">Live subscription issue: {subscriptionError}</p> : null}
        {!props.model.station ? <p className="dashboard-status dashboard-status--empty">No station directory entry matched this route.</p> : null}
        {props.model.station && !snapshot.status ? (
          <p className="dashboard-status dashboard-status--empty">No live status document has arrived for this station yet.</p>
        ) : null}
        {snapshot.stale ? (
          <p className="dashboard-status dashboard-status--warning">
            Live status is stale. The latest station update is older than one minute.
          </p>
        ) : null}
      </article>
      <LiveStationPanel station={props.model.station} snapshot={snapshot} realtimeEnabled={props.model.realtime !== null} />
    </section>
  );
}