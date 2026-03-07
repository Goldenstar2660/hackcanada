import type { CameraFeedStatus, LiveStationStatus } from "@binbuddy/contracts";

import type { LiveStatusClient } from "./live-status.js";

export const DEFAULT_CAMERA_FEED_STALE_AFTER_MS = 60_000;

export interface CameraFrameResolver {
  resolveLatestFrameUrl(storageObjectPath: string): Promise<string>;
}

export interface LiveCameraFeedView {
  readonly status: CameraFeedStatus;
  readonly imageUrl: string | null;
  readonly lastUpdatedAt: string | null;
  readonly message: string;
  readonly staleAfterMs: number;
}

export interface LiveStationSnapshot {
  readonly stationId: string;
  readonly status: LiveStationStatus | null;
  readonly sessionActive: boolean;
  readonly cameraFeed: LiveCameraFeedView;
}

export interface LiveMonitoringGateway {
  createSnapshot(stationId: string, status: LiveStationStatus | null): Promise<LiveStationSnapshot>;
  subscribeToStation(
    stationId: string,
    onSnapshot: (snapshot: LiveStationSnapshot) => void,
    onError?: (error: unknown) => void
  ): () => void;
}

function createFeedMessage(status: CameraFeedStatus, lastUpdatedAt: string | null): string {
  switch (status) {
    case "active":
      return lastUpdatedAt
        ? `Latest frame received at ${lastUpdatedAt}.`
        : "Live frame updates are active.";
    case "inactive":
      return "Station is idle, so the camera feed is intentionally paused.";
    case "stale":
      return "Camera updates have stopped and the current frame should be treated as stale.";
    case "unavailable":
    default:
      return "No camera frame is available for this station yet.";
  }
}

export function deriveCameraFeedStatus(
  status: LiveStationStatus | null,
  now: Date,
  staleAfterMs: number = DEFAULT_CAMERA_FEED_STALE_AFTER_MS
): CameraFeedStatus {
  const metadata = status?.cameraFeed;

  if (!status || !metadata) {
    return "unavailable";
  }

  if (!status.cameraFeedActive) {
    return "inactive";
  }

  const explicitStatus = metadata.status;
  if (explicitStatus === "inactive" || explicitStatus === "unavailable") {
    return explicitStatus;
  }

  if (!metadata.lastUpdatedAt) {
    return status.cameraFeedActive ? "stale" : "inactive";
  }

  const age = now.getTime() - new Date(metadata.lastUpdatedAt).getTime();
  return age > staleAfterMs ? "stale" : "active";
}

export function createUnavailableSnapshot(
  stationId: string,
  staleAfterMs: number = DEFAULT_CAMERA_FEED_STALE_AFTER_MS
): LiveStationSnapshot {
  return {
    stationId,
    status: null,
    sessionActive: false,
    cameraFeed: {
      status: "unavailable",
      imageUrl: null,
      lastUpdatedAt: null,
      message: createFeedMessage("unavailable", null),
      staleAfterMs
    }
  };
}

export function createLiveMonitoringGateway(
  client: LiveStatusClient,
  frameResolver: CameraFrameResolver,
  now: () => Date = () => new Date(),
  staleAfterMs: number = DEFAULT_CAMERA_FEED_STALE_AFTER_MS
): LiveMonitoringGateway {
  async function createSnapshot(stationId: string, status: LiveStationStatus | null): Promise<LiveStationSnapshot> {
    if (!status) {
      return createUnavailableSnapshot(stationId, staleAfterMs);
    }

    const derivedStatus = deriveCameraFeedStatus(status, now(), staleAfterMs);
    const storageObjectPath = status.cameraFeed?.storageObjectPath ?? null;
    const imageUrl = storageObjectPath && derivedStatus === "active"
      ? await frameResolver.resolveLatestFrameUrl(storageObjectPath)
      : null;

    return {
      stationId,
      status,
      sessionActive: status.sessionState !== "idle" && status.sessionState !== "error",
      cameraFeed: {
        status: derivedStatus,
        imageUrl,
        lastUpdatedAt: status.cameraFeed?.lastUpdatedAt ?? null,
        message: createFeedMessage(derivedStatus, status.cameraFeed?.lastUpdatedAt ?? null),
        staleAfterMs
      }
    };
  }

  return {
    createSnapshot,

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