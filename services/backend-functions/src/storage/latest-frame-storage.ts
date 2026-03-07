import type { CameraFeedMetadata } from "@binsight/contracts";

export const DEFAULT_CAMERA_FRAME_STALE_AFTER_MS = 30_000;
export const DEFAULT_CAMERA_FRAME_CONTENT_TYPE = "image/jpeg";

export interface LatestCameraFrameRecord {
  readonly stationId: string;
  readonly storageObjectPath: string;
  readonly contentType: string;
  readonly lastUpdatedAt: string;
  readonly frameDataBase64: string;
  readonly publicUrl: string;
  readonly active: boolean;
  readonly staleAfterMs: number;
}

export interface LatestCameraFrameWriteRequest {
  readonly stationId: string;
  readonly capturedAt: string;
  readonly contentType: string;
  readonly frameDataBase64: string;
  readonly active: boolean;
  readonly staleAfterMs?: number;
}

export interface LatestCameraFrameStorage {
  writeLatestFrame(request: LatestCameraFrameWriteRequest): Promise<LatestCameraFrameRecord>;
  clearLatestFrame(stationId: string): Promise<void>;
  getLatestFrame(stationId: string): Promise<LatestCameraFrameRecord | null>;
}

export function createLatestFrameObjectPath(stationId: string): string {
  return `stations/${stationId}/camera/latest.jpg`;
}

export function createLatestFramePublicUrl(storageObjectPath: string): string {
  return `storage://${storageObjectPath}`;
}

export function createCameraFeedMetadata(
  frame: LatestCameraFrameRecord | null,
  nowTimestamp: string = new Date().toISOString()
): CameraFeedMetadata {
  if (!frame) {
    return {
      status: "unavailable",
      storageObjectPath: null,
      contentType: null,
      lastUpdatedAt: null
    };
  }

  if (!frame.active) {
    return {
      status: "inactive",
      storageObjectPath: null,
      contentType: frame.contentType,
      lastUpdatedAt: frame.lastUpdatedAt
    };
  }

  const ageMs = Date.parse(nowTimestamp) - Date.parse(frame.lastUpdatedAt);
  return {
    status: ageMs > frame.staleAfterMs ? "stale" : "active",
    storageObjectPath: frame.storageObjectPath,
    contentType: frame.contentType,
    lastUpdatedAt: frame.lastUpdatedAt
  };
}

export function createInMemoryLatestCameraFrameStorage(
  seedFrames: readonly LatestCameraFrameRecord[] = []
): LatestCameraFrameStorage {
  const frames = new Map(seedFrames.map((frame) => [frame.stationId, frame]));

  return {
    async writeLatestFrame(request) {
      const storageObjectPath = createLatestFrameObjectPath(request.stationId);
      const record: LatestCameraFrameRecord = {
        stationId: request.stationId,
        storageObjectPath,
        contentType: request.contentType,
        lastUpdatedAt: request.capturedAt,
        frameDataBase64: request.frameDataBase64,
        publicUrl: createLatestFramePublicUrl(storageObjectPath),
        active: request.active,
        staleAfterMs: request.staleAfterMs ?? DEFAULT_CAMERA_FRAME_STALE_AFTER_MS
      };
      frames.set(request.stationId, record);
      return record;
    },

    async clearLatestFrame(stationId) {
      frames.delete(stationId);
    },

    async getLatestFrame(stationId) {
      return frames.get(stationId) ?? null;
    }
  };
}
