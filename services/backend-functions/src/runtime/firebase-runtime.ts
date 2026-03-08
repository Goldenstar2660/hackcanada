import { getFirestore } from "firebase-admin/firestore";

import { createAnalyticsInsightsGenerator } from "../ai/analytics-insights.js";
import { createGetAnalyticsSummaryHandler } from "../functions/get-analytics-summary.js";
import { createGetAnalyticsInsightsHandler } from "../functions/get-analytics-insights.js";
import { createGetEventHistoryHandler } from "../functions/get-event-history.js";
import { createGetStationDirectoryHandler } from "../functions/get-station-directory.js";
import { createIngestCameraFrameHandler } from "../functions/ingest-camera-frame.js";
import { createIngestEventHandler } from "../functions/ingest-event.js";
import { createIngestLiveStatusHandler } from "../functions/ingest-live-status.js";
import { getBackendRuntimeServices } from "./bootstrap.js";
import {
  analyticsMaterializationLedgerDocumentPath,
  createFirebaseCallableFunction,
  createFirebaseHttpFunction,
  createMaterializeAnalyticsOnDisposalEventTrigger
} from "./firebase-bridges.js";

const services = getBackendRuntimeServices();
const firestore = getFirestore();
const analyticsInsightsGenerator = createAnalyticsInsightsGenerator();

async function createMaterializationLedger(eventId: string): Promise<boolean> {
  try {
    await firestore.doc(analyticsMaterializationLedgerDocumentPath(eventId)).create({
      eventId,
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    if (error instanceof Error && (("code" in error && (error as { code?: unknown }).code === 6) || error.message.toLowerCase().includes("already exists"))) {
      return false;
    }

    throw error;
  }
}

export const ingestEvent = createFirebaseHttpFunction(
  createIngestEventHandler({
    deviceAuthenticator: services.deviceAuthenticator,
    disposalEventRepository: services.disposalEventRepository
  })
);

export const ingestLiveStatus = createFirebaseHttpFunction(
  createIngestLiveStatusHandler({
    deviceAuthenticator: services.deviceAuthenticator,
    liveStatusRepository: services.liveStatusRepository
  })
);

export const ingestCameraFrame = createFirebaseHttpFunction(
  createIngestCameraFrameHandler({
    deviceAuthenticator: services.deviceAuthenticator,
    latestCameraFrameStorage: services.latestCameraFrameStorage,
    liveStatusRepository: services.liveStatusRepository
  })
);

export const getAnalyticsSummary = createFirebaseCallableFunction(
  createGetAnalyticsSummaryHandler({
    queryService: services.dashboardQueryService
  })
);

export const getAnalyticsInsights = createFirebaseCallableFunction(
  createGetAnalyticsInsightsHandler({
    queryService: services.dashboardQueryService,
    insightsGenerator: analyticsInsightsGenerator
  })
);

export const getEventHistory = createFirebaseCallableFunction(
  createGetEventHistoryHandler({
    queryService: services.dashboardQueryService
  })
);

export const getStationDirectory = createFirebaseCallableFunction(
  createGetStationDirectoryHandler({
    queryService: services.dashboardQueryService
  })
);

export const materializeAnalyticsOnDisposalEvent = createMaterializeAnalyticsOnDisposalEventTrigger(
  services.analyticsMaterializer,
  createMaterializationLedger
);