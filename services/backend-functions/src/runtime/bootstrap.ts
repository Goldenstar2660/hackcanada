import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import type { DeviceCredentialRecord } from "../auth/device-auth.js";

import { createAnalyticsMaterializer } from "../analytics/materializers/daily-rollups.js";
import { createDashboardQueryService } from "../analytics/query-service.js";
import { createDeviceAuthenticator } from "../auth/device-auth.js";
import { createFirestorePhase2Repositories } from "../firestore/repositories/firestore.js";
import { createFirebaseStorageLatestCameraFrameStorage } from "../storage/firebase-storage.js";

export interface BackendRuntimeServices {
  readonly deviceAuthenticator: ReturnType<typeof createDeviceAuthenticator>;
  readonly disposalEventRepository: ReturnType<typeof createFirestorePhase2Repositories>["disposalEventRepository"];
  readonly liveStatusRepository: ReturnType<typeof createFirestorePhase2Repositories>["liveStatusRepository"];
  readonly stationRepository: ReturnType<typeof createFirestorePhase2Repositories>["stationRepository"];
  readonly analyticsRollupRepository: ReturnType<typeof createFirestorePhase2Repositories>["analyticsRollupRepository"];
  readonly latestCameraFrameStorage: ReturnType<typeof createFirebaseStorageLatestCameraFrameStorage>;
  readonly analyticsMaterializer: ReturnType<typeof createAnalyticsMaterializer>;
  readonly dashboardQueryService: ReturnType<typeof createDashboardQueryService>;
}

let cachedServices: BackendRuntimeServices | null = null;

function parseDeviceCredentialsFromEnvironment(): readonly DeviceCredentialRecord[] {
  const raw = process.env.BINBUDDY_DEVICE_CREDENTIALS_JSON;
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("BINBUDDY_DEVICE_CREDENTIALS_JSON must be a JSON array.");
  }

  return parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`Device credential at index ${index} must be an object.`);
    }

    const record = entry as Record<string, unknown>;
    if (typeof record.deviceId !== "string" || typeof record.stationId !== "string" || typeof record.sharedSecret !== "string") {
      throw new Error(`Device credential at index ${index} must include deviceId, stationId, and sharedSecret strings.`);
    }

    return {
      deviceId: record.deviceId,
      stationId: record.stationId,
      sharedSecret: record.sharedSecret,
      enabled: record.enabled === undefined ? true : record.enabled === true
    } satisfies DeviceCredentialRecord;
  });
}

export function createBackendRuntimeServices(): BackendRuntimeServices {
  const app = getApps()[0] ?? initializeApp();
  const firestore = getFirestore(app);
  const repositories = createFirestorePhase2Repositories(firestore);
  const storage = getStorage(app);
  const latestCameraFrameStorage = createFirebaseStorageLatestCameraFrameStorage(
    storage.bucket(process.env.BINBUDDY_STORAGE_BUCKET)
  );
  const analyticsMaterializer = createAnalyticsMaterializer({
    analyticsRollupRepository: repositories.analyticsRollupRepository,
    stationRepository: repositories.stationRepository
  });

  return {
    deviceAuthenticator: createDeviceAuthenticator({
      credentials: parseDeviceCredentialsFromEnvironment()
    }),
    disposalEventRepository: repositories.disposalEventRepository,
    liveStatusRepository: repositories.liveStatusRepository,
    stationRepository: repositories.stationRepository,
    analyticsRollupRepository: repositories.analyticsRollupRepository,
    latestCameraFrameStorage,
    analyticsMaterializer,
    dashboardQueryService: createDashboardQueryService({
      analyticsRollupRepository: repositories.analyticsRollupRepository,
      disposalEventRepository: repositories.disposalEventRepository,
      stationRepository: repositories.stationRepository
    })
  };
}

export function getBackendRuntimeServices(): BackendRuntimeServices {
  cachedServices ??= createBackendRuntimeServices();
  return cachedServices;
}