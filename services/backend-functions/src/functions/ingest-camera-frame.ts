import type { DeviceAuthenticator } from "../auth/device-auth.js";
import type { LiveStatusRepository } from "../firestore/repositories/types.js";
import type { LatestCameraFrameStorage } from "../storage/index.js";

import { ValidationError } from "../domain/validation.js";
import { createCameraFeedMetadata, DEFAULT_CAMERA_FRAME_CONTENT_TYPE } from "../storage/index.js";
import { FunctionError, ensureHttpMethod, jsonResponse, readJsonBody, toErrorResponse } from "./runtime.js";

import type { HttpHandler } from "./runtime.js";

export interface DeviceCameraFrameIngress {
  readonly station_id: string;
  readonly captured_at: string;
  readonly content_type?: string;
  readonly frame_data_base64: string;
  readonly camera_feed_active?: boolean;
  readonly stale_after_ms?: number;
}

export interface IngestCameraFrameDependencies {
  readonly deviceAuthenticator: DeviceAuthenticator;
  readonly latestCameraFrameStorage: LatestCameraFrameStorage;
  readonly liveStatusRepository: LiveStatusRepository;
}

function assertDeviceCameraFrameIngress(value: unknown): asserts value is DeviceCameraFrameIngress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Validation failed at deviceCameraFrameIngress", ["deviceCameraFrameIngress: expected object"]);
  }

  const record = value as Record<string, unknown>;
  if (typeof record.station_id !== "string" || record.station_id.length === 0) {
    throw new ValidationError("Validation failed at deviceCameraFrameIngress.station_id", ["deviceCameraFrameIngress.station_id: expected non-empty string"]);
  }
  if (typeof record.captured_at !== "string" || Number.isNaN(Date.parse(record.captured_at))) {
    throw new ValidationError("Validation failed at deviceCameraFrameIngress.captured_at", ["deviceCameraFrameIngress.captured_at: expected ISO date-time string"]);
  }
  if (typeof record.frame_data_base64 !== "string" || record.frame_data_base64.length === 0) {
    throw new ValidationError("Validation failed at deviceCameraFrameIngress.frame_data_base64", ["deviceCameraFrameIngress.frame_data_base64: expected non-empty string"]);
  }
  if (record.content_type !== undefined && typeof record.content_type !== "string") {
    throw new ValidationError("Validation failed at deviceCameraFrameIngress.content_type", ["deviceCameraFrameIngress.content_type: expected string"]);
  }
  if (record.camera_feed_active !== undefined && typeof record.camera_feed_active !== "boolean") {
    throw new ValidationError("Validation failed at deviceCameraFrameIngress.camera_feed_active", ["deviceCameraFrameIngress.camera_feed_active: expected boolean"]);
  }
  const staleAfterMs = record.stale_after_ms;
  if (
    staleAfterMs !== undefined
    && (typeof staleAfterMs !== "number" || !Number.isInteger(staleAfterMs) || staleAfterMs <= 0)
  ) {
    throw new ValidationError("Validation failed at deviceCameraFrameIngress.stale_after_ms", ["deviceCameraFrameIngress.stale_after_ms: expected positive integer"]);
  }
}

export function createIngestCameraFrameHandler(
  dependencies: IngestCameraFrameDependencies
): HttpHandler {
  return async (request) => {
    try {
      ensureHttpMethod(request, "POST");
      const identity = dependencies.deviceAuthenticator.authenticate(request);
      const body = readJsonBody<unknown>(request);
      assertDeviceCameraFrameIngress(body);

      if (body.station_id !== identity.stationId) {
        throw new FunctionError(403, "device-station-mismatch", "Authenticated device cannot write camera frames for another station.");
      }

      const cameraFeedActive = body.camera_feed_active ?? true;
      if (!cameraFeedActive) {
        await dependencies.latestCameraFrameStorage.clearLatestFrame(body.station_id);
        await dependencies.liveStatusRepository.patchCameraFeed(
          body.station_id,
          {
            status: "inactive",
            storageObjectPath: null,
            contentType: body.content_type ?? DEFAULT_CAMERA_FRAME_CONTENT_TYPE,
            lastUpdatedAt: body.captured_at
          },
          body.captured_at,
          false
        );

        return jsonResponse(200, {
          stationId: body.station_id,
          cameraFeedStatus: "inactive",
          storageObjectPath: null,
          lastUpdatedAt: body.captured_at
        });
      }

      const storedFrame = await dependencies.latestCameraFrameStorage.writeLatestFrame({
        stationId: body.station_id,
        capturedAt: body.captured_at,
        contentType: body.content_type ?? DEFAULT_CAMERA_FRAME_CONTENT_TYPE,
        frameDataBase64: body.frame_data_base64,
        active: true,
        staleAfterMs: body.stale_after_ms
      });

      const metadata = createCameraFeedMetadata(storedFrame, body.captured_at);
      await dependencies.liveStatusRepository.patchCameraFeed(body.station_id, metadata, body.captured_at, true);

      return jsonResponse(201, {
        stationId: body.station_id,
        cameraFeedStatus: metadata.status,
        storageObjectPath: metadata.storageObjectPath,
        lastUpdatedAt: metadata.lastUpdatedAt
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return jsonResponse(400, {
          error: {
            code: "validation",
            message: error.message,
            details: error.issues
          }
        });
      }

      return toErrorResponse(error);
    }
  };
}
