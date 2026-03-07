import type { HttpRequest } from "../functions/runtime.js";

import { FunctionError } from "../functions/runtime.js";

export interface DeviceCredentialRecord {
  readonly deviceId: string;
  readonly stationId: string;
  readonly sharedSecret: string;
  readonly enabled?: boolean;
}

export interface DeviceIdentity {
  readonly deviceId: string;
  readonly stationId: string;
  readonly authenticatedAt: string;
}

export interface DeviceAuthenticator {
  authenticate(request: HttpRequest): DeviceIdentity;
}

export interface DeviceAuthenticatorOptions {
  readonly credentials: readonly DeviceCredentialRecord[];
  readonly allowedClockSkewMs?: number;
  readonly now?: () => string;
}

const DEVICE_ID_HEADER = "x-binsight-device-id";
const DEVICE_STATION_HEADER = "x-binsight-station-id";
const DEVICE_TIMESTAMP_HEADER = "x-binsight-timestamp";
const DEVICE_SIGNATURE_HEADER = "x-binsight-signature";

function getHeader(request: HttpRequest, name: string): string | undefined {
  const headers = request.headers ?? {};

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() === name) {
      return headerValue;
    }
  }

  return undefined;
}

function constantTimeEquals(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    mismatch |= leftCode ^ rightCode;
  }

  return mismatch === 0;
}

export function buildDeviceSignature(deviceId: string, stationId: string, timestamp: string, sharedSecret: string): string {
  return `binsight-v1:${deviceId}:${stationId}:${timestamp}:${sharedSecret}`;
}

export function createDeviceAuthenticator(options: DeviceAuthenticatorOptions): DeviceAuthenticator {
  const allowedClockSkewMs = options.allowedClockSkewMs ?? 60_000;
  const now = options.now ?? (() => new Date().toISOString());

  return {
    authenticate(request) {
      const deviceId = getHeader(request, DEVICE_ID_HEADER);
      const stationId = getHeader(request, DEVICE_STATION_HEADER);
      const timestamp = getHeader(request, DEVICE_TIMESTAMP_HEADER);
      const signature = getHeader(request, DEVICE_SIGNATURE_HEADER);

      if (!deviceId || !stationId || !timestamp || !signature) {
        throw new FunctionError(401, "device-auth-missing", "Missing required device authentication headers.");
      }

      const credential = options.credentials.find(
        (candidate) => candidate.enabled !== false && candidate.deviceId === deviceId && candidate.stationId === stationId
      );

      if (!credential) {
        throw new FunctionError(403, "device-auth-unknown", "Unknown or disabled device credentials.");
      }

      const nowDate = Date.parse(now());
      const requestDate = Date.parse(timestamp);
      if (Number.isNaN(requestDate)) {
        throw new FunctionError(400, "device-auth-timestamp", "Invalid device authentication timestamp.");
      }

      if (Math.abs(nowDate - requestDate) > allowedClockSkewMs) {
        throw new FunctionError(401, "device-auth-expired", "Device authentication timestamp is outside the allowed skew window.");
      }

      const expectedSignature = buildDeviceSignature(deviceId, stationId, timestamp, credential.sharedSecret);
      if (!constantTimeEquals(signature, expectedSignature)) {
        throw new FunctionError(403, "device-auth-signature", "Device signature verification failed.");
      }

      return {
        deviceId,
        stationId,
        authenticatedAt: now()
      };
    }
  };
}
