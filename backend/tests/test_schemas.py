"""
Tests for Pydantic schemas used in the lighting API.
"""

import pytest
from pydantic import ValidationError

from app.schemas.lighting import (
    DaylightHarvestSchema,
    DimmerCommandSchema,
    LightingHistorySchema,
    LightingSensorDataSchema,
    RelayCommandSchema,
)
from datetime import datetime


# ---------------------------------------------------------------------------
# LightingSensorDataSchema
# ---------------------------------------------------------------------------


def test_lighting_sensor_data_valid():
    data = LightingSensorDataSchema(
        device_id="dev-01",
        timestamp="2026-01-01T00:00:00Z",
        light_level=50.0,
        light_lux=500.0,
        dimmer_brightness=75,
        daylight_harvest_mode=True,
        relays=[True, False, True, False],
    )
    assert data.device_id == "dev-01"
    assert data.relays == [True, False, True, False]


def test_lighting_sensor_data_missing_required():
    with pytest.raises(ValidationError):
        LightingSensorDataSchema()


def test_lighting_sensor_data_invalid_relay_count():
    with pytest.raises(ValidationError):
        LightingSensorDataSchema(
            device_id="dev-01",
            timestamp="2026-01-01T00:00:00Z",
            relays=[True, False],  # must be exactly 4
        )


def test_lighting_sensor_data_optional_fields_none():
    data = LightingSensorDataSchema(
        device_id="dev-01",
        timestamp="2026-01-01T00:00:00Z",
    )
    assert data.light_level is None
    assert data.relays is None


# ---------------------------------------------------------------------------
# DimmerCommandSchema
# ---------------------------------------------------------------------------


def test_dimmer_command_valid():
    cmd = DimmerCommandSchema(brightness=80)
    assert cmd.brightness == 80


def test_dimmer_command_boundary_values():
    assert DimmerCommandSchema(brightness=0).brightness == 0
    assert DimmerCommandSchema(brightness=100).brightness == 100


def test_dimmer_command_out_of_range():
    with pytest.raises(ValidationError):
        DimmerCommandSchema(brightness=101)
    with pytest.raises(ValidationError):
        DimmerCommandSchema(brightness=-1)


# ---------------------------------------------------------------------------
# RelayCommandSchema
# ---------------------------------------------------------------------------


def test_relay_command_valid():
    cmd = RelayCommandSchema(channel=1, state=True)
    assert cmd.channel == 1
    assert cmd.state is True


def test_relay_command_all_channels():
    for ch in range(1, 5):
        cmd = RelayCommandSchema(channel=ch, state=False)
        assert cmd.channel == ch


def test_relay_command_invalid_channel():
    with pytest.raises(ValidationError):
        RelayCommandSchema(channel=0, state=True)
    with pytest.raises(ValidationError):
        RelayCommandSchema(channel=5, state=True)


# ---------------------------------------------------------------------------
# DaylightHarvestSchema
# ---------------------------------------------------------------------------


def test_daylight_harvest_enabled():
    schema = DaylightHarvestSchema(enabled=True)
    assert schema.enabled is True


def test_daylight_harvest_disabled():
    schema = DaylightHarvestSchema(enabled=False)
    assert schema.enabled is False


# ---------------------------------------------------------------------------
# LightingHistorySchema
# ---------------------------------------------------------------------------


def test_lighting_history_schema():
    now = datetime.utcnow()
    schema = LightingHistorySchema(
        time=now,
        light_level=45.0,
        light_lux=450.0,
        dimmer_brightness=60,
    )
    assert schema.time == now
    assert schema.light_level == 45.0
