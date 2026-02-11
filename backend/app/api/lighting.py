"""
Lighting Control Endpoints

Handles control commands for lighting devices including:
- Dimmer brightness adjustment
- Relay switching
- Daylight harvesting mode toggle
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict
from app.services import ws_manager, db_client

router = APIRouter()


# Request/Response Models
class DimmerControlRequest(BaseModel):
    """Request to set dimmer brightness"""
    brightness: int = Field(..., ge=0, le=100, description="Brightness level (0-100%)")


class RelayControlRequest(BaseModel):
    """Request to control relay state"""
    channel: int = Field(..., ge=1, le=4, description="Relay channel (1-4)")
    state: bool = Field(..., description="Relay state (true=ON, false=OFF)")


class DaylightHarvestRequest(BaseModel):
    """Request to toggle daylight harvesting mode"""
    enabled: bool = Field(..., description="Enable/disable daylight harvesting")


class ControlResponse(BaseModel):
    """Response for control commands"""
    status: str
    message: str
    device_id: str


@router.post("/dimmer/{device_id}", response_model=ControlResponse)
async def set_dimmer_brightness(device_id: str, request: DimmerControlRequest) -> Dict:
    """
    Set LED dimmer brightness for a specific device
    
    This endpoint sends a command to the lighting control ESP32 to adjust
    the PWM dimmer brightness. The command is sent via WebSocket to the
    connected device.
    
    Args:
        device_id: Target device identifier
        request: Dimmer control request with brightness level
    
    Returns:
        ControlResponse: Command acknowledgment
    
    Raises:
        HTTPException: 404 if device not found, 503 if device offline
    """
    # Check if device exists
    device = db_client.get_device(device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found"
        )
    
    # Check if device is online
    if not ws_manager.is_device_connected(device_id):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Device {device_id} is offline"
        )
    
    # Send command via WebSocket
    success = await ws_manager.send_dimmer_command(device_id, request.brightness)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send command to device {device_id}"
        )
    
    # Log command in database
    db_client.insert_dimmer_state(device_id, request.brightness)
    
    return {
        "status": "success",
        "message": f"Dimmer set to {request.brightness}%",
        "device_id": device_id,
    }


@router.post("/relay/{device_id}", response_model=ControlResponse)
async def set_relay_state(device_id: str, request: RelayControlRequest) -> Dict:
    """
    Control relay state for a specific device
    
    This endpoint sends a command to toggle a relay channel on/off.
    Useful for switching high-power loads like main lights or HVAC fans.
    
    Args:
        device_id: Target device identifier
        request: Relay control request with channel and state
    
    Returns:
        ControlResponse: Command acknowledgment
    
    Raises:
        HTTPException: 404 if device not found, 503 if device offline
    """
    # Check if device exists
    device = db_client.get_device(device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found"
        )
    
    # Check if device is online
    if not ws_manager.is_device_connected(device_id):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Device {device_id} is offline"
        )
    
    # Send command via WebSocket
    success = await ws_manager.send_relay_command(device_id, request.channel, request.state)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send command to device {device_id}"
        )
    
    # Log command in database
    db_client.insert_relay_state(device_id, request.channel, request.state)
    
    state_str = "ON" if request.state else "OFF"
    return {
        "status": "success",
        "message": f"Relay {request.channel} set to {state_str}",
        "device_id": device_id,
    }


@router.post("/daylight-harvest/{device_id}", response_model=ControlResponse)
async def set_daylight_harvest_mode(device_id: str, request: DaylightHarvestRequest) -> Dict:
    """
    Toggle daylight harvesting mode for a specific device
    
    When enabled, the device automatically adjusts LED brightness based on
    ambient light levels to save energy while maintaining target illumination.
    
    Args:
        device_id: Target device identifier
        request: Daylight harvest mode request
    
    Returns:
        ControlResponse: Command acknowledgment
    
    Raises:
        HTTPException: 404 if device not found, 503 if device offline
    """
    # Check if device exists
    device = db_client.get_device(device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found"
        )
    
    # Check if device is online
    if not ws_manager.is_device_connected(device_id):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Device {device_id} is offline"
        )
    
    # Send command via WebSocket
    success = await ws_manager.send_daylight_harvest_command(device_id, request.enabled)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send command to device {device_id}"
        )
    
    mode_str = "ENABLED" if request.enabled else "DISABLED"
    return {
        "status": "success",
        "message": f"Daylight harvesting {mode_str}",
        "device_id": device_id,
    }


@router.get("/status/{device_id}")
async def get_device_status(device_id: str) -> Dict:
    """
    Get current status of a lighting control device
    
    Returns the current state of dimmer, relays, and daylight harvesting mode.
    
    Args:
        device_id: Device identifier
    
    Returns:
        dict: Current device status
    
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
    
    # Get cached device state from WebSocket manager
    device_state = ws_manager.get_device_state(device_id)
    
    # Get latest data from database if not in cache
    if not device_state:
        latest_data = db_client.get_latest_lighting_data(device_id)
        if latest_data:
            device_state = latest_data
    
    return {
        "device_id": device_id,
        "online": ws_manager.is_device_connected(device_id),
        "status": device.get('status'),
        "last_seen": device.get('last_seen'),
        "current_state": device_state,
    }

