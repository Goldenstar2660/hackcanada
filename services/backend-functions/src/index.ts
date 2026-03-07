export const backendSurface = {
  name: "backend-functions",
  purpose: "firebase-backed ingestion and analytics services"
} as const;

export * from "./auth/device-auth.js";
export * from "./auth/operator-auth.js";
export * from "./functions/runtime.js";
export * from "./functions/ingest-event.js";
export * from "./functions/ingest-live-status.js";
export * from "./functions/ingest-camera-frame.js";
export * from "./functions/get-analytics-summary.js";
export * from "./functions/get-event-history.js";
export * from "./functions/get-station-directory.js";
export * from "./firestore/repositories/index.js";
export * from "./storage/index.js";
export * from "./analytics/mappers/index.js";
export * from "./analytics/materializers/index.js";
export * from "./analytics/query-service.js";
export * from "./domain/contracts.js";
export * from "./domain/validation.js";
export * from "./firestore/collections.js";
export * from "./firestore/converters.js";