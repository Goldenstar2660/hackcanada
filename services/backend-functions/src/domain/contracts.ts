import type { RulesPreset, RulesPresetSummary, StationMetadata, StationRecord } from "@binbuddy/contracts";

export * from "./normalization.js";

export function summarizeRulesPreset(preset: RulesPreset): RulesPresetSummary {
  return {
    presetId: preset.presetId,
    version: preset.version,
    jurisdiction: preset.jurisdiction,
    zoneMapping: preset.zoneMapping,
    lowConfidenceThreshold: preset.lowConfidenceThreshold
  };
}

export function joinStationRecord(metadata: StationMetadata, preset: RulesPreset): StationRecord {
  if (metadata.activeRulesPresetId !== preset.presetId) {
    throw new Error(
      `station ${metadata.stationId} references rules preset ${metadata.activeRulesPresetId} but received ${preset.presetId}`
    );
  }

  return {
    ...metadata,
    activeRulesPreset: summarizeRulesPreset(preset)
  };
}