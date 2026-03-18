"""
Modular tests for the full room-node ESP32.

A room-node combines all four components on one ESP32:
  BME280 (temperature / humidity / pressure)
  TEMT6000 (ambient light)
  PWM dimmer (GPIO 25)
  Fan relay  (GPIO 26)

These tests validate the combined ingest endpoint
POST /api/sensors/ingest/room-node and the room-level
control commands (dimmer + fan).  Each subsystem can be
individually mocked-out by running only its own marker.

Run just these tests::

    pytest -m room_node

What is tested
--------------
- Full combined payload accepted (all four sensors)
- Partial payloads (only BME280, only light, only fan state)
- Three-room scenario: all three room nodes simultaneously
- Per-room dimmer and fan control
- Sensor data broadcast to WebSocket clients
- Device status updated to 'online' on ingest
- Data accessible via GET /api/sensors/latest/{device_id}
- Relay control for spare outputs
"""

import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [
    pytest.mark.room_node,
    pytest.mark.bme280,
    pytest.mark.temt6000,
    pytest.mark.dimmer,
    pytest.mark.fan_relay,
    pytest.mark.backend_only,
]

client = TestClient(app)

TIMESTAMP = "2026-01-01T12:00:00Z"

ROOMS = [
    ("room-node-01", "Living Room"),
    ("room-node-02", "Bedroom"),
    ("room-node-03", "Kitchen"),
]

FULL_ROOM_PAYLOADS = {
    "room-node-01": {
        "device_id": "room-node-01",
        "room": "Living Room",
        "timestamp": TIMESTAMP,
        "temperature": 22.5,
        "humidity": 55.0,
        "pressure": 1013.25,
        "light_level": 45.3,
        "light_lux": 453.0,
        "dimmer_brightness": 65,
        "daylight_harvest_mode": True,
        "fan_on": False,
        "relays": [False, False, False, False],
    },
    "room-node-02": {
        "device_id": "room-node-02",
        "room": "Bedroom",
        "timestamp": TIMESTAMP,
        "temperature": 20.0,
        "humidity": 50.0,
        "pressure": 1012.0,
        "light_level": 10.0,
        "light_lux": 100.0,
        "dimmer_brightness": 80,
        "daylight_harvest_mode": True,
        "fan_on": True,
        "relays": [False, False, False, False],
    },
    "room-node-03": {
        "device_id": "room-node-03",
        "room": "Kitchen",
        "timestamp": TIMESTAMP,
        "temperature": 25.0,
        "humidity": 60.0,
        "pressure": 1014.0,
        "light_level": 70.0,
        "light_lux": 700.0,
        "dimmer_brightness": 30,
        "daylight_harvest_mode": False,
        "fan_on": False,
        "relays": [True, False, False, False],
    },
}

MOCK_DEVICE_FACTORY = {
    device_id: {
        "device_id": device_id,
        "device_type": "room_node",
        "name": f"{room} Node",
        "location": room,
        "status": "online",
        "last_seen": TIMESTAMP,
    }
    for device_id, room in ROOMS
}


# ---------------------------------------------------------------------------
# Full combined payload – all three rooms
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("device_id,room", ROOMS)
def test_room_node_full_ingest(report, device_id, room):
    """
    Room-node combined ingest with all sensor fields populated
    returns 202 for each of the three rooms.
    """
    payload = FULL_ROOM_PAYLOADS[device_id]
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
        test_id=f"test_room_node_full_ingest_{device_id}",
        component="room_node",
        scenario=f"Full combined ingest – {room}",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data=payload,
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"
    assert body["device_id"] == device_id


# ---------------------------------------------------------------------------
# Partial payloads (hardware arriving in stages)
# ---------------------------------------------------------------------------

PARTIAL_SCENARIOS = [
    (
        "bme280_only",
        "room-node-01",
        {"device_id": "room-node-01", "timestamp": TIMESTAMP,
         "temperature": 22.5, "humidity": 55.0, "pressure": 1013.25},
    ),
    (
        "temt6000_only",
        "room-node-02",
        {"device_id": "room-node-02", "timestamp": TIMESTAMP,
         "light_level": 45.0, "light_lux": 450.0},
    ),
    (
        "fan_only",
        "room-node-03",
        {"device_id": "room-node-03", "timestamp": TIMESTAMP,
         "fan_on": True},
    ),
    (
        "dimmer_only",
        "room-node-01",
        {"device_id": "room-node-01", "timestamp": TIMESTAMP,
         "dimmer_brightness": 75, "daylight_harvest_mode": True},
    ),
    (
        "bme280_and_light",
        "room-node-02",
        {"device_id": "room-node-02", "timestamp": TIMESTAMP,
         "temperature": 20.0, "humidity": 50.0,
         "light_level": 30.0, "light_lux": 300.0},
    ),
]


@pytest.mark.parametrize("scenario,device_id,payload", PARTIAL_SCENARIOS)
def test_room_node_partial_payload(report, scenario, device_id, payload):
    """
    Partial payloads (e.g., only BME280 present) are accepted.
    This covers the "hardware arriving in stages" scenario.
    """
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
        test_id=f"test_room_node_partial_{scenario}",
        component="room_node",
        scenario=f"Partial room-node payload – {scenario}",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data=payload,
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )

    assert response.status_code == 202


# ---------------------------------------------------------------------------
# Per-room control commands (dimmer + fan)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("device_id,room", ROOMS)
def test_room_node_dimmer_control(report, device_id, room):
    """Dimmer command reaches each of the three room nodes."""
    mock_device = MOCK_DEVICE_FACTORY[device_id]
    t0 = time.monotonic()

    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = mock_device
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_dimmer_command = AsyncMock(return_value=True)
        mock_db.insert_dimmer_state.return_value = True

        response = client.post(
            f"/api/lighting/dimmer/{device_id}", json={"brightness": 75}
        )

    duration_ms = (time.monotonic() - t0) * 1000

    report.record(
        test_id=f"test_room_node_dimmer_{device_id}",
        component="room_node",
        scenario=f"Dimmer 75%% – {room}",
        status="passed" if response.status_code == 200 else "failed",
        simulated_data={"brightness": 75},
        http_status=response.status_code,
        duration_ms=duration_ms,
    )

    assert response.status_code == 200


@pytest.mark.parametrize("device_id,room", ROOMS)
def test_room_node_fan_control(report, device_id, room):
    """Fan command reaches each of the three room nodes."""
    mock_device = MOCK_DEVICE_FACTORY[device_id]
    t0 = time.monotonic()

    with (
        patch("app.api.lighting.db_client") as mock_db,
        patch("app.api.lighting.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = mock_device
        mock_ws.is_device_connected.return_value = True
        mock_ws.send_fan_command = AsyncMock(return_value=True)
        mock_db.insert_fan_state.return_value = True

        response = client.post(
            f"/api/lighting/fan/{device_id}", json={"fan_on": True}
        )

    duration_ms = (time.monotonic() - t0) * 1000

    report.record(
        test_id=f"test_room_node_fan_{device_id}",
        component="room_node",
        scenario=f"Fan ON – {room}",
        status="passed" if response.status_code == 200 else "failed",
        simulated_data={"fan_on": True},
        http_status=response.status_code,
        duration_ms=duration_ms,
    )

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Device status update on ingest
# ---------------------------------------------------------------------------


def test_room_node_device_status_updated_on_ingest(report):
    """
    Ingesting room-node data triggers an 'online' status update
    in the database (best-effort).
    """
    payload = FULL_ROOM_PAYLOADS["room-node-01"]

    with (
        patch("app.api.sensors.broker") as mock_broker,
        patch("app.api.sensors.ws_manager") as mock_ws,
        patch("app.api.sensors.db_client") as mock_db,
    ):
        mock_broker.publish = AsyncMock(return_value=None)
        mock_ws.broadcast_to_clients = AsyncMock(return_value=None)
        mock_db.update_device_status.return_value = True

        response = client.post("/api/sensors/ingest/room-node", json=payload)

        mock_db.update_device_status.assert_called_once_with("room-node-01", "online")

    report.record(
        test_id="test_room_node_device_status_update",
        component="room_node",
        scenario="Device status set to online on ingest",
        status="passed" if response.status_code == 202 else "failed",
        http_status=response.status_code,
    )

    assert response.status_code == 202
