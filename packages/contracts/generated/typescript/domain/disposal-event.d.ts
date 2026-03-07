/**
 * This interface was referenced by `DisposalEvent`'s JSON-Schema
 * via the `definition` "disposalMethod".
 */
export type DisposalMethod = ("recycle" | "compost" | "garbage")
/**
 * This interface was referenced by `DisposalEvent`'s JSON-Schema
 * via the `definition` "disposalZone".
 */
export type DisposalZone = ("left" | "middle" | "right")
/**
 * This interface was referenced by `DisposalEvent`'s JSON-Schema
 * via the `definition` "attemptResult".
 */
export type AttemptResult = ("success" | "failure")

/**
 * Canonical disposal attempt event authored by the Raspberry Pi station runtime after a user finishes a sorting attempt.
 */
export interface DisposalEvent {
/**
 * Unique station identifier used across live status, events, and analytics aggregation.
 */
stationId: string
/**
 * Time when the disposal attempt was finalized.
 */
timestamp: string
/**
 * Final resolved item label produced by local or fallback classification.
 */
predictedItem: string
/**
 * Expected disposal method after applying the active local rules preset.
 */
correctDisposalMethod: ("recycle" | "compost" | "garbage")
/**
 * Most recent tracked hand zone before the hand disappeared.
 */
actualDisposalZone: ("left" | "middle" | "right")
/**
 * Outcome of comparing the correct disposal method against the detected disposal zone.
 */
attemptResult: ("success" | "failure")
/**
 * Confidence score from the classification path that determined the final item label.
 */
modelConfidence: number
/**
 * Whether the station used the fallback LLM path because local confidence was below the configured threshold.
 */
llmFallbackUsed: boolean
}
