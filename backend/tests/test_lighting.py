"""
Tests for the lighting control endpoints.

External services (db_client, ws_manager) are patched so these tests
run without a real database or device connection.
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

DEVICE_ID = "lighting-01"
MOCK_DEVICE = {
    "device_id": DEVICE_ID,
    "device_type": "lighting",
    "name": "Living Room Light",
    "location": "living_room",
    "status": "online",
    "last_seen": "2026-01-01T00:00:00",
}


# ---------------------------------------------------------------------------
# Dimmer control
# ---------------------------------------------------------------------------


def test_set_dimmer_device_not_found():
    with patch("app.api.lighting.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.post(
            f"/api/lighting/dimmer/{DEVICE_ID}", json={"brightness": 50}
        )
    assert response.status_code == 404


def test_set_dimmer_device_offline():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = False
        response = client.post(
            f"/api/lighting/dimmer/{DEVICE_ID}", json={"brightness": 50}
        )
    assert response.status_code == 503


def test_set_dimmer_command_fails():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_dimmer_command = AsyncMock(return_value=False)
        response = client.post(
            f"/api/lighting/dimmer/{DEVICE_ID}", json={"brightness": 50}
        )
    assert response.status_code == 500


def test_set_dimmer_success():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_dimmer_command = AsyncMock(return_value=True)
        mock_db.insert_dimmer_state.return_value = True

        response = client.post(
            f"/api/lighting/dimmer/{DEVICE_ID}", json={"brightness": 75}
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert "75%" in body["message"]


def test_set_dimmer_invalid_brightness():
    """Brightness outside [0, 100] should be rejected with 422."""
    response = client.post(
        f"/api/lighting/dimmer/{DEVICE_ID}", json={"brightness": 150}
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Relay control
# ---------------------------------------------------------------------------


def test_set_relay_device_not_found():
    with patch("app.api.lighting.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.post(
            f"/api/lighting/relay/{DEVICE_ID}", json={"channel": 1, "state": True}
        )
    assert response.status_code == 404


def test_set_relay_device_offline():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = False
        response = client.post(
            f"/api/lighting/relay/{DEVICE_ID}", json={"channel": 2, "state": False}
        )
    assert response.status_code == 503


def test_set_relay_command_fails():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_relay_command = AsyncMock(return_value=False)
        response = client.post(
            f"/api/lighting/relay/{DEVICE_ID}", json={"channel": 1, "state": True}
        )
    assert response.status_code == 500


def test_set_relay_success_on():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_relay_command = AsyncMock(return_value=True)
        mock_db.insert_relay_state.return_value = True

        response = client.post(
            f"/api/lighting/relay/{DEVICE_ID}", json={"channel": 3, "state": True}
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert "ON" in body["message"]


def test_set_relay_success_off():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_relay_command = AsyncMock(return_value=True)
        mock_db.insert_relay_state.return_value = True

        response = client.post(
            f"/api/lighting/relay/{DEVICE_ID}", json={"channel": 4, "state": False}
        )

    assert response.status_code == 200
    body = response.json()
    assert "OFF" in body["message"]


def test_set_relay_invalid_channel():
    response = client.post(
        f"/api/lighting/relay/{DEVICE_ID}", json={"channel": 5, "state": True}
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Daylight harvesting
# ---------------------------------------------------------------------------


def test_set_daylight_harvest_device_not_found():
    with patch("app.api.lighting.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.post(
            f"/api/lighting/daylight-harvest/{DEVICE_ID}", json={"enabled": True}
        )
    assert response.status_code == 404


def test_set_daylight_harvest_device_offline():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = False
        response = client.post(
            f"/api/lighting/daylight-harvest/{DEVICE_ID}", json={"enabled": False}
        )
    assert response.status_code == 503


def test_set_daylight_harvest_command_fails():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_daylight_harvest_command = AsyncMock(return_value=False)
        response = client.post(
            f"/api/lighting/daylight-harvest/{DEVICE_ID}", json={"enabled": True}
        )
    assert response.status_code == 500


def test_set_daylight_harvest_success_enabled():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_daylight_harvest_command = AsyncMock(return_value=True)

        response = client.post(
            f"/api/lighting/daylight-harvest/{DEVICE_ID}", json={"enabled": True}
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert "ENABLED" in body["message"]


def test_set_daylight_harvest_success_disabled():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_daylight_harvest_command = AsyncMock(return_value=True)

        response = client.post(
            f"/api/lighting/daylight-harvest/{DEVICE_ID}", json={"enabled": False}
        )

    assert response.status_code == 200
    body = response.json()
    assert "DISABLED" in body["message"]


# ---------------------------------------------------------------------------
# Device status
# ---------------------------------------------------------------------------


def test_get_device_status_not_found():
    with patch("app.api.lighting.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.get(f"/api/lighting/status/{DEVICE_ID}")
    assert response.status_code == 404


def test_get_device_status_with_cached_state():
    cached_state = {"dimmer_brightness": 80, "daylight_harvest_mode": True}

    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.get_device_state.return_value = cached_state
        mock_ws.is_device_connected.return_value = True

        response = client.get(f"/api/lighting/status/{DEVICE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["device_id"] == DEVICE_ID
    assert body["online"] is True
    assert body["current_state"] == cached_state


def test_get_device_status_from_db():
    db_state = {"dimmer_brightness": 50, "daylight_harvest_mode": False}

    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.get_device_state.return_value = {}
        mock_db.get_latest_lighting_data.return_value = db_state
        mock_ws.is_device_connected.return_value = False

        response = client.get(f"/api/lighting/status/{DEVICE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["current_state"] == db_state
    assert body["online"] is False


def test_get_device_status_no_state():
    """Device exists but has no cached or persisted state."""
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.get_device_state.return_value = {}
        mock_db.get_latest_lighting_data.return_value = None
        mock_ws.is_device_connected.return_value = False

        response = client.get(f"/api/lighting/status/{DEVICE_ID}")

    assert response.status_code == 200
    body = response.json()
    # When both cache and db return nothing, current_state is the empty cache dict
    assert body["current_state"] == {} or body["current_state"] is None


# ---------------------------------------------------------------------------
# Fan control
# ---------------------------------------------------------------------------


def test_set_fan_device_not_found():
    with patch("app.api.lighting.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.post(
            f"/api/lighting/fan/{DEVICE_ID}", json={"fan_on": True}
        )
    assert response.status_code == 404


def test_set_fan_device_offline():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = False
        response = client.post(
            f"/api/lighting/fan/{DEVICE_ID}", json={"fan_on": True}
        )
    assert response.status_code == 503


def test_set_fan_command_fails():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_fan_command = AsyncMock(return_value=False)
        response = client.post(
            f"/api/lighting/fan/{DEVICE_ID}", json={"fan_on": True}
        )
    assert response.status_code == 500


def test_set_fan_success_on():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_fan_command = AsyncMock(return_value=True)
        mock_db.insert_fan_state.return_value = True

        response = client.post(
            f"/api/lighting/fan/{DEVICE_ID}", json={"fan_on": True}
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert "ON" in body["message"]


def test_set_fan_success_off():
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_fan_command = AsyncMock(return_value=True)
        mock_db.insert_fan_state.return_value = True

        response = client.post(
            f"/api/lighting/fan/{DEVICE_ID}", json={"fan_on": False}
        )

    assert response.status_code == 200
    body = response.json()
    assert "OFF" in body["message"]
