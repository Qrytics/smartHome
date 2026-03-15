"""
Unit tests for the message broker service (MQTT and Redis implementations).
"""

import asyncio
from unittest.mock import patch

import pytest

from app.services.broker import MQTTBroker, RedisBroker, _create_broker


# ---------------------------------------------------------------------------
# MQTT broker
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_mqtt_broker_publish(capsys):
    broker = MQTTBroker("mqtt://localhost:1883")
    await broker.publish("sensors/temperature", {"value": 22.5})
    captured = capsys.readouterr()
    assert "MQTT" in captured.out
    assert "sensors/temperature" in captured.out


# ---------------------------------------------------------------------------
# Redis broker
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_redis_broker_publish(capsys):
    broker = RedisBroker("redis://localhost:6379/0")
    await broker.publish("sensors/humidity", {"value": 55.0})
    captured = capsys.readouterr()
    assert "REDIS" in captured.out
    assert "sensors/humidity" in captured.out


# ---------------------------------------------------------------------------
# Factory function
# ---------------------------------------------------------------------------


def test_create_broker_defaults_to_mqtt(capsys):
    with patch("app.services.broker.settings") as mock_settings:
        mock_settings.BROKER_TYPE = "mqtt"
        mock_settings.MQTT_BROKER_URL = "mqtt://localhost:1883"
        mock_settings.REDIS_URL = "redis://localhost:6379/0"
        broker = _create_broker()
    assert isinstance(broker, MQTTBroker)


def test_create_broker_redis(capsys):
    with patch("app.services.broker.settings") as mock_settings:
        mock_settings.BROKER_TYPE = "redis"
        mock_settings.MQTT_BROKER_URL = "mqtt://localhost:1883"
        mock_settings.REDIS_URL = "redis://localhost:6379/0"
        broker = _create_broker()
    assert isinstance(broker, RedisBroker)


def test_create_broker_unknown_type_defaults_to_mqtt():
    with patch("app.services.broker.settings") as mock_settings:
        mock_settings.BROKER_TYPE = "kafka"
        mock_settings.MQTT_BROKER_URL = "mqtt://localhost:1883"
        mock_settings.REDIS_URL = "redis://localhost:6379/0"
        broker = _create_broker()
    assert isinstance(broker, MQTTBroker)
