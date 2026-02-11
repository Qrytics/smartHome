"""
WebSocket Manager Service

Manages WebSocket connections for real-time communication with ESP32 devices
and frontend clients.
"""

from typing import Dict, List, Set
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime


class ConnectionManager:
    """
    Manages WebSocket connections for both devices and clients
    """
    
    def __init__(self):
        # Active device connections: {device_id: WebSocket}
        self.device_connections: Dict[str, WebSocket] = {}
        
        # Active client connections (frontend): Set of WebSocket objects
        self.client_connections: Set[WebSocket] = set()
        
        # Device state cache: {device_id: latest_state}
        self.device_state: Dict[str, dict] = {}
    
    async def connect_device(self, device_id: str, websocket: WebSocket):
        """
        Register a device WebSocket connection
        
        Args:
            device_id: Device identifier
            websocket: WebSocket connection
        """
        await websocket.accept()
        self.device_connections[device_id] = websocket
        print(f"[WS] Device connected: {device_id}")
    
    async def connect_client(self, websocket: WebSocket):
        """
        Register a client (frontend) WebSocket connection
        
        Args:
            websocket: WebSocket connection
        """
        await websocket.accept()
        self.client_connections.add(websocket)
        print(f"[WS] Client connected. Total clients: {len(self.client_connections)}")
    
    def disconnect_device(self, device_id: str):
        """
        Remove a device WebSocket connection
        
        Args:
            device_id: Device identifier
        """
        if device_id in self.device_connections:
            del self.device_connections[device_id]
            print(f"[WS] Device disconnected: {device_id}")
    
    def disconnect_client(self, websocket: WebSocket):
        """
        Remove a client WebSocket connection
        
        Args:
            websocket: WebSocket connection
        """
        self.client_connections.discard(websocket)
        print(f"[WS] Client disconnected. Total clients: {len(self.client_connections)}")
    
    async def send_to_device(self, device_id: str, message: dict) -> bool:
        """
        Send a message to a specific device
        
        Args:
            device_id: Device identifier
            message: Message dictionary to send
        
        Returns:
            bool: True if sent successfully, False if device offline
        """
        if device_id not in self.device_connections:
            print(f"[WS] Device {device_id} not connected")
            return False
        
        try:
            websocket = self.device_connections[device_id]
            await websocket.send_text(json.dumps(message))
            print(f"[WS] Sent to {device_id}: {message}")
            return True
        except Exception as e:
            print(f"[WS] Error sending to {device_id}: {e}")
            self.disconnect_device(device_id)
            return False
    
    async def broadcast_to_clients(self, message: dict):
        """
        Broadcast a message to all connected clients
        
        Args:
            message: Message dictionary to broadcast
        """
        if not self.client_connections:
            return
        
        # Add timestamp to message
        message['broadcast_time'] = datetime.utcnow().isoformat()
        
        json_message = json.dumps(message)
        disconnected = set()
        
        for websocket in self.client_connections:
            try:
                await websocket.send_text(json_message)
            except Exception as e:
                print(f"[WS] Error broadcasting to client: {e}")
                disconnected.add(websocket)
        
        # Remove disconnected clients
        for websocket in disconnected:
            self.disconnect_client(websocket)
        
        if self.client_connections:
            print(f"[WS] Broadcasted to {len(self.client_connections)} clients")
    
    async def handle_device_message(self, device_id: str, message: dict):
        """
        Process message from a device and broadcast to clients
        
        Args:
            device_id: Device identifier
            message: Message from device
        """
        # Update device state cache
        self.device_state[device_id] = {
            **message,
            'last_update': datetime.utcnow().isoformat()
        }
        
        # Broadcast to all connected clients
        await self.broadcast_to_clients({
            'type': 'sensor_data',
            'device_id': device_id,
            'data': message
        })
    
    def get_device_state(self, device_id: str) -> dict:
        """
        Get cached state for a device
        
        Args:
            device_id: Device identifier
        
        Returns:
            dict: Device state or empty dict
        """
        return self.device_state.get(device_id, {})
    
    def is_device_connected(self, device_id: str) -> bool:
        """
        Check if a device is currently connected
        
        Args:
            device_id: Device identifier
        
        Returns:
            bool: True if connected
        """
        return device_id in self.device_connections
    
    def get_connected_devices(self) -> List[str]:
        """
        Get list of all connected device IDs
        
        Returns:
            List[str]: List of device IDs
        """
        return list(self.device_connections.keys())
    
    async def send_dimmer_command(self, device_id: str, brightness: int) -> bool:
        """
        Send dimmer brightness command to a device
        
        Args:
            device_id: Device identifier
            brightness: Brightness level (0-100)
        
        Returns:
            bool: True if sent successfully
        """
        command = {
            "command": "dimmer",
            "value": brightness
        }
        return await self.send_to_device(device_id, command)
    
    async def send_relay_command(self, device_id: str, channel: int, state: bool) -> bool:
        """
        Send relay control command to a device
        
        Args:
            device_id: Device identifier
            channel: Relay channel (1-4)
            state: Relay state (True=ON, False=OFF)
        
        Returns:
            bool: True if sent successfully
        """
        command = {
            "command": f"relay{channel}",
            "value": 1 if state else 0
        }
        return await self.send_to_device(device_id, command)
    
    async def send_daylight_harvest_command(self, device_id: str, enabled: bool) -> bool:
        """
        Send daylight harvesting toggle command to a device
        
        Args:
            device_id: Device identifier
            enabled: Enable/disable daylight harvesting
        
        Returns:
            bool: True if sent successfully
        """
        command = {
            "command": "daylight_harvest",
            "value": 1 if enabled else 0
        }
        return await self.send_to_device(device_id, command)


# Global connection manager instance
ws_manager = ConnectionManager()
