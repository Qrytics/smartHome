"""
Unit tests for the ConnectionManager (WebSocket manager service).

No network connections are made; we mock WebSocket objects.
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.websocket_manager import ConnectionManager


@pytest.fixture
def manager():
    return ConnectionManager()


def _make_ws():
    """Return a mock WebSocket object."""
    ws = MagicMock()
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock()
    return ws


# ---------------------------------------------------------------------------
# Initial state
# ---------------------------------------------------------------------------


def test_initial_state(manager):
    assert manager.device_connections == {}
    assert manager.client_connections == set()
    assert manager.device_state == {}


# ---------------------------------------------------------------------------
# Device connection helpers
# ---------------------------------------------------------------------------


def test_is_device_connected_false(manager):
    assert manager.is_device_connected("dev-999") is False


def test_get_connected_devices_empty(manager):
    assert manager.get_connected_devices() == []


def test_get_device_state_empty(manager):
    result = manager.get_device_state("unknown")
    assert result == {}


@pytest.mark.asyncio
async def test_connect_device(manager):
    ws = _make_ws()
    await manager.connect_device("dev-1", ws)
    assert manager.is_device_connected("dev-1")
    assert manager.get_connected_devices() == ["dev-1"]


def test_disconnect_device_that_is_connected(manager):
    ws = _make_ws()
    manager.device_connections["dev-1"] = ws
    manager.disconnect_device("dev-1")
    assert not manager.is_device_connected("dev-1")


def test_disconnect_device_not_registered(manager):
    """Disconnecting an unknown device should not raise."""
    manager.disconnect_device("does-not-exist")


# ---------------------------------------------------------------------------
# Client connection helpers
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_connect_client(manager):
    ws = _make_ws()
    await manager.connect_client(ws)
    assert ws in manager.client_connections


def test_disconnect_client(manager):
    ws = _make_ws()
    manager.client_connections.add(ws)
    manager.disconnect_client(ws)
    assert ws not in manager.client_connections


# ---------------------------------------------------------------------------
# Messaging
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_to_device_not_connected(manager):
    result = await manager.send_to_device("dev-99", {"cmd": "test"})
    assert result is False


@pytest.mark.asyncio
async def test_send_to_device_success(manager):
    ws = _make_ws()
    manager.device_connections["dev-1"] = ws
    result = await manager.send_to_device("dev-1", {"cmd": "ping"})
    assert result is True
    ws.send_text.assert_called_once()


@pytest.mark.asyncio
async def test_send_to_device_send_error(manager):
    ws = _make_ws()
    ws.send_text = AsyncMock(side_effect=RuntimeError("broken pipe"))
    manager.device_connections["dev-1"] = ws
    result = await manager.send_to_device("dev-1", {"cmd": "ping"})
    assert result is False
    assert not manager.is_device_connected("dev-1")


@pytest.mark.asyncio
async def test_broadcast_to_clients_empty(manager):
    """Broadcast with no clients should not raise."""
    await manager.broadcast_to_clients({"type": "update"})


@pytest.mark.asyncio
async def test_broadcast_to_clients_success(manager):
    ws1 = _make_ws()
    ws2 = _make_ws()
    manager.client_connections = {ws1, ws2}
    await manager.broadcast_to_clients({"type": "update", "data": 42})
    ws1.send_text.assert_called_once()
    ws2.send_text.assert_called_once()


@pytest.mark.asyncio
async def test_broadcast_removes_disconnected_client(manager):
    ws_ok = _make_ws()
    ws_bad = _make_ws()
    ws_bad.send_text = AsyncMock(side_effect=RuntimeError("gone"))
    manager.client_connections = {ws_ok, ws_bad}
    await manager.broadcast_to_clients({"type": "update"})
    assert ws_bad not in manager.client_connections


@pytest.mark.asyncio
async def test_handle_device_message(manager):
    ws_client = _make_ws()
    manager.client_connections = {ws_client}
    await manager.handle_device_message("dev-1", {"temp": 22.5})
    assert "dev-1" in manager.device_state
    ws_client.send_text.assert_called_once()


# ---------------------------------------------------------------------------
# Command helpers
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_dimmer_command(manager):
    ws = _make_ws()
    manager.device_connections["dev-1"] = ws
    result = await manager.send_dimmer_command("dev-1", 80)
    assert result is True
    sent = json.loads(ws.send_text.call_args[0][0])
    assert sent["command"] == "dimmer"
    assert sent["value"] == 80


@pytest.mark.asyncio
async def test_send_relay_command(manager):
    ws = _make_ws()
    manager.device_connections["dev-1"] = ws
    result = await manager.send_relay_command("dev-1", 2, True)
    assert result is True
    sent = json.loads(ws.send_text.call_args[0][0])
    assert sent["command"] == "relay2"
    assert sent["value"] == 1


@pytest.mark.asyncio
async def test_send_daylight_harvest_command_enabled(manager):
    ws = _make_ws()
    manager.device_connections["dev-1"] = ws
    result = await manager.send_daylight_harvest_command("dev-1", True)
    assert result is True
    sent = json.loads(ws.send_text.call_args[0][0])
    assert sent["command"] == "daylight_harvest"
    assert sent["value"] == 1


@pytest.mark.asyncio
async def test_send_daylight_harvest_command_disabled(manager):
    ws = _make_ws()
    manager.device_connections["dev-1"] = ws
    result = await manager.send_daylight_harvest_command("dev-1", False)
    assert result is True
    sent = json.loads(ws.send_text.call_args[0][0])
    assert sent["value"] == 0


# ---------------------------------------------------------------------------
# Handshake auth helpers
# ---------------------------------------------------------------------------


def test_issue_challenge_and_verify_success(manager):
    nonce, issued_at = manager.issue_challenge()
    role = "client"
    client_id = "dashboard-client"
    canonical = manager._canonical_auth_payload(role, client_id, nonce, issued_at)
    signature = manager._signature_hex(canonical, "demo-client-secret-change-me")
    ok, reason = manager.verify_handshake(role, client_id, nonce, issued_at, signature)
    assert ok is True
    assert reason == "ok"


def test_verify_handshake_rejects_replay_nonce(manager):
    nonce, issued_at = manager.issue_challenge()
    role = "device"
    client_id = "room-node-01"
    canonical = manager._canonical_auth_payload(role, client_id, nonce, issued_at)
    signature = manager._signature_hex(canonical, "demo-device-secret-change-me")
    first_ok, _ = manager.verify_handshake(role, client_id, nonce, issued_at, signature)
    second_ok, reason = manager.verify_handshake(role, client_id, nonce, issued_at, signature)
    assert first_ok is True
    assert second_ok is False
    assert reason == "unknown_or_expired_nonce"


def test_verify_handshake_rejects_bad_signature(manager):
    nonce, issued_at = manager.issue_challenge()
    ok, reason = manager.verify_handshake("client", "dashboard-client", nonce, issued_at, "not-valid")
    assert ok is False
    assert reason == "bad_signature"
