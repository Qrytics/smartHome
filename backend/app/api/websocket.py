"""
WebSocket Endpoints

Handles WebSocket connections for:
- Device-to-server real-time data streaming
- Client-to-server control commands
- Server-to-client real-time updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json
from app.services import ws_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for ESP32 devices
    
    Devices send sensor data and receive control commands via this endpoint.
    """
    await websocket.accept()
    
    device_id = None
    
    try:
        # First message should contain device_id
        data = await websocket.receive_text()
        message = json.loads(data)
        
        device_id = message.get('device_id')
        
        if not device_id:
            await websocket.send_text(json.dumps({
                'error': 'device_id required in first message'
            }))
            await websocket.close()
            return
        
        # Register device connection
        await ws_manager.connect_device(device_id, websocket)
        
        # Confirm connection
        await websocket.send_text(json.dumps({
            'status': 'connected',
            'device_id': device_id
        }))
        
        # Handle incoming messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Process device message and broadcast to clients
            await ws_manager.handle_device_message(device_id, message)
            
    except WebSocketDisconnect:
        if device_id:
            ws_manager.disconnect_device(device_id)
        print(f"[WS] Device {device_id} disconnected")
    except Exception as e:
        print(f"[WS] Error handling device WebSocket: {e}")
        if device_id:
            ws_manager.disconnect_device(device_id)


@router.websocket("/ws/client")
async def client_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for frontend clients
    
    Clients receive real-time sensor data updates via this endpoint.
    """
    await ws_manager.connect_client(websocket)
    
    try:
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            'status': 'connected',
            'connected_devices': ws_manager.get_connected_devices()
        }))
        
        # Keep connection alive and handle any client messages
        while True:
            # Wait for messages (if client sends any)
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle client commands if needed
            # For now, just echo back
            await websocket.send_text(json.dumps({
                'echo': message
            }))
            
    except WebSocketDisconnect:
        ws_manager.disconnect_client(websocket)
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error handling client WebSocket: {e}")
        ws_manager.disconnect_client(websocket)
