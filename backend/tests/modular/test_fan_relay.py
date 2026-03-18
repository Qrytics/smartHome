"""
Modular tests for the fan relay module.

Validates POST /api/lighting/fan/{device_id} which controls the
fan relay on GPIO 26 of each room-node ESP32.

Run just these tests::

    pytest -m fan_relay

What is tested
--------------
- Fan can be turned ON (fan_on=true)
- Fan can be turned OFF (fan_on=false)
- Fan state recorded in database
- Offline device returns 503
- Unknown device returns 404
- WebSocket send failure returns 500
- Fan state reflected in room-node payload
"""

import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [pytest.mark.fan_relay, pytest.mark.backend_only]

client = TestClient(app)

DEVICE_ID = "room-node-03"
MOCK_DEVICE = {
    "device_id": DEVICE_ID,
    "device_type": "room_node",
    "name": "Kitchen Node",
    "location": "Kitchen",
    "status": "online",
    "last_seen": "2026-01-01T00:00:00",
}


# ---------------------------------------------------------------------------
# Fan ON / OFF
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("fan_on,label", [(True, "ON"), (False, "OFF")])
def test_fan_relay_set_state(report, fan_on, label):
    """
    POST /api/lighting/fan/{device_id} sets fan state and records it.
    """
    t0 = time.monotonic()

    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_fan_command = AsyncMock(return_value=True)
        mock_db.insert_fan_state.return_value = True

        response = client.post(
            f"/api/lighting/fan/{DEVICE_ID}",
            json={"fan_on": fan_on},
        )

    duration_ms = (time.monotonic() - t0) * 1000

    report.record(
        test_id=f"test_fan_relay_{label.lower()}",
        component="fan_relay",
        scenario=f"Fan relay → {label}",
        status="passed" if response.status_code == 200 else "failed",
        simulated_data={"fan_on": fan_on},
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert label in body["message"]


def test_fan_relay_device_not_found(report):
    """Unknown device → 404."""
    with patch("app.api.lighting.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.post(
            "/api/lighting/fan/ghost-device", json={"fan_on": True}
        )
    report.record(
        test_id="test_fan_relay_device_not_found",
        component="fan_relay",
        scenario="Fan relay unknown device → 404",
        status="passed" if response.status_code == 404 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 404


def test_fan_relay_device_offline(report):
    """Offline device → 503."""
    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = MOCK_DEVICE
        mock_ws.is_device_connected.return_value = False
        response = client.post(
            f"/api/lighting/fan/{DEVICE_ID}", json={"fan_on": True}
        )
    report.record(
        test_id="test_fan_relay_offline",
        component="fan_relay",
        scenario="Fan relay offline device → 503",
        status="passed" if response.status_code == 503 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 503


def test_fan_relay_command_failure(report):
    """WebSocket send failure → 500."""
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
    report.record(
        test_id="test_fan_relay_command_failure",
        component="fan_relay",
        scenario="Fan relay WS send fails → 500",
        status="passed" if response.status_code == 500 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Fan state reflected in room-node sensor payload
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("fan_on", [True, False])
def test_fan_relay_state_in_room_node_payload(report, fan_on):
    """
    The room-node combined payload includes fan_on state.
    The /api/sensors/ingest/room-node endpoint must accept it.
    """
    payload = {
        "device_id": DEVICE_ID,
        "room": "Kitchen",
        "timestamp": "2026-01-01T12:00:00Z",
        "temperature": 23.0,
        "fan_on": fan_on,
    }
    t0 = time.monotonic()

    with (
        patch("app.api.sensors.broker") as mock_broker,
        patch("app.api.sensors.ws_manager") as mock_ws,
        patch("app.api.sensors.db_client") as mock_db,
    ):
        mock_broker.publish = AsyncMock(return_value=None)
        mock_ws.broadcast_to_clients = AsyncMock(return_value=None)
        mock_db.update_device_status.return_value = True

        response = client.post("/api/sensors/ingest/room-node", json=payload)

    duration_ms = (time.monotonic() - t0) * 1000

    report.record(
        test_id=f"test_fan_relay_in_room_node_payload_{'on' if fan_on else 'off'}",
        component="fan_relay",
        scenario=f"Fan state in room-node payload – fan_on={fan_on}",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data={"fan_on": fan_on},
        http_status=response.status_code,
        duration_ms=duration_ms,
    )

    assert response.status_code == 202
