from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class RulesPreset:
    version: str
    item_to_disposal_method: dict[str, str]
    zone_to_disposal_method: dict[str, str]

    def disposal_method_for_item(self, item_name: str) -> str:
        return self.item_to_disposal_method.get(item_name, "garbage")


def load_rules_preset(version: str) -> RulesPreset:
    return RulesPreset(
        version=version,
        item_to_disposal_method={
            "plastic-bottle": "recycle",
            "banana-peel": "compost",
            "unknown-item": "garbage",
            "fallback-item": "garbage",
        },
        zone_to_disposal_method={
            "left": "recycle",
            "middle": "compost",
            "right": "garbage",
        },
    )
