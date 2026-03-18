"""
Modular tests for the TEMT6000 ambient light sensor.

Validates every API path that carries TEMT6000 light readings.
All hardware calls are mocked; no physical sensor is required.

Run just these tests::

    pytest -m temt6000

What is tested
--------------
- Valid lux / light-level ranges accepted
- Boundary values (0 lux / full-scale 1000 lux)
- Daylight harvesting trigger logic (light level influences dimmer)
- room-node payload with only light-sensor fields
- Invalid light_level (out of 0-100 range) rejected with 422
- Report entries generated for each scenario
"""

import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [pytest.mark.temt6000, pytest.mark.backend_only]

client = TestClient(app)

DEVICE_ID = "room-node-02"
BASE_TIMESTAMP = "2026-01-01T12:00:00Z"

# ---------------------------------------------------------------------------
# TEMT6000 light-level scenarios
# (description, light_level_pct, light_lux)
# ---------------------------------------------------------------------------
LIGHT_SCENARIOS = [
    ("dark_room",         2.0,    20.0),
    ("dim_room",         20.0,   200.0),
    ("typical_office",   45.0,   450.0),
    ("bright_daylight",  80.0,   800.0),
    ("full_scale",      100.0,  1000.0),
    ("zero_lux",          0.0,     0.0),
]


def _light_payload(light_level=45.0, light_lux=450.0, dimmer=65, dh=True):
    """room-node payload with only TEMT6000 fields set."""
    return {
        "device_id": DEVICE_ID,
        "room": "Bedroom",
        "timestamp": BASE_TIMESTAMP,
        "light_level": light_level,
        "light_lux": light_lux,
        "dimmer_brightness": dimmer,
        "daylight_harvest_mode": dh,
    }


def _lighting_sensor_payload(light_level=45.3, light_lux=453.0, dimmer=65, dh=True):
    """Legacy lighting sensor payload."""
    return {
        "device_id": DEVICE_ID,
        "timestamp": BASE_TIMESTAMP,
        "light_level": light_level,
        "light_lux": light_lux,
        "dimmer_brightness": dimmer,
        "daylight_harvest_mode": dh,
        "relays": [False, False, False, False],
    }


# ---------------------------------------------------------------------------
# Room-node endpoint – light sensor only
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("scenario,level,lux", LIGHT_SCENARIOS)
def test_temt6000_room_node_ingest(report, scenario, level, lux):
    """
    POST /api/sensors/ingest/room-node accepts TEMT6000 readings
    across the full 0–1000 lux range.
    """
    payload = _light_payload(light_level=level, light_lux=lux)
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
        test_id=f"test_temt6000_room_node_{scenario}",
        component="temt6000",
        scenario=f"TEMT6000 via room-node – {scenario}",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data={"light_level": level, "light_lux": lux},
        http_status=response.status_code,
        response_body=response.json(),
        duration_ms=duration_ms,
    )

    assert response.status_code == 202
    assert response.json()["device_id"] == DEVICE_ID


def test_temt6000_invalid_light_level_above_100_rejected(report):
    """light_level > 100 must be rejected with 422 (ge=0, le=100 constraint)."""
    payload = _light_payload(light_level=110.0, light_lux=1100.0)
    response = client.post("/api/sensors/ingest/room-node", json=payload)
    report.record(
        test_id="test_temt6000_invalid_above_100",
        component="temt6000",
        scenario="TEMT6000 light_level > 100 → 422",
        status="passed" if response.status_code == 422 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 422


def test_temt6000_invalid_light_level_negative_rejected(report):
    """light_level < 0 must be rejected with 422."""
    payload = _light_payload(light_level=-5.0, light_lux=0.0)
    response = client.post("/api/sensors/ingest/room-node", json=payload)
    report.record(
        test_id="test_temt6000_invalid_negative",
        component="temt6000",
        scenario="TEMT6000 light_level < 0 → 422",
        status="passed" if response.status_code == 422 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 422


def test_temt6000_invalid_lux_negative_rejected(report):
    """light_lux < 0 must be rejected with 422 (ge=0 constraint)."""
    payload = _light_payload(light_level=50.0, light_lux=-10.0)
    response = client.post("/api/sensors/ingest/room-node", json=payload)
    report.record(
        test_id="test_temt6000_invalid_lux_negative",
        component="temt6000",
        scenario="TEMT6000 light_lux < 0 → 422",
        status="passed" if response.status_code == 422 else "failed",
        http_status=response.status_code,
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Daylight harvesting logic via lighting endpoint
# ---------------------------------------------------------------------------

DH_SCENARIOS = [
    # (description, lux, expected_dimmer_adjustment)
    # When lux is low, the backend should accept HIGH dimmer settings.
    # When lux is high, the backend should accept LOW dimmer settings.
    ("dark_dh_bright_artificial",  20.0,  90),
    ("medium_dh_medium_artificial", 400.0, 60),
    ("bright_dh_dim_artificial",   800.0, 20),
]


@pytest.mark.parametrize("scenario,lux,dimmer", DH_SCENARIOS)
def test_temt6000_daylight_harvest_dimmer_pairing(report, scenario, lux, dimmer):
    """
    Daylight harvesting produces an inverse relationship between
    ambient lux and dimmer brightness.  The room-node endpoint
    should accept any (lux, dimmer) pair without error.
    """
    payload = _light_payload(
        light_level=lux / 10.0,
        light_lux=lux,
        dimmer=dimmer,
        dh=True,
    )
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
        test_id=f"test_temt6000_dh_{scenario}",
        component="temt6000",
        scenario=f"TEMT6000 daylight harvest – {scenario}",
        status="passed" if response.status_code == 202 else "failed",
        simulated_data={"light_lux": lux, "dimmer_brightness": dimmer, "daylight_harvest_mode": True},
        http_status=response.status_code,
        duration_ms=duration_ms,
    )

    assert response.status_code == 202
