"""
Message Broker Abstraction

Provides a thin abstraction over the message broker used by the backend.

Design goals:
- MQTT is the **default** broker for device and sensor events
- Redis Streams is kept as an **alternative/legacy** implementation
- Callers depend on a simple `publish` interface, not on a specific broker

The current implementation focuses on providing a stable interface and
clear logging. Actual network integrations (e.g. asyncio-mqtt, aioredis)
can be added incrementally without changing API-layer code.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict

from app.config import settings


class MessageBroker(ABC):
    """
    Abstract base class for message broker implementations.
    """

    @abstractmethod
    async def publish(self, channel: str, payload: Dict[str, Any]) -> None:
        """
        Publish a message to the broker.

        Args:
            channel: Logical topic/stream name (e.g. 'sensors/environmental')
            payload: JSON-serializable dictionary payload
        """


class MQTTBroker(MessageBroker):
    """
    MQTT-based message broker (default implementation).

    This is intentionally minimal and logging-focused for now. It can be
    upgraded later to use an async MQTT client library without changing
    the rest of the codebase.
    """

    def __init__(self, broker_url: str) -> None:
        self.broker_url = broker_url

    async def publish(self, channel: str, payload: Dict[str, Any]) -> None:
        # TODO: Integrate an async MQTT client (e.g. asyncio-mqtt) and
        # perform a real publish to the configured broker.
        print(f"[MQTT] ({self.broker_url}) {channel}: {payload}")


class RedisBroker(MessageBroker):
    """
    Redis Streams-based message broker (alternative/legacy).

    Kept as an alternative implementation in case we decide to switch
    back to Redis Streams or use Redis for specific workloads such as
    durable queues or caching.
    """

    def __init__(self, redis_url: str) -> None:
        self.redis_url = redis_url

    async def publish(self, channel: str, payload: Dict[str, Any]) -> None:
        # TODO: Integrate an async Redis client (e.g. redis.asyncio) and
        # push payloads to a Redis Stream.
        stream = channel
        print(f"[REDIS] ({self.redis_url}) XADD {stream}: {payload}")


def _create_broker() -> MessageBroker:
    """
    Factory function to create the appropriate broker implementation
    based on configuration.
    """
    broker_type = (settings.BROKER_TYPE or "mqtt").lower()

    if broker_type == "redis":
        print(f"[BROKER] Using Redis Streams broker ({settings.REDIS_URL})")
        return RedisBroker(settings.REDIS_URL)

    # Default: MQTT
    print(f"[BROKER] Using MQTT broker ({settings.MQTT_BROKER_URL})")
    return MQTTBroker(settings.MQTT_BROKER_URL)


# Global broker instance used by the rest of the application
broker: MessageBroker = _create_broker()


__all__ = ["MessageBroker", "MQTTBroker", "RedisBroker", "broker"]

