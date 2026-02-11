"""
Pydantic schemas for lighting control API
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class LightingSensorDataSchema(BaseModel):
    """Schema for lighting sensor data ingestion"""
    device_id: str = Field(..., description="Unique device identifier")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    light_level: Optional[float] = Field(None, ge=0, le=100, description="Ambient light level (0-100%)")
    light_lux: Optional[float] = Field(None, ge=0, description="Calculated lux value")
    dimmer_brightness: Optional[int] = Field(None, ge=0, le=100, description="Current dimmer setting (0-100%)")
    daylight_harvest_mode: Optional[bool] = Field(None, description="Daylight harvesting enabled")
    relays: Optional[List[bool]] = Field(None, description="Relay states [ch1, ch2, ch3, ch4]")

    @validator('relays')
    def validate_relays(cls, v):
        if v is not None and len(v) != 4:
            raise ValueError('Relays list must contain exactly 4 boolean values')
        return v

    class Config:
        schema_extra = {
            "example": {
                "device_id": "lighting-control-01",
                "timestamp": "2026-02-11T16:00:00.000Z",
                "light_level": 45.3,
                "light_lux": 453.0,
                "dimmer_brightness": 65,
                "daylight_harvest_mode": True,
                "relays": [False, False, False, False]
            }
        }


class DimmerCommandSchema(BaseModel):
    """Schema for dimmer control command"""
    brightness: int = Field(..., ge=0, le=100, description="Brightness level (0-100%)")

    class Config:
        schema_extra = {
            "example": {
                "brightness": 75
            }
        }


class RelayCommandSchema(BaseModel):
    """Schema for relay control command"""
    channel: int = Field(..., ge=1, le=4, description="Relay channel (1-4)")
    state: bool = Field(..., description="Relay state (true=ON, false=OFF)")

    class Config:
        schema_extra = {
            "example": {
                "channel": 1,
                "state": True
            }
        }


class DaylightHarvestSchema(BaseModel):
    """Schema for daylight harvesting toggle"""
    enabled: bool = Field(..., description="Enable/disable daylight harvesting")

    class Config:
        schema_extra = {
            "example": {
                "enabled": True
            }
        }


class DeviceStatusSchema(BaseModel):
    """Schema for device status response"""
    device_id: str
    status: str
    last_seen: Optional[datetime]
    dimmer_brightness: Optional[int]
    daylight_harvest_mode: Optional[bool]
    relay_states: Optional[List[bool]]

    class Config:
        schema_extra = {
            "example": {
                "device_id": "lighting-control-01",
                "status": "online",
                "last_seen": "2026-02-11T16:00:00.000Z",
                "dimmer_brightness": 65,
                "daylight_harvest_mode": True,
                "relay_states": [False, False, False, False]
            }
        }


class LightingHistorySchema(BaseModel):
    """Schema for lighting history data point"""
    time: datetime
    light_level: Optional[float]
    light_lux: Optional[float]
    dimmer_brightness: Optional[int]

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "time": "2026-02-11T16:00:00.000Z",
                "light_level": 45.3,
                "light_lux": 453.0,
                "dimmer_brightness": 65
            }
        }


class LightingHistoryResponse(BaseModel):
    """Schema for lighting history response"""
    device_id: str
    data: List[LightingHistorySchema]
    total_records: int

    class Config:
        schema_extra = {
            "example": {
                "device_id": "lighting-control-01",
                "data": [],
                "total_records": 100
            }
        }
