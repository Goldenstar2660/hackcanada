/**
 * This interface was referenced by `LiveStationStatus`'s JSON-Schema
 * via the `definition` "disposalMethod".
 */
export type DisposalMethod = ("recycle" | "compost" | "garbage")
/**
 * This interface was referenced by `LiveStationStatus`'s JSON-Schema
 * via the `definition` "disposalZone".
 */
export type DisposalZone = ("left" | "middle" | "right")
/**
 * This interface was referenced by `LiveStationStatus`'s JSON-Schema
 * via the `definition` "deviceStatus".
 */
export type DeviceStatus = ("online" | "offline" | "degraded")
/**
 * This interface was referenced by `LiveStationStatus`'s JSON-Schema
 * via the `definition` "sessionState".
 */
export type SessionState = ("idle" | "detecting-person" | "identifying-item" | "guiding-user" | "waiting-for-disposal" | "syncing" | "error")

/**
 * Canonical live station snapshot published by the Raspberry Pi so the dashboard can render current device health and in-session guidance state.
 */
export interface LiveStationStatus {
/**
 * Unique station identifier.
 */
stationId: string
/**
 * Time when this live snapshot was emitted.
 */
timestamp: string
/**
 * Current station runtime stage within the live control loop.
 */
sessionState: ("idle" | "detecting-person" | "identifying-item" | "guiding-user" | "waiting-for-disposal" | "syncing" | "error")
/**
 * Whether the station camera feed should be considered active for live monitoring.
 */
cameraFeedActive: boolean
/**
 * Latest in-session detected item label when available.
 */
currentDetectedItem?: (string | null)
/**
 * Current disposal guidance emitted to the user during an active session.
 */
currentDisposalMethod?: (DisposalMethod | null)
/**
 * Most recent tracked hand zone for the active disposal session.
 */
currentHandZone?: (DisposalZone | null)
/**
 * High-level health signals for the station runtime and connected hardware.
 */
deviceHealth: {
pi: DeviceStatus
esp8266: DeviceStatus
cloudSync: DeviceStatus
}
/**
 * Most recent disposal attempt emitted by this station, if one is available.
 */
latestEvent?: (LatestEvent | null)
}
/**
 * This interface was referenced by `LiveStationStatus`'s JSON-Schema
 * via the `definition` "latestEvent".
 */
export interface LatestEvent {
timestamp: string
predictedItem: string
correctDisposalMethod: DisposalMethod
actualDisposalZone: DisposalZone
attemptResult: ("success" | "failure")
}
