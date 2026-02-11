"""
Sensor Data Ingestion Endpoints

Handles incoming sensor data from ESP32 devices including:
- Temperature, humidity, pressure (BME280)
- Ambient light levels (TEMT6000)
- Dimmer brightness levels
- Relay states
"""

from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from typing import Dict, Optional, List
from pydantic import BaseModel, Field
from app.services import db_client, ws_manager

router = APIRouter()


# Request/Response Models
class EnvironmentalSensorData(BaseModel):
    """Environmental sensor data from BME280"""
    device_id: str = Field(..., description="Unique device identifier")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    temperature: Optional[float] = Field(None, description="Temperature in Celsius")
    humidity: Optional[float] = Field(None, description="Humidity percentage")
    pressure: Optional[float] = Field(None, description="Pressure in hPa")


class LightingSensorData(BaseModel):
    """Lighting sensor and control data from ESP32 lighting control"""
    device_id: str = Field(..., description="Unique device identifier")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    light_level: Optional[float] = Field(None, description="Ambient light level (0-100%)")
    light_lux: Optional[float] = Field(None, description="Calculated lux value")
    dimmer_brightness: Optional[int] = Field(None, description="Current dimmer setting (0-100%)")
    daylight_harvest_mode: Optional[bool] = Field(None, description="Daylight harvesting enabled")
    relays: Optional[List[bool]] = Field(None, description="Relay states [ch1, ch2, ch3, ch4]")


class SensorDataResponse(BaseModel):
    """Response for sensor data ingestion"""
    status: str
    message: str
    device_id: str
    timestamp: str


@router.post("/ingest/environmental", response_model=SensorDataResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_environmental_data(data: EnvironmentalSensorData) -> Dict:
    """
    Ingest environmental sensor data (temperature, humidity, pressure)
    
    This endpoint receives data from BME280 sensors and queues it for
    asynchronous processing via Redis Streams.
    
    Args:
        data: Environmental sensor readings
    
    Returns:
        SensorDataResponse: Acknowledgment of data receipt
    """
    # TODO: Validate device_id against registered devices
    # TODO: Push data to Redis Streams for async processing
    # TODO: Store in TimescaleDB via background worker
    
    print(f"[SENSOR] Environmental data from {data.device_id}:")
    print(f"  Temperature: {data.temperature}°C")
    print(f"  Humidity: {data.humidity}%")
    print(f"  Pressure: {data.pressure} hPa")
    
    return {
        "status": "accepted",
        "message": "Environmental sensor data queued for processing",
        "device_id": data.device_id,
        "timestamp": data.timestamp,
    }


@router.post("/ingest/lighting", response_model=SensorDataResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_lighting_data(data: LightingSensorData) -> Dict:
    """
    Ingest lighting sensor and control data
    
    This endpoint receives data from TEMT6000 light sensors and lighting
    control systems, queuing it for asynchronous processing.
    
    Args:
        data: Lighting sensor readings and control states
    
    Returns:
        SensorDataResponse: Acknowledgment of data receipt
    """
    # Validate device exists
    device = db_client.get_device(data.device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {data.device_id} not registered"
        )
    
    # Store in database
    try:
        db_client.insert_lighting_data(data.dict())
        
        # Update device status
        db_client.update_device_status(data.device_id, 'online')
        
        # Broadcast to WebSocket clients for real-time updates
        await ws_manager.broadcast_to_clients({
            'type': 'lighting_data',
            'device_id': data.device_id,
            'data': data.dict()
        })
        
        print(f"[SENSOR] Lighting data from {data.device_id}:")
        print(f"  Light Level: {data.light_level}% ({data.light_lux} lux)")
        print(f"  Dimmer: {data.dimmer_brightness}%")
        print(f"  Daylight Harvest: {data.daylight_harvest_mode}")
        print(f"  Relays: {data.relays}")
        
    except Exception as e:
        print(f"[ERROR] Failed to process lighting data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process sensor data"
        )
    
    return {
        "status": "accepted",
        "message": "Lighting sensor data processed successfully",
        "device_id": data.device_id,
        "timestamp": data.timestamp,
    }


@router.get("/latest/{device_id}")
async def get_latest_sensor_data(device_id: str) -> Dict:
    """
    Get the latest sensor reading for a specific device
    
    Args:
        device_id: Device identifier
    
    Returns:
        dict: Latest sensor data
    
    Raises:
        HTTPException: 404 if device not found
    """
    # Check if device exists
    device = db_client.get_device(device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found"
        )
    
    # Try WebSocket cache first (most recent)
    cached_state = ws_manager.get_device_state(device_id)
    if cached_state:
        return {
            "device_id": device_id,
            "source": "cache",
            "data": cached_state
        }
    
    # Fall back to database
    latest_data = db_client.get_latest_lighting_data(device_id)
    if latest_data:
        return {
            "device_id": device_id,
            "source": "database",
            "data": latest_data
        }
    
    # No data available
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No sensor data found for device {device_id}"
    )


@router.get("/history/{device_id}")
async def get_sensor_history(
    device_id: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    limit: int = 100
) -> Dict:
    """
    Get historical sensor data for a device
    
    Args:
        device_id: Device identifier
        start_time: Start timestamp (ISO 8601)
        end_time: End timestamp (ISO 8601)
        limit: Maximum number of records to return
    
    Returns:
        dict: Historical sensor data
    
    Raises:
        HTTPException: 404 if device not found
    """
    # Check if device exists
    device = db_client.get_device(device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found"
        )
    
    # Parse timestamps if provided
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_time format. Use ISO 8601 format."
            )
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_time format. Use ISO 8601 format."
            )
    
    # Query database
    try:
        history = db_client.get_lighting_history(
            device_id=device_id,
            start_time=start_dt,
            end_time=end_dt,
            limit=min(limit, 1000)  # Cap at 1000 records
        )
        
        return {
            "device_id": device_id,
            "data": history,
            "total_records": len(history),
            "start_time": start_time,
            "end_time": end_time,
            "limit": limit
        }
    except Exception as e:
        print(f"[ERROR] Failed to query history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sensor history"
        )
