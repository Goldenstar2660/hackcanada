import type { Bucket } from "firebase-admin/storage";

import {
  DEFAULT_CAMERA_FRAME_STALE_AFTER_MS,
  LatestCameraFrameRecord,
  LatestCameraFrameStorage,
  LatestCameraFrameWriteRequest,
  createLatestFrameObjectPath,
  createLatestFramePublicUrl
} from "./latest-frame-storage.js";

export class FirebaseStorageLatestCameraFrameStorage implements LatestCameraFrameStorage {
  constructor(private readonly bucket: Bucket) {}

  async writeLatestFrame(request: LatestCameraFrameWriteRequest): Promise<LatestCameraFrameRecord> {
    const storageObjectPath = createLatestFrameObjectPath(request.stationId);
    const file = this.bucket.file(storageObjectPath);
    await file.save(request.frameDataBase64, {
      metadata: {
        contentType: request.contentType
      },
      resumable: false
    });

    return {
      stationId: request.stationId,
      storageObjectPath,
      contentType: request.contentType,
      lastUpdatedAt: request.capturedAt,
      frameDataBase64: request.frameDataBase64,
      publicUrl: file.publicUrl?.() ?? createLatestFramePublicUrl(storageObjectPath),
      active: request.active,
      staleAfterMs: request.staleAfterMs ?? DEFAULT_CAMERA_FRAME_STALE_AFTER_MS
    };
  }

  async clearLatestFrame(stationId: string): Promise<void> {
    const file = this.bucket.file(createLatestFrameObjectPath(stationId));
    await file.delete({ ignoreNotFound: true });
  }

  async getLatestFrame(_stationId: string): Promise<LatestCameraFrameRecord | null> {
    return null;
  }
}

export function createFirebaseStorageLatestCameraFrameStorage(bucket: Bucket): LatestCameraFrameStorage {
  return new FirebaseStorageLatestCameraFrameStorage(bucket);
}