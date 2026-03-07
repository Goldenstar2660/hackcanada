import type { LiveStationStatus } from "@binsight/contracts";

import type { LiveStatusClient } from "./live-status.js";

export const DEFAULT_INITIAL_LIVE_SNAPSHOT_TIMEOUT_MS = 1_500;
export const DEFAULT_STALE_LIVE_STATUS_AFTER_MS = 60_000;

export interface LiveStationSnapshot {
  readonly stationId: string;
  readonly status: LiveStationStatus | null;
  readonly sessionActive: boolean;
  readonly statusTimestamp: string | null;
  readonly statusAgeMs: number | null;
  readonly stale: boolean;
}

export interface LiveMonitoringGateway {
  createSnapshot(stationId: string, status: LiveStationStatus | null): Promise<LiveStationSnapshot>;
  loadInitialSnapshot(stationId: string, timeoutMs?: number): Promise<LiveStationSnapshot>;
  subscribeToStation(
    stationId: string,
    onSnapshot: (snapshot: LiveStationSnapshot) => void,
    onError?: (error: unknown) => void
  ): () => void;
}

export function createUnavailableSnapshot(
  stationId: string,
  _staleAfterMs: number = DEFAULT_STALE_LIVE_STATUS_AFTER_MS
): LiveStationSnapshot {
  return {
    stationId,
    status: null,
    sessionActive: false,
    statusTimestamp: null,
    statusAgeMs: null,
    stale: false
  };
}

export function createLiveMonitoringGateway(
  client: LiveStatusClient,
  now: () => Date = () => new Date(),
  staleAfterMs: number = DEFAULT_STALE_LIVE_STATUS_AFTER_MS
): LiveMonitoringGateway {
  async function createSnapshot(stationId: string, status: LiveStationStatus | null): Promise<LiveStationSnapshot> {
    if (!status) {
      return createUnavailableSnapshot(stationId, staleAfterMs);
    }

    const currentTime = now();
    const statusTimestamp = typeof status.timestamp === "string" ? status.timestamp : null;
    const parsedTimestamp = statusTimestamp ? new Date(statusTimestamp) : null;
    const statusAgeMs = parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime())
      ? Math.max(currentTime.getTime() - parsedTimestamp.getTime(), 0)
      : null;

    return {
      stationId,
      status,
      sessionActive: status.sessionState !== "idle" && status.sessionState !== "error",
      statusTimestamp,
      statusAgeMs,
      stale: statusAgeMs !== null && statusAgeMs > staleAfterMs
    };
  }

  return {
    createSnapshot,

    loadInitialSnapshot(stationId, timeoutMs = DEFAULT_INITIAL_LIVE_SNAPSHOT_TIMEOUT_MS) {
      return new Promise<LiveStationSnapshot>((resolve, reject) => {
        let settled = false;
        let subscriptionReady = false;
        let shouldUnsubscribe = false;
        let unsubscribe: () => void = () => undefined;

        const finalize = () => {
          if (!subscriptionReady) {
            shouldUnsubscribe = true;
            return;
          }

          unsubscribe();
        };

        const resolveOnce = (snapshot: LiveStationSnapshot) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timeoutHandle);
          finalize();
          resolve(snapshot);
        };

        const rejectOnce = (error: unknown) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timeoutHandle);
          finalize();
          reject(error);
        };

        const timeoutHandle = setTimeout(() => {
          void createSnapshot(stationId, null).then(resolveOnce).catch(rejectOnce);
        }, timeoutMs);

        try {
          unsubscribe = client.subscribeToStation(
            stationId,
            (status) => {
              void createSnapshot(stationId, status).then(resolveOnce).catch(rejectOnce);
            },
            rejectOnce
          );
          subscriptionReady = true;
          if (shouldUnsubscribe) {
            unsubscribe();
          }
        } catch (error) {
          rejectOnce(error);
        }
      });
    },

    subscribeToStation(stationId, onSnapshot, onError) {
      return client.subscribeToStation(
        stationId,
        (status) => {
          void createSnapshot(stationId, status)
            .then(onSnapshot)
            .catch((error) => {
              if (onError) {
                onError(error);
              }
            });
        },
        onError
      );
    }
  };
}