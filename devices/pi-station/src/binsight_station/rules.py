from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path
import re


@dataclass(frozen=True, slots=True)
class Jurisdiction:
    city: str
    province_or_state: str


@dataclass(frozen=True, slots=True)
class RulesPreset:
    preset_id: str
    version: str
    jurisdiction: Jurisdiction
    supported_items: tuple[str, ...]
    item_to_disposal_method: dict[str, str]
    zone_to_disposal_method: dict[str, str]
    low_confidence_threshold: float

    def disposal_method_for_item(self, item_name: str) -> str:
        disposal_method = self.item_to_disposal_method.get(item_name)
        if disposal_method is None:
            raise ValueError(f"item '{item_name}' is not supported by preset {self.preset_id}@{self.version}")

        return disposal_method

    def disposal_method_for_zone(self, zone: str) -> str | None:
        return self.zone_to_disposal_method.get(zone)

    def zone_for_disposal_method(self, disposal_method: str) -> str:
        for zone, mapped_method in self.zone_to_disposal_method.items():
            if mapped_method == disposal_method:
                return zone
        raise ValueError(
            f"disposal method '{disposal_method}' is not mapped by preset {self.preset_id}@{self.version}"
        )


def load_rules_preset(preset_id: str, version: str | None = None) -> RulesPreset:
    preset_document = _load_preset_document(preset_id, version)
    item_mappings = {
        entry["itemType"]: entry["disposalMethod"]
        for entry in preset_document["itemMappings"]
    }
    return RulesPreset(
        preset_id=preset_document["presetId"],
        version=preset_document["version"],
        jurisdiction=Jurisdiction(
            city=preset_document["jurisdiction"]["city"],
            province_or_state=preset_document["jurisdiction"]["provinceOrState"],
        ),
        supported_items=tuple(preset_document["supportedItems"]),
        item_to_disposal_method=item_mappings,
        zone_to_disposal_method=dict(preset_document["zoneMapping"]),
        low_confidence_threshold=float(preset_document["lowConfidenceThreshold"]),
    )


@lru_cache(maxsize=1)
def _rules_schema() -> dict[str, object]:
    schema_path = _project_root() / "packages" / "contracts" / "schemas" / "domain" / "rules-preset.schema.json"
    return json.loads(schema_path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _available_preset_documents() -> tuple[dict[str, object], ...]:
    presets_dir = _project_root() / "packages" / "rules" / "presets"
    documents: list[dict[str, object]] = []
    for preset_path in sorted(presets_dir.glob("*.json")):
        document = json.loads(preset_path.read_text(encoding="utf-8"))
        _validate_rules_document(document, preset_path)
        documents.append(document)

    return tuple(documents)


def _load_preset_document(preset_id: str, version: str | None) -> dict[str, object]:
    for document in _available_preset_documents():
        if document["presetId"] != preset_id:
            continue
        if version is not None and document["version"] != version:
            continue
        return document

    requested_version = version or "latest"
    raise ValueError(f"rules preset {preset_id}@{requested_version} was not found")


def _validate_rules_document(document: dict[str, object], preset_path: Path) -> None:
    schema = _rules_schema()
    properties = _expect_dict(schema.get("properties"), "rules preset schema properties")
    required_fields = set(_expect_list(schema.get("required"), "rules preset required fields"))
    expected_fields = set(properties.keys())
    actual_fields = set(document.keys())

    missing_fields = required_fields - actual_fields
    if missing_fields:
        raise ValueError(f"{preset_path.name} is missing required fields: {sorted(missing_fields)}")

    unexpected_fields = actual_fields - expected_fields
    if unexpected_fields:
        raise ValueError(f"{preset_path.name} contains unsupported fields: {sorted(unexpected_fields)}")

    version_pattern = str(_expect_dict(properties["version"], "rules preset version schema").get("pattern"))
    if re.fullmatch(version_pattern, str(document["version"])) is None:
        raise ValueError(f"{preset_path.name} has an invalid semantic version: {document['version']}")

    allowed_methods = set(_expect_list(_expect_dict(schema.get("$defs"), "rules preset definitions")["disposalMethod"].get("enum"), "disposal methods"))

    supported_items = _expect_list(document["supportedItems"], "supportedItems")
    if not supported_items or any(not isinstance(item, str) or not item for item in supported_items):
        raise ValueError(f"{preset_path.name} must declare at least one supported item")
    if len(set(supported_items)) != len(supported_items):
        raise ValueError(f"{preset_path.name} must not repeat supported items")

    jurisdiction = _expect_dict(document["jurisdiction"], "jurisdiction")
    if not isinstance(jurisdiction.get("city"), str) or not jurisdiction["city"]:
        raise ValueError(f"{preset_path.name} must define a jurisdiction city")
    if not isinstance(jurisdiction.get("provinceOrState"), str) or not jurisdiction["provinceOrState"]:
        raise ValueError(f"{preset_path.name} must define a jurisdiction province or state")

    item_mappings = _expect_list(document["itemMappings"], "itemMappings")
    if not item_mappings:
        raise ValueError(f"{preset_path.name} must define at least one item mapping")

    item_mapping_schema = _expect_dict(_expect_dict(schema.get("$defs"), "rules preset definitions")["itemMapping"], "itemMapping schema")
    required_item_mapping_fields = set(_expect_list(item_mapping_schema.get("required"), "item mapping required fields"))
    seen_item_types: set[str] = set()
    for mapping in item_mappings:
        resolved_mapping = _expect_dict(mapping, "item mapping")
        mapping_fields = set(resolved_mapping.keys())
        if mapping_fields != required_item_mapping_fields:
            raise ValueError(f"{preset_path.name} item mappings must contain only {sorted(required_item_mapping_fields)}")
        item_type = resolved_mapping.get("itemType")
        disposal_method = resolved_mapping.get("disposalMethod")
        if not isinstance(item_type, str) or not item_type:
            raise ValueError(f"{preset_path.name} has an invalid item mapping itemType")
        if disposal_method not in allowed_methods:
            raise ValueError(f"{preset_path.name} has an invalid disposal method: {disposal_method}")
        if item_type in seen_item_types:
            raise ValueError(f"{preset_path.name} repeats item mapping for {item_type}")
        seen_item_types.add(item_type)

    if seen_item_types != set(supported_items):
        raise ValueError(f"{preset_path.name} supportedItems must match itemMappings exactly")

    zone_mapping = _expect_dict(document["zoneMapping"], "zoneMapping")
    zone_schema = _expect_dict(properties["zoneMapping"], "zone mapping schema")
    required_zones = set(_expect_list(zone_schema.get("required"), "required zones"))
    if set(zone_mapping.keys()) != required_zones:
        raise ValueError(f"{preset_path.name} must define exactly these zones: {sorted(required_zones)}")
    for zone_name, disposal_method in zone_mapping.items():
        if disposal_method not in allowed_methods:
            raise ValueError(f"{preset_path.name} maps zone {zone_name} to unsupported disposal method {disposal_method}")

    low_confidence_threshold = document["lowConfidenceThreshold"]
    if not isinstance(low_confidence_threshold, (float, int)):
        raise ValueError(f"{preset_path.name} lowConfidenceThreshold must be numeric")
    if not 0 <= float(low_confidence_threshold) <= 1:
        raise ValueError(f"{preset_path.name} lowConfidenceThreshold must be between 0 and 1")


def _expect_dict(value: object, label: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"invalid {label}")
    return value


def _expect_list(value: object, label: str) -> list[object]:
    if not isinstance(value, list):
        raise ValueError(f"invalid {label}")
    return value


def _project_root() -> Path:
    return Path(__file__).resolve().parents[4]
