import type {
  AttemptResult,
  CameraFeedMetadata,
  DeviceDisposalEventIngress,
  DeviceHealth,
  DeviceLatestEventIngress,
  DeviceLiveStatusIngress,
  DevicePayloadVersion,
  DeviceSessionPhase,
  DisposalEvent,
  LiveStationStatus
} from "@binsight/contracts";

export const DEFAULT_DEVICE_HEALTH: DeviceHealth = {
  pi: "online",
  esp8266: "online",
  cloudSync: "online"
};

export const DEFAULT_DEVICE_PAYLOAD_VERSION: DevicePayloadVersion = "device.v1";

export const DEVICE_PHASE_TO_SESSION_STATE: Record<DeviceSessionPhase, LiveStationStatus["sessionState"]> = {
  idle: "idle",
  detecting: "detecting-person",
  guiding: "guiding-user",
  waiting_for_disposal: "waiting-for-disposal",
  complete: "syncing"
};

export interface NormalizedIngressDocument<TIngress, TCanonical> {
  readonly ingress: TIngress;
  readonly canonical: TCanonical;
  readonly payloadVersion: DevicePayloadVersion;
}

export function resolveDevicePayloadVersion(
  payloadVersion?: DevicePayloadVersion | null
): DevicePayloadVersion {
  return payloadVersion ?? DEFAULT_DEVICE_PAYLOAD_VERSION;
}

export function attemptResultFromSuccess(success: boolean): AttemptResult {
  return success ? "success" : "failure";
}

export function normalizeLatestEvent(ingress: DeviceLatestEventIngress) {
  return {
    timestamp: ingress.timestamp,
    predictedItem: ingress.predicted_item,
    correctDisposalMethod: ingress.correct_disposal_method,
    actualDisposalZone: ingress.actual_disposal_zone,
    attemptResult: attemptResultFromSuccess(ingress.success)
  } as const;
}

export function normalizeDeviceDisposalEvent(ingress: DeviceDisposalEventIngress): DisposalEvent {
  return {
    stationId: ingress.station_id,
    timestamp: ingress.timestamp,
    predictedItem: ingress.predicted_item,
    correctDisposalMethod: ingress.correct_disposal_method,
    actualDisposalZone: ingress.actual_disposal_zone,
    attemptResult: attemptResultFromSuccess(ingress.success),
    modelConfidence: ingress.model_confidence,
    llmFallbackUsed: ingress.llm_fallback_used
  };
}

export function normalizeDisposalEventEnvelope(
  ingress: DeviceDisposalEventIngress
): NormalizedIngressDocument<DeviceDisposalEventIngress, DisposalEvent> {
  return {
    ingress,
    canonical: normalizeDeviceDisposalEvent(ingress),
    payloadVersion: resolveDevicePayloadVersion(ingress.payload_version)
  };
}

export function normalizeDeviceHealth(deviceHealth?: Partial<DeviceHealth>): DeviceHealth {
  return {
    pi: deviceHealth?.pi ?? DEFAULT_DEVICE_HEALTH.pi,
    esp8266: deviceHealth?.esp8266 ?? DEFAULT_DEVICE_HEALTH.esp8266,
    cloudSync: deviceHealth?.cloudSync ?? DEFAULT_DEVICE_HEALTH.cloudSync
  };
}

export function normalizeCameraFeed(
  ingress: DeviceLiveStatusIngress,
  timestamp: string,
  cameraFeedActive: boolean
): CameraFeedMetadata | null {
  const cameraFeed = ingress.camera_feed;
  if (!cameraFeed && !cameraFeedActive) {
    return null;
  }

  return {
    status: cameraFeed?.status ?? (cameraFeedActive ? "active" : "inactive"),
    storageObjectPath: cameraFeed?.storage_object_path ?? null,
    contentType: cameraFeed?.content_type ?? null,
    lastUpdatedAt: cameraFeed?.last_updated_at ?? (cameraFeedActive ? timestamp : null)
  };
}

export function normalizeDeviceLiveStatus(ingress: DeviceLiveStatusIngress): LiveStationStatus {
  const timestamp = ingress.timestamp ?? new Date().toISOString();
  const cameraFeedActive = ingress.camera_feed_active ?? ingress.phase !== "idle";

  return {
    stationId: ingress.station_id,
    timestamp,
    sessionState: DEVICE_PHASE_TO_SESSION_STATE[ingress.phase],
    cameraFeedActive,
    currentDetectedItem: ingress.predicted_item,
    currentDisposalMethod: ingress.disposal_method,
    currentHandZone: ingress.current_hand_zone ?? null,
    deviceHealth: normalizeDeviceHealth(ingress.device_health),
    latestEvent: ingress.latest_event ? normalizeLatestEvent(ingress.latest_event) : null,
    cameraFeed: normalizeCameraFeed(ingress, timestamp, cameraFeedActive)
  };
}

export function normalizeLiveStatusEnvelope(
  ingress: DeviceLiveStatusIngress
): NormalizedIngressDocument<DeviceLiveStatusIngress, LiveStationStatus> {
  return {
    ingress,
    canonical: normalizeDeviceLiveStatus(ingress),
    payloadVersion: resolveDevicePayloadVersion(ingress.payload_version)
  };
}