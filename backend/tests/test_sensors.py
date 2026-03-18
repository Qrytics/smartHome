"""
Tests for the sensor ingestion and retrieval endpoints.

External services (db_client, ws_manager, broker) are patched so that
these tests run without a real database or message broker.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

DEVICE_ID = "sensor-01"
TIMESTAMP = "2026-01-01T00:00:00Z"

ENVIRONMENTAL_PAYLOAD = {
    "device_id": DEVICE_ID,
    "timestamp": TIMESTAMP,
    "temperature": 22.5,
    "humidity": 55.0,
    "pressure": 1013.0,
}

LIGHTING_PAYLOAD = {
    "device_id": DEVICE_ID,
    "timestamp": TIMESTAMP,
    "light_level": 45.3,
    "light_lux": 453.0,
    "dimmer_brightness": 65,
    "daylight_harvest_mode": True,
    "relays": [False, False, False, False],
}


# ---------------------------------------------------------------------------
# Environmental ingest
# ---------------------------------------------------------------------------


def test_ingest_environmental_success():
    """Environmental ingest succeeds when the broker publish succeeds."""
    with patch("app.api.sensors.broker") as mock_broker:
        mock_broker.publish = AsyncMock(return_value=None)
        response = client.post("/api/sensors/ingest/environmental", json=ENVIRONMENTAL_PAYLOAD)

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"
    assert body["device_id"] == DEVICE_ID


def test_ingest_environmental_broker_failure():
    """Environmental ingest still returns 202 when the broker publish fails."""
    with patch("app.api.sensors.broker") as mock_broker:
        mock_broker.publish = AsyncMock(side_effect=RuntimeError("broker down"))
        response = client.post("/api/sensors/ingest/environmental", json=ENVIRONMENTAL_PAYLOAD)

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"


def test_ingest_environmental_missing_required_fields():
    """Environmental ingest returns 422 when required fields are absent."""
    response = client.post("/api/sensors/ingest/environmental", json={})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Lighting ingest
# ---------------------------------------------------------------------------


def test_ingest_lighting_device_not_found():
    """Lighting ingest returns 404 when the device is not registered."""
    with patch("app.api.sensors.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.post("/api/sensors/ingest/lighting", json=LIGHTING_PAYLOAD)

    assert response.status_code == 404


def test_ingest_lighting_success():
    """Lighting ingest succeeds when the device exists and db writes succeed."""
    mock_device = {"device_id": DEVICE_ID, "status": "online"}

    with (
        patch("app.api.sensors.db_client") as mock_db,
        patch("app.api.sensors.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = mock_device
        mock_db.insert_lighting_data.return_value = True
        mock_db.update_device_status.return_value = True
        mock_ws.broadcast_to_clients = AsyncMock(return_value=None)

        response = client.post("/api/sensors/ingest/lighting", json=LIGHTING_PAYLOAD)

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"
    assert body["device_id"] == DEVICE_ID


def test_ingest_lighting_db_error():
    """Lighting ingest returns 500 when the database write fails."""
    mock_device = {"device_id": DEVICE_ID, "status": "online"}

    with (
        patch("app.api.sensors.db_client") as mock_db,
        patch("app.api.sensors.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = mock_device
        mock_db.insert_lighting_data.side_effect = RuntimeError("db error")
        mock_ws.broadcast_to_clients = AsyncMock(return_value=None)

        response = client.post("/api/sensors/ingest/lighting", json=LIGHTING_PAYLOAD)

    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Latest sensor data
# ---------------------------------------------------------------------------


def test_get_latest_device_not_found():
    """Returns 404 when the device does not exist."""
    with patch("app.api.sensors.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.get(f"/api/sensors/latest/{DEVICE_ID}")

    assert response.status_code == 404


def test_get_latest_from_cache():
    """Returns cached state when available in ws_manager."""
    mock_device = {"device_id": DEVICE_ID}
    cached = {"light_level": 50.0, "dimmer_brightness": 80}

    with (
        patch("app.api.sensors.db_client") as mock_db,
        patch("app.api.sensors.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = mock_device
        mock_ws.get_device_state.return_value = cached

        response = client.get(f"/api/sensors/latest/{DEVICE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "cache"
    assert body["data"] == cached


def test_get_latest_from_database():
    """Falls back to database when the cache is empty."""
    mock_device = {"device_id": DEVICE_ID}
    db_data = {"light_level": 40.0, "dimmer_brightness": 60}

    with (
        patch("app.api.sensors.db_client") as mock_db,
        patch("app.api.sensors.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = mock_device
        mock_ws.get_device_state.return_value = {}
        mock_db.get_latest_lighting_data.return_value = db_data

        response = client.get(f"/api/sensors/latest/{DEVICE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "database"


def test_get_latest_no_data():
    """Returns 404 when neither cache nor database has data."""
    mock_device = {"device_id": DEVICE_ID}

    with (
        patch("app.api.sensors.db_client") as mock_db,
        patch("app.api.sensors.ws_manager") as mock_ws,
    ):
        mock_db.get_device.return_value = mock_device
        mock_ws.get_device_state.return_value = {}
        mock_db.get_latest_lighting_data.return_value = None

        response = client.get(f"/api/sensors/latest/{DEVICE_ID}")

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Sensor history
# ---------------------------------------------------------------------------


def test_get_history_device_not_found():
    with patch("app.api.sensors.db_client") as mock_db:
        mock_db.get_device.return_value = None
        response = client.get(f"/api/sensors/history/{DEVICE_ID}")

    assert response.status_code == 404


def test_get_history_success():
    mock_device = {"device_id": DEVICE_ID}
    history = [{"time": TIMESTAMP, "light_level": 50.0}]

    with patch("app.api.sensors.db_client") as mock_db:
        mock_db.get_device.return_value = mock_device
        mock_db.get_lighting_history.return_value = history

        response = client.get(f"/api/sensors/history/{DEVICE_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["device_id"] == DEVICE_ID
    assert body["total_records"] == 1


def test_get_history_invalid_start_time():
    mock_device = {"device_id": DEVICE_ID}

    with patch("app.api.sensors.db_client") as mock_db:
        mock_db.get_device.return_value = mock_device
        response = client.get(
            f"/api/sensors/history/{DEVICE_ID}?start_time=not-a-date"
        )

    assert response.status_code == 400


def test_get_history_invalid_end_time():
    mock_device = {"device_id": DEVICE_ID}

    with patch("app.api.sensors.db_client") as mock_db:
        mock_db.get_device.return_value = mock_device
        response = client.get(
            f"/api/sensors/history/{DEVICE_ID}?end_time=not-a-date"
        )

    assert response.status_code == 400


def test_get_history_db_error():
    mock_device = {"device_id": DEVICE_ID}

    with patch("app.api.sensors.db_client") as mock_db:
        mock_db.get_device.return_value = mock_device
        mock_db.get_lighting_history.side_effect = RuntimeError("db error")
        response = client.get(f"/api/sensors/history/{DEVICE_ID}")

    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Room-node ingest
# ---------------------------------------------------------------------------

ROOM_NODE_PAYLOAD = {
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
}


def test_ingest_room_node_success():
    """Room-node ingest returns 202 when all services succeed."""
    with (
        patch("app.api.sensors.broker") as mock_broker,
        patch("app.api.sensors.ws_manager") as mock_ws,
        patch("app.api.sensors.db_client") as mock_db,
    ):
        from unittest.mock import AsyncMock
        mock_broker.publish = AsyncMock(return_value=None)
        mock_ws.broadcast_to_clients = AsyncMock(return_value=None)
        mock_db.update_device_status.return_value = True

        response = client.post("/api/sensors/ingest/room-node", json=ROOM_NODE_PAYLOAD)

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"
    assert body["device_id"] == "room-node-01"


def test_ingest_room_node_broker_failure_still_returns_202():
    """Room-node ingest still returns 202 when broker fails."""
    with (
        patch("app.api.sensors.broker") as mock_broker,
        patch("app.api.sensors.ws_manager") as mock_ws,
        patch("app.api.sensors.db_client") as mock_db,
    ):
        from unittest.mock import AsyncMock
        mock_broker.publish = AsyncMock(side_effect=RuntimeError("broker down"))
        mock_ws.broadcast_to_clients = AsyncMock(return_value=None)
        mock_db.update_device_status.return_value = True

        response = client.post("/api/sensors/ingest/room-node", json=ROOM_NODE_PAYLOAD)

    assert response.status_code == 202


def test_ingest_room_node_missing_required_fields():
    """Missing required fields returns 422."""
    response = client.post("/api/sensors/ingest/room-node", json={})
    assert response.status_code == 422


def test_ingest_room_node_minimal_payload():
    """Only device_id and timestamp are required; optional fields may be absent."""
    minimal = {"device_id": "room-node-02", "timestamp": TIMESTAMP}
    with (
        patch("app.api.sensors.broker") as mock_broker,
        patch("app.api.sensors.ws_manager") as mock_ws,
        patch("app.api.sensors.db_client") as mock_db,
    ):
        from unittest.mock import AsyncMock
        mock_broker.publish = AsyncMock(return_value=None)
        mock_ws.broadcast_to_clients = AsyncMock(return_value=None)
        mock_db.update_device_status.return_value = True

        response = client.post("/api/sensors/ingest/room-node", json=minimal)

    assert response.status_code == 202
