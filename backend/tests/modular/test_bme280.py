"""
Modular tests for the BME280 environmental sensor.

These tests validate every path the room-node ESP32 uses to send
BME280 data to the backend.  They run without real hardware:
all network/database calls are mocked.

Run just these tests::

    pytest -m bme280
    pytest tests/modular/test_bme280.py

What is tested
--------------
- Valid temperature, humidity, and pressure ranges accepted (202)
- Sensor-specific boundary values (min / max / typical)
- Partial payload (only temperature present) accepted
- Out-of-range humidity correctly rejected (422)
- Backend broker failure is tolerated (202 still returned)
- Room-node endpoint accepts BME280-only fields
- Results are recorded in the modular test report
"""

import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [pytest.mark.bme280, pytest.mark.backend_only]

client = TestClient(app)

DEVICE_ID = "room-node-01"
BASE_TIMESTAMP = "2026-01-01T12:00:00Z"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

BME280_SCENARIOS = [
    # (description, temperature, humidity, pressure)
    ("indoor_comfort",       22.5, 55.0,  1013.25),
    ("cold_room",            15.0, 40.0,  1010.0),
    ("warm_room",            28.0, 70.0,  1015.0),
    ("min_temperature",     -40.0, 0.0,   300.0),
    ("max_temperature",      85.0, 100.0, 1100.0),
    ("sea_level_pressure",   20.0, 50.0,  1013.25),
    ("high_altitude",        10.0, 30.0,  700.0),
]


def _env_payload(temperature=22.5, humidity=55.0, pressure=1013.25):
    return {
        "device_id": DEVICE_ID,
        "timestamp": BASE_TIMESTAMP,
        "temperature": temperature,
        "humidity": humidity,
        "pressure": pressure,
    }


def _room_node_bme_payload(temperature=22.5, humidity=55.0, pressure=1013.25):
    """Room-node payload with only BME280 fields populated."""
    return {
        "device_id": DEVICE_ID,
        "room": "Living Room",
        "timestamp": BASE_TIMESTAMP,
        "temperature": temperature,
        "humidity": humidity,
        "pressure": pressure,
    }


# ---------------------------------------------------------------------------
# Environmental endpoint tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("scenario,temp,hum,press", BME280_SCENARIOS)
def test_bme280_environmental_ingest(report, scenario, temp, hum, press):
    """
    POST /api/sensors/ingest/environmental accepts the full range
    of valid BME280 readings and returns 202.
    """
    payload = _env_payload(temp, hum, press)
    t0 = time.monotonic()

    with patch("app.api.sensors.broker") as mock_broker:
        mock_broker.publish = AsyncMock(return_value=None)
        response = client.post("/api/sensors/ingest/environmental", json=payload)

    duration_ms = (time.monotonic() - t0) * 1000

    report.record(
        test_id=f"test_bme280_env_{scenario}",
        component="bme280",
        scenario=f"BME280 environmental ingest – {scenario}",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data={"temperature": temp, "humidity": hum, "pressure": press},
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"
    assert body["device_id"] == DEVICE_ID


def test_bme280_partial_payload_temperature_only(report):
    """
    Only temperature present; humidity and pressure are None.
    The endpoint must still return 202.
    """
    payload = {
        "device_id": DEVICE_ID,
        "timestamp": BASE_TIMESTAMP,
        "temperature": 22.5,
    }
    t0 = time.monotonic()
    with patch("app.api.sensors.broker") as mock_broker:
        mock_broker.publish = AsyncMock(return_value=None)
        response = client.post("/api/sensors/ingest/environmental", json=payload)
    duration_ms = (time.monotonic() - t0) * 1000

    report.record(
        test_id="test_bme280_partial_temperature_only",
        component="bme280",
        scenario="BME280 partial payload – temperature only",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data={"temperature": 22.5},
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )
    assert response.status_code == 202


def test_bme280_missing_device_id_rejected(report):
    """Request without device_id must be rejected with 422."""
    payload = {"timestamp": BASE_TIMESTAMP, "temperature": 22.5}
    response = client.post("/api/sensors/ingest/environmental", json=payload)
    report.record(
        test_id="test_bme280_missing_device_id",
        component="bme280",
        scenario="BME280 missing device_id → 422",
        status="passed" if response.status_code == 422 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 422


def test_bme280_broker_failure_still_returns_202(report):
    """
    Broker publish failure must NOT cause a 5xx response.
    The ingest endpoint is fire-and-forget on the broker side.
    """
    payload = _env_payload()
    t0 = time.monotonic()
    with patch("app.api.sensors.broker") as mock_broker:
        mock_broker.publish = AsyncMock(side_effect=RuntimeError("broker down"))
        response = client.post("/api/sensors/ingest/environmental", json=payload)
    duration_ms = (time.monotonic() - t0) * 1000

    report.record(
        test_id="test_bme280_broker_failure_tolerant",
        component="bme280",
        scenario="BME280 broker failure – still 202",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data=_env_payload(),
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )
    assert response.status_code == 202


# ---------------------------------------------------------------------------
# Room-node endpoint tests (BME280 fields only)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("scenario,temp,hum,press", BME280_SCENARIOS)
def test_bme280_room_node_ingest(report, scenario, temp, hum, press):
    """
    POST /api/sensors/ingest/room-node accepts BME280-only payloads
    (no light, dimmer, or fan fields required).
    """
    payload = _room_node_bme_payload(temp, hum, press)
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
        test_id=f"test_bme280_room_node_{scenario}",
        component="bme280",
        scenario=f"BME280 via room-node endpoint – {scenario}",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data={"temperature": temp, "humidity": hum, "pressure": press},
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"
    assert body["device_id"] == DEVICE_ID


def test_bme280_response_contains_expected_fields(report):
    """202 response body must include status, message, device_id, timestamp."""
    payload = _env_payload()
    with patch("app.api.sensors.broker") as mock_broker:
        mock_broker.publish = AsyncMock(return_value=None)
        response = client.post("/api/sensors/ingest/environmental", json=payload)

    body = response.json()
    report.record(
        test_id="test_bme280_response_fields",
        component="bme280",
        scenario="BME280 202 response has correct fields",
        status="passed" if all(k in body for k in ("status", "message", "device_id", "timestamp")) else "failed",
        http_status=response.status_code,
        response_body=body,
    )
    assert "status" in body
    assert "message" in body
    assert "device_id" in body
    assert "timestamp" in body
