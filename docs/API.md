# API Reference

This document provides comprehensive API documentation for the Smart Home backend services.

## Base URL

```
Production:  https://smarthome.local:8443
Development: http://localhost:8000
```

## Authentication

All device-to-server communication uses **Mutual TLS authentication**. Web dashboard uses session-based authentication (to be implemented).

### TLS Certificate Setup

Devices must present valid client certificates signed by the project CA:

```bash
# Generate client certificate
cd certs
./generate.sh client <device-name>

# Install certificate on ESP32
# Copy generated .crt and .key to firmware/include/
```

## API Endpoints

### Health Check

#### GET /health

Check if the API server is running and healthy.

**Request:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2026-02-09T19:59:04.032Z",
  "services": {
    "redis": "connected",
    "database": "connected"
  }
}
```

**Status Codes:**
- `200 OK` - All services healthy
- `503 Service Unavailable` - One or more services down

---

### Access Control

#### POST /api/access/check

Validate RFID card access authorization.

**Request:**
```bash
curl -X POST http://localhost:8000/api/access/check \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "door-control-01",
    "card_uid": "04:A3:2B:F2:1C:80",
    "timestamp": "2026-02-09T19:59:04.032Z"
  }'
```

**Request Body:**
```json
{
  "device_id": "string",      // Unique device identifier
  "card_uid": "string",       // RFID card UID (colon-separated hex)
  "timestamp": "string"       // ISO 8601 timestamp
}
```

**Response (Authorized):**
```json
{
  "granted": true,
  "card_uid": "04:A3:2B:F2:1C:80",
  "device_id": "door-control-01",
  "user_name": "John Doe",
  "expires_at": null,
  "access_log_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Denied):**
```json
{
  "granted": false,
  "card_uid": "04:A3:2B:F2:1C:80",
  "device_id": "door-control-01",
  "reason": "Card not in whitelist",
  "access_log_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Status Codes:**
- `200 OK` - Authorization checked (see `granted` field)
- `400 Bad Request` - Invalid request format
- `422 Unprocessable Entity` - Validation error

**Performance:**
- Target latency: <50ms
- Rate limit: 10 requests/second per device

---

#### GET /api/access/logs

Retrieve access attempt history.

**Request:**
```bash
curl "http://localhost:8000/api/access/logs?limit=100&offset=0&device_id=door-control-01"
```

**Query Parameters:**
- `limit` (optional): Number of records (default: 50, max: 1000)
- `offset` (optional): Pagination offset (default: 0)
- `device_id` (optional): Filter by device
- `card_uid` (optional): Filter by card
- `granted` (optional): Filter by authorization result (true/false)
- `start_time` (optional): ISO 8601 timestamp (inclusive)
- `end_time` (optional): ISO 8601 timestamp (inclusive)

**Response:**
```json
{
  "total": 1523,
  "limit": 100,
  "offset": 0,
  "logs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2026-02-09T19:59:04.032Z",
      "device_id": "door-control-01",
      "card_uid": "04:A3:2B:F2:1C:80",
      "granted": true,
      "user_name": "John Doe",
      "latency_ms": 42
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "timestamp": "2026-02-09T19:58:32.123Z",
      "device_id": "door-control-01",
      "card_uid": "FF:FF:FF:FF:FF:FF",
      "granted": false,
      "user_name": null,
      "latency_ms": 38
    }
  ]
}
```

---

### Sensor Data

#### POST /api/sensors/ingest

Ingest sensor readings from ESP32 devices.

**Request:**
```bash
curl -X POST http://localhost:8000/api/sensors/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "sensor-monitor-01",
    "timestamp": "2026-02-09T19:59:04.032Z",
    "temperature": 23.5,
    "humidity": 45.2,
    "pressure": 1013.25
  }'
```

**Request Body:**
```json
{
  "device_id": "string",         // Unique device identifier
  "timestamp": "string",         // ISO 8601 timestamp
  "temperature": "number",       // Celsius
  "humidity": "number",          // Percentage (0-100)
  "pressure": "number"           // hPa (optional)
}
```

**Response:**
```json
{
  "status": "accepted",
  "device_id": "sensor-monitor-01",
  "timestamp": "2026-02-09T19:59:04.032Z",
  "message_id": "1707506344032-0"
}
```

**Status Codes:**
- `202 Accepted` - Data queued for processing
- `400 Bad Request` - Invalid request format
- `422 Unprocessable Entity` - Validation error

**Notes:**
- Data is acknowledged immediately and processed asynchronously
- Readings are broadcast to WebSocket clients in real-time
- Historical data is persisted to TimescaleDB

---

#### GET /api/sensors/readings

Retrieve historical sensor data.

**Request:**
```bash
curl "http://localhost:8000/api/sensors/readings?device_id=sensor-monitor-01&start_time=2026-02-09T00:00:00Z&end_time=2026-02-09T23:59:59Z&interval=1m"
```

**Query Parameters:**
- `device_id` (required): Device identifier
- `start_time` (required): ISO 8601 timestamp
- `end_time` (required): ISO 8601 timestamp
- `interval` (optional): Aggregation interval (`1m`, `5m`, `1h`, `1d`) - default: raw data

**Response:**
```json
{
  "device_id": "sensor-monitor-01",
  "start_time": "2026-02-09T00:00:00Z",
  "end_time": "2026-02-09T23:59:59Z",
  "interval": "1m",
  "count": 1440,
  "readings": [
    {
      "timestamp": "2026-02-09T00:00:00Z",
      "temperature_avg": 23.5,
      "temperature_min": 23.2,
      "temperature_max": 23.8,
      "humidity_avg": 45.2,
      "humidity_min": 44.8,
      "humidity_max": 45.6,
      "pressure_avg": 1013.25
    }
  ]
}
```

---

### Policy Management

#### GET /api/policies/cards

List all authorized RFID cards.

**Request:**
```bash
curl http://localhost:8000/api/policies/cards
```

**Response:**
```json
{
  "count": 3,
  "cards": [
    {
      "card_uid": "04:A3:2B:F2:1C:80",
      "user_name": "John Doe",
      "added_at": "2026-01-15T10:30:00Z",
      "expires_at": null,
      "active": true
    },
    {
      "card_uid": "04:B7:3C:E1:2D:91",
      "user_name": "Jane Smith",
      "added_at": "2026-01-20T14:20:00Z",
      "expires_at": "2026-12-31T23:59:59Z",
      "active": true
    }
  ]
}
```

---

#### POST /api/policies/cards

Add a new authorized RFID card.

**Request:**
```bash
curl -X POST http://localhost:8000/api/policies/cards \
  -H "Content-Type: application/json" \
  -d '{
    "card_uid": "04:A3:2B:F2:1C:80",
    "user_name": "John Doe",
    "expires_at": null
  }'
```

**Request Body:**
```json
{
  "card_uid": "string",          // RFID card UID (colon-separated hex)
  "user_name": "string",         // User display name
  "expires_at": "string|null"    // ISO 8601 timestamp or null for no expiry
}
```

**Response:**
```json
{
  "card_uid": "04:A3:2B:F2:1C:80",
  "user_name": "John Doe",
  "added_at": "2026-02-09T19:59:04.032Z",
  "expires_at": null,
  "active": true
}
```

**Status Codes:**
- `201 Created` - Card added successfully
- `409 Conflict` - Card already exists

---

#### DELETE /api/policies/cards/{card_uid}

Remove an authorized RFID card.

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/policies/cards/04:A3:2B:F2:1C:80
```

**Response:**
```json
{
  "status": "deleted",
  "card_uid": "04:A3:2B:F2:1C:80"
}
```

**Status Codes:**
- `200 OK` - Card removed successfully
- `404 Not Found` - Card not found

---

### WebSocket

#### WS /ws

Real-time sensor data streaming.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

**Message Format:**
```json
{
  "type": "sensor_reading",
  "device_id": "sensor-monitor-01",
  "timestamp": "2026-02-09T19:59:04.032Z",
  "data": {
    "temperature": 23.5,
    "humidity": 45.2,
    "pressure": 1013.25
  }
}
```

**Message Types:**
- `sensor_reading` - New sensor data
- `access_event` - Access control event
- `device_status` - Device online/offline
- `system_alert` - System-level notifications

---

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid card UID format",
    "details": {
      "field": "card_uid",
      "expected": "XX:XX:XX:XX:XX:XX",
      "received": "invalid"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Invalid credentials |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency unavailable |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/access/check` | 10 req/s | Per device |
| `/api/sensors/ingest` | 10 req/s | Per device |
| `/api/policies/*` | 60 req/min | Per client IP |
| `/api/sensors/readings` | 30 req/min | Per client IP |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1707506404
```

---

### Lighting Control

#### POST /api/lighting/dimmer/{device_id}

Set LED dimmer brightness for a lighting control device.

**Request:**
```bash
curl -X POST http://localhost:8000/api/lighting/dimmer/lighting-control-01 \
  -H "Content-Type: application/json" \
  -d '{
    "brightness": 75
  }'
```

**Path Parameters:**
- `device_id`: Device identifier (e.g., "lighting-control-01")

**Request Body:**
```json
{
  "brightness": 75  // Brightness level (0-100%)
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Dimmer set to 75%",
  "device_id": "lighting-control-01"
}
```

**Status Codes:**
- `200 OK` - Command sent successfully
- `404 Not Found` - Device not registered
- `503 Service Unavailable` - Device offline
- `422 Unprocessable Entity` - Validation error (brightness out of range)

**Notes:**
- Command is sent via WebSocket to the connected device
- Dimmer brightness change is logged in database
- Disables daylight harvesting mode when manual control is used

---

#### POST /api/lighting/relay/{device_id}

Control relay state for high-power load switching.

**Request:**
```bash
curl -X POST http://localhost:8000/api/lighting/relay/lighting-control-01 \
  -H "Content-Type: application/json" \
  -d '{
    "channel": 1,
    "state": true
  }'
```

**Path Parameters:**
- `device_id`: Device identifier

**Request Body:**
```json
{
  "channel": 1,     // Relay channel (1-4)
  "state": true     // Relay state (true=ON, false=OFF)
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Relay 1 set to ON",
  "device_id": "lighting-control-01"
}
```

**Status Codes:**
- `200 OK` - Command sent successfully
- `404 Not Found` - Device not registered
- `503 Service Unavailable` - Device offline
- `422 Unprocessable Entity` - Validation error (invalid channel)

**Relay Channel Assignments:**
- Channel 1: Main lights
- Channel 2: Secondary lights
- Channel 3: HVAC fan
- Channel 4: Spare

---

#### POST /api/lighting/daylight-harvest/{device_id}

Toggle daylight harvesting mode for automatic brightness adjustment.

**Request:**
```bash
curl -X POST http://localhost:8000/api/lighting/daylight-harvest/lighting-control-01 \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true
  }'
```

**Path Parameters:**
- `device_id`: Device identifier

**Request Body:**
```json
{
  "enabled": true  // Enable/disable daylight harvesting
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Daylight harvesting ENABLED",
  "device_id": "lighting-control-01"
}
```

**Status Codes:**
- `200 OK` - Command sent successfully
- `404 Not Found` - Device not registered
- `503 Service Unavailable` - Device offline

**Notes:**
- When enabled, device automatically adjusts LED brightness based on ambient light
- Target illumination: 300 lux (configurable in firmware)
- Saves energy while maintaining comfortable lighting levels

---

#### GET /api/lighting/status/{device_id}

Get current status of a lighting control device.

**Request:**
```bash
curl http://localhost:8000/api/lighting/status/lighting-control-01
```

**Response:**
```json
{
  "device_id": "lighting-control-01",
  "online": true,
  "status": "online",
  "last_seen": "2026-02-11T16:30:00.000Z",
  "current_state": {
    "light_level": 45.3,
    "light_lux": 453.0,
    "dimmer_brightness": 65,
    "daylight_harvest_mode": true,
    "relays": [false, false, false, false],
    "last_update": "2026-02-11T16:30:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` - Status retrieved successfully
- `404 Not Found` - Device not registered

---

#### POST /api/sensors/ingest/lighting

Ingest lighting sensor data from ESP32 devices.

**Request:**
```bash
curl -X POST http://localhost:8000/api/sensors/ingest/lighting \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "lighting-control-01",
    "timestamp": "2026-02-11T16:00:00.000Z",
    "light_level": 45.3,
    "light_lux": 453.0,
    "dimmer_brightness": 65,
    "daylight_harvest_mode": true,
    "relays": [false, false, false, false]
  }'
```

**Request Body:**
```json
{
  "device_id": "string",              // Unique device identifier
  "timestamp": "string",              // ISO 8601 timestamp
  "light_level": 45.3,                // Ambient light level (0-100%)
  "light_lux": 453.0,                 // Calculated lux value
  "dimmer_brightness": 65,            // Current dimmer setting (0-100%)
  "daylight_harvest_mode": true,      // Daylight harvesting enabled
  "relays": [false, false, false, false]  // Relay states [ch1, ch2, ch3, ch4]
}
```

**Response:**
```json
{
  "status": "accepted",
  "message": "Lighting sensor data processed successfully",
  "device_id": "lighting-control-01",
  "timestamp": "2026-02-11T16:00:00.000Z"
}
```

**Status Codes:**
- `202 Accepted` - Data queued for processing
- `404 Not Found` - Device not registered
- `422 Unprocessable Entity` - Validation error

**Notes:**
- Data is stored in TimescaleDB
- Real-time updates are broadcast to WebSocket clients
- Device status is updated to 'online'

---

#### GET /api/sensors/latest/{device_id}

Get the latest sensor reading for a device.

**Request:**
```bash
curl http://localhost:8000/api/sensors/latest/lighting-control-01
```

**Response:**
```json
{
  "device_id": "lighting-control-01",
  "source": "cache",
  "data": {
    "time": "2026-02-11T16:00:00.000Z",
    "light_level": 45.3,
    "light_lux": 453.0,
    "dimmer_brightness": 65,
    "daylight_harvest_mode": true
  }
}
```

**Status Codes:**
- `200 OK` - Data retrieved successfully
- `404 Not Found` - Device not found or no data available

**Notes:**
- Returns cached data if available (most recent)
- Falls back to database if not in cache

---

#### GET /api/sensors/history/{device_id}

Get historical sensor data for a device.

**Request:**
```bash
curl "http://localhost:8000/api/sensors/history/lighting-control-01?start_time=2026-02-11T00:00:00Z&end_time=2026-02-11T23:59:59Z&limit=100"
```

**Query Parameters:**
- `start_time` (optional): Start timestamp (ISO 8601)
- `end_time` (optional): End timestamp (ISO 8601)
- `limit` (optional): Maximum number of records (default: 100, max: 1000)

**Response:**
```json
{
  "device_id": "lighting-control-01",
  "data": [
    {
      "time": "2026-02-11T16:00:00.000Z",
      "light_level": 45.3,
      "light_lux": 453.0,
      "dimmer_brightness": 65,
      "daylight_harvest_mode": true
    }
  ],
  "total_records": 100,
  "start_time": "2026-02-11T00:00:00Z",
  "end_time": "2026-02-11T23:59:59Z",
  "limit": 100
}
```

**Status Codes:**
- `200 OK` - Data retrieved successfully
- `404 Not Found` - Device not found
- `400 Bad Request` - Invalid timestamp format

---

### WebSocket Endpoints

#### WS /ws

WebSocket endpoint for ESP32 device connections.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

// First message must include device_id
ws.onopen = () => {
  ws.send(JSON.stringify({
    device_id: 'lighting-control-01'
  }));
};

// Receive confirmation
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message); // {status: 'connected', device_id: 'lighting-control-01'}
};

// Send sensor data
ws.send(JSON.stringify({
  device_id: 'lighting-control-01',
  timestamp: '2026-02-11T16:00:00.000Z',
  light_level: 45.3,
  light_lux: 453.0,
  dimmer_brightness: 65,
  daylight_harvest_mode: true,
  relays: [false, false, false, false]
}));

// Receive commands from server
ws.onmessage = (event) => {
  const command = JSON.parse(event.data);
  // {command: 'dimmer', value: 75}
  // {command: 'relay1', value: 1}
  // {command: 'daylight_harvest', value: 1}
};
```

---

#### WS /ws/client

WebSocket endpoint for frontend client connections.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/client');

ws.onopen = () => {
  console.log('Connected to Smart Home');
};

// Receive real-time sensor updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'sensor_data' || message.type === 'lighting_data') {
    console.log(`Update from ${message.device_id}:`, message.data);
  }
};
```

---

## SDK Examples

### Python
```python
import requests

# Check access
response = requests.post(
    "http://localhost:8000/api/access/check",
    json={
        "device_id": "door-control-01",
        "card_uid": "04:A3:2B:F2:1C:80",
        "timestamp": "2026-02-09T19:59:04.032Z"
    }
)
result = response.json()
print(f"Access {'granted' if result['granted'] else 'denied'}")
```

### JavaScript
```javascript
// Add card to whitelist
fetch('http://localhost:8000/api/policies/cards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    card_uid: '04:A3:2B:F2:1C:80',
    user_name: 'John Doe',
    expires_at: null
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### C++ (Arduino/ESP32)
```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

bool checkAccess(String cardUid) {
    HTTPClient http;
    http.begin("http://192.168.1.100:8000/api/access/check");
    http.addHeader("Content-Type", "application/json");
    
    StaticJsonDocument<200> doc;
    doc["device_id"] = "door-control-01";
    doc["card_uid"] = cardUid;
    doc["timestamp"] = getISOTimestamp();
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpCode = http.POST(requestBody);
    
    if (httpCode == 200) {
        String payload = http.getString();
        StaticJsonDocument<300> response;
        deserializeJson(response, payload);
        return response["granted"];
    }
    
    http.end();
    return false;
}
```

---

## Testing

Use the interactive Swagger UI for testing:

```
http://localhost:8000/docs
```

Or ReDoc documentation:

```
http://localhost:8000/redoc
```

---

Last updated: 2026-02-09
