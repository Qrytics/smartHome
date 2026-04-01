# Integration Status (Current)

Last updated: 2026-04-01

## 1) Firmware ↔ Backend integration

### Working now
- **Door control firmware** calls backend HTTP endpoint `POST /api/access/check` and handles allow/deny decisions. (`firmware/door-control/src/main.cpp`)
- **Room-node firmware** opens a WebSocket connection to backend `/ws`, sends combined telemetry, and accepts live commands (`dimmer`, `fan`, `relay1..4`, `daylight_harvest`). (`firmware/room-node/src/main.cpp`)
- Backend has matching routes and command wiring for those flows:
  - Device WebSocket endpoint `/ws` and client WebSocket endpoint `/ws/client`. (`backend/app/api/websocket.py`)
  - Lighting control REST endpoints that forward commands to connected devices over WebSocket. (`backend/app/api/lighting.py`)
  - Access control endpoint `POST /api/access/check`. (`backend/app/api/access.py`)

### Partially working / caveats
- `POST /api/sensors/ingest/environmental` and `POST /api/sensors/ingest/room-node` are effectively **fire-and-forget ingest** paths (broker publish; tolerant of broker failure). (`backend/app/api/sensors.py`)
- Some data paths rely on DB-backed device registration (`db_client.get_device`) and will return 404 if expected device IDs are not present in DB seed data. (`backend/app/api/sensors.py`, `backend/app/api/lighting.py`)

## 2) Dashboard ↔ Backend integration

### Working now
- Frontend API service calls backend endpoints for health, sensor history/latest, lighting controls, and access check/logs. (`frontend/src/services/api.js`)
- Frontend opens a resilient WebSocket to `/ws/client` for real-time telemetry updates. (`frontend/src/hooks/useRealtimeFeed.js`)
- Backend broadcasts device telemetry and state updates to frontend clients. (`backend/app/services/websocket_manager.py`)

### Not fully aligned (important)
- Frontend policy-card APIs are configured as `/api/policies/cards`, but backend exposes RFID card management at `/api/access/cards`.
  - Frontend: `getPolicyCards/addPolicyCard/deletePolicyCard` use `/api/policies/cards`. (`frontend/src/services/api.js`)
  - Backend: routes are `/api/access/cards`. (`backend/app/api/access.py`)
- Because of that mismatch, the dashboard intentionally falls back to local mock policy storage for add/remove/list cards during demo if backend call fails. (`frontend/src/contexts/SmartHomeContext.jsx`, `frontend/src/services/mockStore.js`)

## 3) Demo mode implications (no firmware connected)

When you run backend + frontend on RPi5 **without connected ESP32 firmware**:

- **Will work**
  - Dashboard loads and can call backend health/history/access endpoints.
  - Access log and policy-card UI can still be demonstrated via built-in frontend fallback/mock behavior.
  - Lighting widgets can be interacted with in UI (local optimistic updates).

- **Will not be truly live hardware control**
  - Lighting command endpoints return device-offline behavior if no room-node is connected over `/ws`.
  - No real sensor telemetry stream arrives over WebSocket unless a firmware device is connected.
  - Door unlock path is not exercised end-to-end unless door firmware sends `/api/access/check` requests.

## 4) Quick conclusion

- **Firmware-backend integration:** implemented for primary flows (door HTTP auth + room-node WebSocket telemetry/commands), with DB/registration and runtime-device-connectivity caveats.
- **Dashboard-backend integration:** mostly implemented; real-time + control + logs are wired, but **policy card API path mismatch** currently forces fallback mode for card management.
