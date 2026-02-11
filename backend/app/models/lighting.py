"""
SQLAlchemy models for lighting control system
"""

from sqlalchemy import Column, String, Float, Integer, Boolean, CheckConstraint, ForeignKey, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class LightingSensorData(Base):
    """
    Lighting sensor data table
    Stores ambient light readings and dimmer state
    """
    __tablename__ = 'lighting_sensor_data'

    time = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    device_id = Column(String(50), ForeignKey('devices.device_id', ondelete='CASCADE'), 
                       primary_key=True, nullable=False)
    light_level = Column(Float)  # Ambient light level (0-100%)
    light_lux = Column(Float)    # Calculated lux value
    dimmer_brightness = Column(Integer)  # Current dimmer setting (0-100%)
    daylight_harvest_mode = Column(Boolean)  # Daylight harvesting enabled

    def __repr__(self):
        return f"<LightingSensorData(device_id='{self.device_id}', time='{self.time}', lux={self.light_lux})>"


class RelayState(Base):
    """
    Relay state history table
    Tracks on/off state of 4-channel relay module
    """
    __tablename__ = 'relay_state'
    __table_args__ = (
        CheckConstraint('channel BETWEEN 1 AND 4', name='relay_channel_check'),
    )

    time = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    device_id = Column(String(50), ForeignKey('devices.device_id', ondelete='CASCADE'), 
                       primary_key=True, nullable=False)
    channel = Column(Integer, primary_key=True, nullable=False)
    state = Column(Boolean, nullable=False)

    def __repr__(self):
        return f"<RelayState(device_id='{self.device_id}', channel={self.channel}, state={self.state})>"


class DimmerState(Base):
    """
    Dimmer state history table
    Tracks PWM dimmer brightness changes
    """
    __tablename__ = 'dimmer_state'
    __table_args__ = (
        CheckConstraint('brightness BETWEEN 0 AND 100', name='dimmer_brightness_check'),
    )

    time = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    device_id = Column(String(50), ForeignKey('devices.device_id', ondelete='CASCADE'), 
                       primary_key=True, nullable=False)
    brightness = Column(Integer, nullable=False)

    def __repr__(self):
        return f"<DimmerState(device_id='{self.device_id}', brightness={self.brightness})>"


class Device(Base):
    """
    Device registry table
    """
    __tablename__ = 'devices'

    device_id = Column(String(50), primary_key=True)
    device_type = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    location = Column(String(100))
    firmware_version = Column(String(20))
    ip_address = Column(String(45))  # INET type, supports IPv4 and IPv6
    mac_address = Column(String(17))  # MACADDR type
    status = Column(String(20), default='offline')
    last_seen = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Device(device_id='{self.device_id}', name='{self.name}', status='{self.status}')>"
