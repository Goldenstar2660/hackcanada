import type {
  AnalyticsSummary,
  DisposalEvent,
  LiveStationStatus,
  RulesPreset,
  StationMetadata,
  StationRecord
} from "@binbuddy/contracts";

import {
  assertAnalyticsSummary,
  assertDisposalEvent,
  assertLiveStationStatus,
  assertRulesPreset,
  assertStationMetadata,
  assertStationRecord
} from "../domain/validation.js";

type FirestorePrimitive = boolean | number | string | null;
type FirestoreValue = FirestorePrimitive | FirestoreDocument | FirestoreValue[];
export interface FirestoreDocument {
  readonly [key: string]: FirestoreValue;
}

export interface FirestoreDocumentConverter<TModel> {
  toFirestore(model: TModel): FirestoreDocument;
  fromFirestore(document: FirestoreDocument): TModel;
}

function cloneDocument<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function createConverter<TModel>(assertion: (value: unknown) => asserts value is TModel): FirestoreDocumentConverter<TModel> {
  return {
    toFirestore(model) {
      assertion(model);
      return cloneDocument(model) as FirestoreDocument;
    },
    fromFirestore(document) {
      const model = cloneDocument(document) as unknown;
      assertion(model);
      return model;
    }
  };
}

export const disposalEventConverter = createConverter<DisposalEvent>(assertDisposalEvent);
export const liveStationStatusConverter = createConverter<LiveStationStatus>(assertLiveStationStatus);
export const stationMetadataConverter = createConverter<StationMetadata>(assertStationMetadata);
export const rulesPresetConverter = createConverter<RulesPreset>(assertRulesPreset);
export const stationRecordConverter = createConverter<StationRecord>(assertStationRecord);
export const analyticsSummaryConverter = createConverter<AnalyticsSummary>(assertAnalyticsSummary);