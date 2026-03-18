"""
Modular tests for the PWM LED dimmer module.

Validates the /api/lighting/dimmer/{device_id} endpoint which controls
the LEDC PWM output on GPIO 25 of each room-node ESP32.

Run just these tests::

    pytest -m dimmer

What is tested
--------------
- Dimmer accepts 0%, 50%, 100% brightness
- Dimmer boundary values (0 = off, 100 = full)
- All integer steps accepted (spot-checks at 10% intervals)
- Brightness > 100 rejected with 422
- Brightness < 0 rejected with 422
- Dimmer command delivered to connected device
- Offline device returns 503
- Unknown device returns 404
- Daylight harvest toggle commands accepted
"""

import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [pytest.mark.dimmer, pytest.mark.backend_only]

client = TestClient(app)

DEVICE_ID = "room-node-01"
MOCK_DEVICE = {
    "device_id": DEVICE_ID,
    "device_type": "room_node",
    "name": "Living Room Node",
    "location": "Living Room",
    "status": "online",
    "last_seen": "2026-01-01T00:00:00",
}


# ---------------------------------------------------------------------------
# Valid brightness values
# ---------------------------------------------------------------------------

VALID_BRIGHTNESS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]


@pytest.mark.parametrize("brightness", VALID_BRIGHTNESS)
def test_dimmer_valid_brightness(report, brightness):
    """
    POST /api/lighting/dimmer/{device_id} with brightness in [0, 100]
    must return 200 and send the LEDC command to the ESP32.
    """
    t0 = time.monotonic()

    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_dimmer_command = AsyncMock(return_value=True)
        mock_db.insert_dimmer_state.return_value = True

        response = client.post(
            f"/api/lighting/dimmer/{DEVICE_ID}",
            json={"brightness": brightness},
        )

    duration_ms = (time.monotonic() - t0) * 1000

    report.record(
        test_id=f"test_dimmer_brightness_{brightness}",
        component="dimmer",
        scenario=f"PWM dimmer set to {brightness}%",
        status="passed" if response.status_code == 200 else "failed",
        simulated_data={"brightness": brightness},
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert f"{brightness}%" in body["message"]


def test_dimmer_brightness_above_100_rejected(report):
    """brightness > 100 must be rejected with 422."""
    response = client.post(
        f"/api/lighting/dimmer/{DEVICE_ID}", json={"brightness": 101}
    )
    report.record(
        test_id="test_dimmer_above_100",
        component="dimmer",
        scenario="PWM dimmer brightness 101 → 422",
        status="passed" if response.status_code == 422 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 422


def test_dimmer_brightness_negative_rejected(report):
    """brightness < 0 must be rejected with 422."""
    response = client.post(
        f"/api/lighting/dimmer/{DEVICE_ID}", json={"brightness": -1}
    )
    report.record(
        test_id="test_dimmer_negative",
        component="dimmer",
        scenario="PWM dimmer brightness −1 → 422",
        status="passed" if response.status_code == 422 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 422


def test_dimmer_device_not_found(report):
    """Unknown device_id → 404."""
    with patch("app.api.lighting.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.post(
            f"/api/lighting/dimmer/unknown-device", json={"brightness": 50}
        )
    report.record(
        test_id="test_dimmer_device_not_found",
        component="dimmer",
        scenario="PWM dimmer unknown device → 404",
        status="passed" if response.status_code == 404 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 404


def test_dimmer_device_offline(report):
    """Offline device → 503."""
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = False
        response = client.post(
            f"/api/lighting/dimmer/{DEVICE_ID}", json={"brightness": 50}
        )
    report.record(
        test_id="test_dimmer_offline",
        component="dimmer",
        scenario="PWM dimmer offline device → 503",
        status="passed" if response.status_code == 503 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 503


def test_dimmer_command_delivery_failure(report):
    """WebSocket send failure → 500."""
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
    report.record(
        test_id="test_dimmer_command_failure",
        component="dimmer",
        scenario="PWM dimmer WS send fails → 500",
        status="passed" if response.status_code == 500 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Daylight harvesting toggle
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("enabled", [True, False])
def test_dimmer_daylight_harvest_toggle(report, enabled):
    """
    POST /api/lighting/daylight-harvest/{device_id} toggles the
    daylight harvesting mode (which controls auto-dimming).
    """
    t0 = time.monotonic()

    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_daylight_harvest_command = AsyncMock(return_value=True)

        response = client.post(
            f"/api/lighting/daylight-harvest/{DEVICE_ID}",
            json={"enabled": enabled},
        )

    duration_ms = (time.monotonic() - t0) * 1000
    label = "ENABLED" if enabled else "DISABLED"
    report.record(
        test_id=f"test_dimmer_dh_toggle_{label.lower()}",
        component="dimmer",
        scenario=f"Daylight harvest toggle → {label}",
        status="passed" if response.status_code == 200 else "failed",
        simulated_data={"daylight_harvest_enabled": enabled},
        http_status=response.status_code,
        duration_ms=duration_ms,
    )

    assert response.status_code == 200
    body = response.json()
    assert label in body["message"]
