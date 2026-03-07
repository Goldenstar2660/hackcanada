import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { CallableRequest, HttpsFunction, Request, Response } from "firebase-functions/v2/https";

import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import type { AnalyticsMaterializer } from "../analytics/materializers/daily-rollups.js";
import type { DisposalEvent } from "@binbuddy/contracts";
import type { CallableHandler, HttpHandler } from "../functions/runtime.js";

import { analyticsMaterializationLedgerDocumentPath, FIRESTORE_COLLECTIONS } from "../firestore/collections.js";
import { toErrorResponse, FunctionError } from "../functions/runtime.js";

function normalizeHeaders(headers: Request["headers"]): Readonly<Record<string, string | undefined>> {
  const normalized: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(headers)) {
    const normalizedValue = Array.isArray(value) ? value.join(",") : value;
    normalized[name] = typeof normalizedValue === "string" ? normalizedValue : undefined;
  }

  return normalized;
}

function mapFunctionErrorCode(error: FunctionError): string {
  if (error.status === 400) {
    return "invalid-argument";
  }
  if (error.status === 401) {
    return "unauthenticated";
  }
  if (error.status === 403) {
    return "permission-denied";
  }
  if (error.status === 404) {
    return "not-found";
  }
  if (error.status === 409) {
    return "already-exists";
  }

  return "internal";
}

function toHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }

  if (error instanceof FunctionError) {
    return new HttpsError(mapFunctionErrorCode(error), error.message, error.details);
  }

  if (error instanceof Error) {
    return new HttpsError("internal", error.message);
  }

  return new HttpsError("internal", "Unknown error.");
}

export function createFirebaseHttpFunction(handler: HttpHandler): HttpsFunction {
  return onRequest(async (request: Request, response: Response) => {
    const result = await handler({
      method: request.method,
      headers: normalizeHeaders(request.headers),
      body: request.body
    }).catch((error: unknown) => toErrorResponse(error));

    for (const [headerName, headerValue] of Object.entries(result.headers ?? {})) {
      response.set(headerName, headerValue);
    }

    response.status(result.status);
    response.json(result.body);
  });
}

export function createFirebaseCallableFunction<TRequest, TResponse>(
  handler: CallableHandler<TRequest, TResponse>
) {
  return onCall<TRequest, TResponse>(async (request: CallableRequest<TRequest>) => {
    try {
      return await handler(request.data, {
        auth: request.auth
          ? {
              uid: request.auth.uid,
              email: typeof request.auth.token?.email === "string" ? request.auth.token.email : null,
              token: request.auth.token
            }
          : null
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  });
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    ("code" in error && (error as { code?: unknown }).code === 6)
    || error.message.toLowerCase().includes("already exists")
  );
}

export function createMaterializeAnalyticsOnDisposalEventTrigger(
  analyticsMaterializer: AnalyticsMaterializer,
  createLedger: (eventId: string) => Promise<boolean>
) {
  return onDocumentCreated<{ eventId: string }>(
    `${FIRESTORE_COLLECTIONS.disposalEvents}/{eventId}`,
    async (event) => {
      if (!event.data) {
        return;
      }

      const eventId = event.params.eventId;
      const shouldProcess = await createLedger(eventId);
      if (!shouldProcess) {
        return;
      }

      const snapshot = event.data as unknown as QueryDocumentSnapshot<DisposalEvent>;
      await analyticsMaterializer.materializeEvent({
        eventId,
        event: snapshot.data(),
        writtenAt: new Date().toISOString()
      });
    }
  );
}

export { analyticsMaterializationLedgerDocumentPath };