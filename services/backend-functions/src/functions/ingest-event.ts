import type { DeviceAuthenticator } from "../auth/device-auth.js";
import type { AnalyticsMaterializer } from "../analytics/materializers/index.js";
import type { DisposalEventRepository } from "../firestore/repositories/types.js";

import { normalizeDisposalEventEnvelope } from "../domain/contracts.js";
import { ValidationError, assertDeviceDisposalEventIngress } from "../domain/validation.js";
import { FunctionError, ensureHttpMethod, jsonResponse, readJsonBody, toErrorResponse } from "./runtime.js";

import type { HttpHandler } from "./runtime.js";

export interface IngestEventDependencies {
  readonly deviceAuthenticator: DeviceAuthenticator;
  readonly disposalEventRepository: DisposalEventRepository;
  readonly analyticsMaterializer?: AnalyticsMaterializer;
}

export function createDisposalEventId(stationId: string, timestamp: string, predictedItem: string): string {
  const normalizedItem = predictedItem.trim().toLowerCase().replace(/\s+/g, "-");
  return `${stationId}_${timestamp}_${normalizedItem}`;
}

export function createIngestEventHandler(dependencies: IngestEventDependencies): HttpHandler {
  return async (request) => {
    try {
      ensureHttpMethod(request, "POST");
      const identity = dependencies.deviceAuthenticator.authenticate(request);
      const body = readJsonBody<unknown>(request);
      assertDeviceDisposalEventIngress(body);

      if (body.station_id !== identity.stationId) {
        throw new FunctionError(403, "device-station-mismatch", "Authenticated device cannot write events for another station.");
      }

      const envelope = normalizeDisposalEventEnvelope(body);
      const eventId = createDisposalEventId(
        envelope.canonical.stationId,
        envelope.canonical.timestamp,
        envelope.canonical.predictedItem
      );
      const result = await dependencies.disposalEventRepository.saveEvent(eventId, envelope.canonical);

      if (result.status === "created") {
        await dependencies.analyticsMaterializer?.materializeEvent(result.record);
      }

      return jsonResponse(result.status === "created" ? 201 : 200, {
        eventId,
        writeStatus: result.status,
        stationId: envelope.canonical.stationId,
        timestamp: envelope.canonical.timestamp
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
