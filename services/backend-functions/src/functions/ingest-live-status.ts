import type { DeviceAuthenticator } from "../auth/device-auth.js";
import type { LiveStatusRepository } from "../firestore/repositories/types.js";

import { normalizeLiveStatusEnvelope } from "../domain/contracts.js";
import { ValidationError, assertDeviceLiveStatusIngress } from "../domain/validation.js";
import { FunctionError, ensureHttpMethod, jsonResponse, readJsonBody, toErrorResponse } from "./runtime.js";

import type { HttpHandler } from "./runtime.js";

export interface IngestLiveStatusDependencies {
  readonly deviceAuthenticator: DeviceAuthenticator;
  readonly liveStatusRepository: LiveStatusRepository;
}

export function createIngestLiveStatusHandler(dependencies: IngestLiveStatusDependencies): HttpHandler {
  return async (request) => {
    try {
      ensureHttpMethod(request, "POST");
      const identity = dependencies.deviceAuthenticator.authenticate(request);
      const body = readJsonBody<unknown>(request);
      assertDeviceLiveStatusIngress(body);

      if (body.station_id !== identity.stationId) {
        throw new FunctionError(403, "device-station-mismatch", "Authenticated device cannot write live status for another station.");
      }

      const envelope = normalizeLiveStatusEnvelope(body);
      const result = await dependencies.liveStatusRepository.upsertStatus(envelope.canonical);

      return jsonResponse(result.status === "created" ? 201 : 200, {
        stationId: envelope.canonical.stationId,
        writeStatus: result.status,
        timestamp: result.statusDocument.timestamp,
        cameraFeedActive: result.statusDocument.cameraFeedActive
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
