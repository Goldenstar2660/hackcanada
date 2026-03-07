/**
 * This interface was referenced by `RulesPreset`'s JSON-Schema
 * via the `definition` "disposalMethod".
 */
export type DisposalMethod = ("recycle" | "compost" | "garbage")

/**
 * Canonical local rules preset that drives disposal method guidance on the station runtime.
 */
export interface RulesPreset {
/**
 * Stable preset identifier used by station metadata and backend configuration.
 */
presetId: string
/**
 * Semantic version for the preset data artifact.
 */
version: string
/**
 * Region-specific policy context for the preset.
 */
jurisdiction: {
city: string
provinceOrState: string
}
/**
 * Supported item labels that the station is allowed to classify for this preset.
 * 
 * @minItems 1
 */
supportedItems: [string, ...(string)[]]
/**
 * Explicit item to disposal method mappings applied during live guidance.
 * 
 * @minItems 1
 */
itemMappings: [ItemMapping, ...(ItemMapping)[]]
/**
 * Mapping from physical demo zones to disposal methods.
 */
zoneMapping: {
left: DisposalMethod
middle: DisposalMethod
right: DisposalMethod
}
/**
 * Threshold below which the station may invoke fallback classification.
 */
lowConfidenceThreshold: number
}
/**
 * This interface was referenced by `RulesPreset`'s JSON-Schema
 * via the `definition` "itemMapping".
 */
export interface ItemMapping {
itemType: string
disposalMethod: DisposalMethod
}
