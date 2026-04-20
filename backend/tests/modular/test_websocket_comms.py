"""
Modular tests for WebSocket communications between the backend
and ESP32 devices.

Validates the WebSocket manager service that handles:
- Device connection / disconnection
- Sending commands to room-node devices (dimmer, fan, relay, daylight harvest)
- Broadcasting sensor data to frontend clients
- Device state cache
- Handling device messages

Run just these tests::

    pytest -m websocket

What is tested
--------------
- Device connects and appears in connected list
- Device disconnects and is removed from connected list
- send_dimmer_command dispatches correct JSON payload
- send_fan_command dispatches correct JSON payload
- send_relay_command dispatches correct JSON payload
- send_daylight_harvest_command dispatches correct JSON payload
- broadcast_to_clients delivers message to all frontend clients
- Disconnected client is removed from set during broadcast
- Device state is cached after connection
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.websocket_manager import ConnectionManager

pytestmark = [pytest.mark.websocket, pytest.mark.backend_only]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def manager():
    return ConnectionManager()


def _make_ws():
    ws = MagicMock()
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock()
    return ws


# ---------------------------------------------------------------------------
# Connection management
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ws_device_connect_appears_in_list(report, manager):
    """Device connection is recorded and visible via get_connected_devices."""
    ws = _make_ws()
    await manager.connect_device("room-node-01", ws)

    connected = manager.get_connected_devices()
    status = "passed" if "room-node-01" in connected else "failed"

    report.record(
        test_id="test_ws_device_connect",
        component="websocket",
        scenario="Room node connects → appears in connected devices list",
        status=status,
    )

    assert "room-node-01" in connected
    assert manager.is_device_connected("room-node-01") is True


@pytest.mark.asyncio
async def test_ws_device_disconnect_removed(report, manager):
    """Disconnected device no longer appears in get_connected_devices."""
    ws = _make_ws()
    await manager.connect_device("room-node-01", ws)
    manager.disconnect_device("room-node-01")

    status = "passed" if not manager.is_device_connected("room-node-01") else "failed"

    report.record(
        test_id="test_ws_device_disconnect",
        component="websocket",
        scenario="Room node disconnects → removed from connected list",
        status=status,
    )

    assert manager.is_device_connected("room-node-01") is False


@pytest.mark.asyncio
async def test_ws_multiple_devices_connect(report, manager):
    """Three room nodes can be connected simultaneously."""
    for device_id in ("room-node-01", "room-node-02", "room-node-03"):
        await manager.connect_device(device_id, _make_ws())

    connected = manager.get_connected_devices()
    status = "passed" if len(connected) == 3 else "failed"

    report.record(
        test_id="test_ws_multiple_devices",
        component="websocket",
        scenario="Three room nodes connected simultaneously",
        status=status,
        simulated_data={"connected_count": len(connected)},
    )

    assert len(connected) == 3
    for dev in ("room-node-01", "room-node-02", "room-node-03"):
        assert dev in connected


# ---------------------------------------------------------------------------
# Command delivery
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ws_send_dimmer_command(report, manager):
    """send_dimmer_command sends correct JSON to device WebSocket."""
    ws = _make_ws()
    await manager.connect_device("room-node-01", ws)
    result = await manager.send_dimmer_command("room-node-01", 75)

    # Parse what was actually sent
    sent_json = json.loads(ws.send_text.call_args[0][0])
    status = "passed" if (result and sent_json == {"command": "dimmer", "value": 75}) else "failed"

    report.record(
        test_id="test_ws_dimmer_command",
        component="websocket",
        scenario="WebSocket dimmer command – payload verified",
        status=status,
        simulated_data={"brightness": 75, "sent_payload": sent_json},
    )

    assert result is True
    assert sent_json == {"command": "dimmer", "value": 75}


@pytest.mark.asyncio
async def test_ws_send_fan_on_command(report, manager):
    """send_fan_command(True) sends {'command':'fan','value':1}."""
    ws = _make_ws()
    await manager.connect_device("room-node-02", ws)
    result = await manager.send_fan_command("room-node-02", True)

    sent_json = json.loads(ws.send_text.call_args[0][0])
    status = "passed" if (result and sent_json == {"command": "fan", "value": 1}) else "failed"

    report.record(
        test_id="test_ws_fan_on_command",
        component="websocket",
        scenario="WebSocket fan ON command – payload verified",
        status=status,
        simulated_data={"fan_on": True, "sent_payload": sent_json},
    )

    assert result is True
    assert sent_json == {"command": "fan", "value": 1}


@pytest.mark.asyncio
async def test_ws_send_fan_off_command(report, manager):
    """send_fan_command(False) sends {'command':'fan','value':0}."""
    ws = _make_ws()
    await manager.connect_device("room-node-03", ws)
    result = await manager.send_fan_command("room-node-03", False)

    sent_json = json.loads(ws.send_text.call_args[0][0])
    status = "passed" if (result and sent_json == {"command": "fan", "value": 0}) else "failed"

    report.record(
        test_id="test_ws_fan_off_command",
        component="websocket",
        scenario="WebSocket fan OFF command – payload verified",
        status=status,
        simulated_data={"fan_on": False, "sent_payload": sent_json},
    )

    assert result is True
    assert sent_json == {"command": "fan", "value": 0}


@pytest.mark.asyncio
async def test_ws_send_relay_command(report, manager):
    """send_relay_command sends channel and state in correct JSON."""
    ws = _make_ws()
    await manager.connect_device("room-node-01", ws)
    result = await manager.send_relay_command("room-node-01", 1, True)

    sent_json = json.loads(ws.send_text.call_args[0][0])
    expected = {"command": "relay1", "value": 1}
    status = "passed" if (result and sent_json == expected) else "failed"

    report.record(
        test_id="test_ws_relay_command",
        component="websocket",
        scenario="WebSocket relay command – payload verified",
        status=status,
        simulated_data={"channel": 1, "state": True, "sent_payload": sent_json},
    )

    assert result is True
    assert sent_json == expected


@pytest.mark.asyncio
async def test_ws_send_daylight_harvest_command(report, manager):
    """send_daylight_harvest_command(True) sends value=1."""
    ws = _make_ws()
    await manager.connect_device("room-node-01", ws)
    result = await manager.send_daylight_harvest_command("room-node-01", True)

    sent_json = json.loads(ws.send_text.call_args[0][0])
    expected = {"command": "daylight_harvest", "value": 1}
    status = "passed" if (result and sent_json == expected) else "failed"

    report.record(
        test_id="test_ws_daylight_harvest_command",
        component="websocket",
        scenario="WebSocket daylight harvest command – payload verified",
        status=status,
        simulated_data={"enabled": True, "sent_payload": sent_json},
    )

    assert result is True
    assert sent_json == expected


@pytest.mark.asyncio
async def test_ws_command_to_disconnected_device(report, manager):
    """Sending a command to a disconnected device returns False."""
    result = await manager.send_dimmer_command("nonexistent", 50)

    report.record(
        test_id="test_ws_command_disconnected_device",
        component="websocket",
        scenario="Command to disconnected device → False",
        status="passed" if result is False else "failed",
    )

    assert result is False


# ---------------------------------------------------------------------------
# Broadcast to frontend clients
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ws_broadcast_to_clients(report, manager):
    """broadcast_to_clients sends message to every connected frontend client."""
    ws1 = _make_ws()
    ws2 = _make_ws()
    manager.client_connections.add(ws1)
    manager.client_connections.add(ws2)

    msg = {"type": "room_node_data", "device_id": "room-node-01", "data": {"temperature": 22.5}}
    await manager.broadcast_to_clients(msg)

    sent_text = json.loads(ws1.send_text.call_args[0][0])
    status = "passed" if sent_text["device_id"] == "room-node-01" else "failed"

    report.record(
        test_id="test_ws_broadcast",
        component="websocket",
        scenario="Sensor data broadcast to frontend clients",
        status=status,
        simulated_data=msg,
    )

    ws1.send_text.assert_called_once()
    ws2.send_text.assert_called_once()


def test_ws_handshake_signature_validation(report, manager):
    """Challenge/response signature validates for strict websocket auth."""
    nonce, issued_at = manager.issue_challenge()
    canonical = manager._canonical_auth_payload("device", "room-node-01", nonce, issued_at)
    signature = manager._signature_hex(canonical, "demo-device-secret-change-me")
    ok, reason = manager.verify_handshake("device", "room-node-01", nonce, issued_at, signature)

    report.record(
        test_id="test_ws_handshake_signature_validation",
        component="websocket",
        scenario="Strict websocket challenge-response signature verification",
        status="passed" if ok else "failed",
        simulated_data={"reason": reason},
    )
    assert ok is True
