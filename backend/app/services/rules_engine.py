"""
Runtime automation rules evaluation and command dispatch.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.services import db_client, ws_manager


DEFAULT_RULESET = [
    {
        "name": "Reduce dimmer when bright",
        "trigger": "light_lux",
        "comparator": "gt",
        "threshold": 700,
        "action": "set_dimmer",
        "action_value": "15",
        "enabled": True,
    },
    {
        "name": "Turn fan off when cool",
        "trigger": "temperature",
        "comparator": "lt",
        "threshold": 20,
        "action": "set_fan",
        "action_value": "false",
        "enabled": True,
    },
    {
        "name": "Keep door locked after denied card",
        "trigger": "rfid_denied",
        "comparator": "eq",
        "threshold": 1,
        "action": "set_door_lock",
        "action_value": "locked",
        "enabled": True,
    },
]


def _to_number(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _matches(comparator: str, left: float, right: float) -> bool:
    if comparator == "gt":
        return left > right
    if comparator == "lt":
        return left < right
    if comparator == "gte":
        return left >= right
    if comparator == "lte":
        return left <= right
    return left == right


def _normalize_action_value(action: str, raw: Optional[str]) -> Any:
    value = (raw or "").strip().lower()
    if action == "set_dimmer":
        try:
            return max(0, min(100, int(float(value))))
        except ValueError:
            return 0
    if action == "set_fan":
        return value in {"true", "1", "on", "yes"}
    if action == "set_door_lock":
        return "unlocked" if value in {"unlock", "unlocked", "open"} else "locked"
    return raw


async def _execute_action(action: str, action_value: Any, context: Dict[str, Any]) -> Dict[str, Any]:
    lighting_device = context.get("lighting_device_id", "lighting-control-01")
    hvac_device = context.get("hvac_device_id", "room-node-01")
    door_device = context.get("door_device_id", "door-control-01")

    if action == "set_dimmer":
        success = await ws_manager.send_dimmer_command(lighting_device, int(action_value))
        if success:
            db_client.insert_dimmer_state(lighting_device, int(action_value))
        return {"ok": success, "action": action, "value": action_value}

    if action == "set_fan":
        success = await ws_manager.send_fan_command(hvac_device, bool(action_value))
        if success:
            db_client.insert_fan_state(hvac_device, bool(action_value))
        return {"ok": success, "action": action, "value": action_value}

    if action == "set_door_lock":
        # Door lock command intentionally maps to generic lock command string.
        success = await ws_manager.send_door_lock_command(
            door_device, lock=(action_value != "unlocked")
        )
        return {"ok": success, "action": action, "value": action_value}

    return {"ok": False, "action": action, "error": "Unsupported action"}


async def evaluate_and_execute(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Evaluate enabled rules against incoming context and execute matching actions.
    """
    rules = db_client.list_automation_rules()
    results: List[Dict[str, Any]] = []

    for rule in rules:
        if not rule.get("enabled"):
            continue
        trigger = rule.get("trigger")
        comparator = rule.get("comparator")
        threshold = _to_number(rule.get("threshold"))

        if trigger == "rfid_denied":
            event = context.get("rfid_denied")
            left = 1.0 if event else 0.0
        else:
            left = _to_number(context.get(trigger))

        if left is None or threshold is None:
            continue
        if not _matches(comparator, left, threshold):
            continue

        action_value = _normalize_action_value(rule.get("action"), rule.get("action_value"))
        execution = await _execute_action(rule.get("action"), action_value, context)
        results.append(
            {
                "rule_id": rule.get("id"),
                "rule_name": rule.get("name"),
                "matched": True,
                "execution": execution,
            }
        )

    return results
