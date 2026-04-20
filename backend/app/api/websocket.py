"""
WebSocket Endpoints

Handles WebSocket connections for:
- Device-to-server real-time data streaming
- Client-to-server control commands
- Server-to-client real-time updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
from app.services import ws_manager
from app.config import settings

router = APIRouter()

async def perform_ws_handshake(websocket: WebSocket, role: str):
    nonce, issued_at = ws_manager.issue_challenge()
    await websocket.send_text(json.dumps({
        "type": "ws_challenge",
        "role": role,
        "nonce": nonce,
        "issued_at": issued_at,
        "algo": "hmac-sha256",
    }))

    try:
        data = await asyncio.wait_for(
            websocket.receive_text(),
            timeout=settings.WS_AUTH_CHALLENGE_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        await websocket.send_text(json.dumps({"type": "ws_auth_error", "error": "handshake_timeout"}))
        await websocket.close(code=1008)
        return None

    try:
        message = json.loads(data)
    except json.JSONDecodeError:
        await websocket.send_text(json.dumps({"type": "ws_auth_error", "error": "invalid_json"}))
        await websocket.close(code=1008)
        return None

    if message.get("type") != "ws_auth":
        await websocket.send_text(json.dumps({"type": "ws_auth_error", "error": "auth_required_first"}))
        await websocket.close(code=1008)
        return None

    client_id = str(message.get("id") or "").strip()
    signature = str(message.get("signature") or "")
    request_nonce = str(message.get("nonce") or "")
    request_issued_at = int(message.get("issued_at") or 0)
    request_role = str(message.get("role") or "")

    if request_nonce != nonce:
        await websocket.send_text(json.dumps({"type": "ws_auth_error", "error": "nonce_mismatch"}))
        await websocket.close(code=1008)
        return None

    ok, reason = ws_manager.verify_handshake(
        role=request_role,
        client_id=client_id,
        nonce=request_nonce,
        issued_at=request_issued_at,
        signature=signature,
    )
    if not ok or request_role != role or not client_id:
        await websocket.send_text(json.dumps({"type": "ws_auth_error", "error": reason}))
        await websocket.close(code=1008)
        return None
    return client_id


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for ESP32 devices
    
    Devices send sensor data and receive control commands via this endpoint.
    """
    await websocket.accept()
    device_id = None

    try:
        device_id = await perform_ws_handshake(websocket, role="device")
        if not device_id:
            return

        # Register device connection
        await ws_manager.connect_device(device_id, websocket)

        # Confirm connection
        await websocket.send_text(json.dumps({
            'type': 'ws_authenticated',
            'status': 'connected',
            'device_id': device_id,
        }))

        # Handle incoming messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("type") == "ws_auth":
                # Ignore redundant auth packets after connection is established.
                continue
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
    await websocket.accept()
    client_id = None
    try:
        client_id = await perform_ws_handshake(websocket, role="client")
        if not client_id:
            return

        await ws_manager.connect_client(websocket)

        # Send initial connection confirmation after auth
        await websocket.send_text(json.dumps({
            'type': 'ws_authenticated',
            'status': 'connected',
            'id': client_id,
            'connected_devices': ws_manager.get_connected_devices(),
        }))

        # Keep connection alive and handle any client messages
        while True:
            # Wait for messages (if client sends any)
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("type") == "ws_auth":
                continue
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
