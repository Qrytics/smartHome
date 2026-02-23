# System Architecture

This document describes the technical architecture of the Smart Home system, including component interactions, data flows, and design decisions.

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [System Components](#system-components)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Technology Stack](#technology-stack)
5. [Security Architecture](#security-architecture)
6. [Performance Targets](#performance-targets)
7. [Design Decisions](#design-decisions)

## High-Level Overview

The Smart Home system consists of three main layers:

```
┌─────────────────────────────────────────────────────────┐
│                  User Interface Layer                    │
│              (React Dashboard - Port 3000)               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend Services                       │
│   (FastAPI + MQTT/Redis + TimescaleDB - Port 8000)      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Physical Edge Layer                    │
│     ESP32 #1 (Door Control)  │  ESP32 #2 (Sensors)     │
│     - RFID Reader (RC522)    │  - BME280 Sensor        │
│     - Solenoid Lock          │  - OLED Display         │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Event-Driven Design**: Use a message broker (MQTT by default, Redis Streams as an alternative) for asynchronous message processing
2. **API-First**: All device interactions go through REST/WebSocket APIs
3. **Stateless Services**: Backend can be horizontally scaled
4. **Time-Series Optimized**: TimescaleDB for efficient sensor data storage
5. **Mutual TLS**: Secure device authentication using certificates

## System Components

### 1. Frontend (React Dashboard)

**Technology:** React 18 with functional components and hooks

**Key Features:**
- Real-time temperature graph updates via WebSocket
- Access control log display
- RFID policy management (whitelist CRUD)
- System status monitoring

**Components:**
```
src/
├── components/
│   ├── TemperatureGraph.jsx      # Real-time chart (Recharts)
│   ├── AccessLogTable.jsx        # Historical access attempts
│   ├── PolicyManager.jsx         # RFID whitelist management
│   └── SystemStatus.jsx          # Device health indicators
├── services/
│   ├── api.js                    # HTTP client (Axios)
│   └── websocket.js              # WebSocket client
└── hooks/
    ├── useWebSocket.js           # WebSocket connection hook
    └── useSensorData.js          # Sensor data management
```

**State Management:**
- React Context for global state (authentication, WebSocket connection)
- Local component state for UI interactions
- No Redux needed (simple application)

### 2. Backend (FastAPI Services)

**Technology:** Python 3.11 + FastAPI + async/await

**Architecture Pattern:** Layered architecture with separation of concerns

```
app/
├── api/                  # HTTP/WebSocket endpoints
│   ├── access.py         # POST /api/access/check
│   ├── sensors.py        # POST /api/sensors/ingest
│   ├── policies.py       # CRUD for RFID policies
│   ├── websocket.py      # WebSocket /ws connection
│   └── health.py         # GET /health endpoint
├── services/             # Business logic
│   ├── broker.py         # MQTT (default) / Redis (alternative) message broker abstraction
│   ├── db_client.py      # TimescaleDB connection
│   └── auth_service.py   # TLS cert validation
├── models/               # SQLAlchemy ORM models
│   ├── device.py
│   ├── access_log.py
│   ├── sensor_data.py
│   └── policy.py
└── schemas/              # Pydantic validation models
    ├── access.py
    └── sensor.py
```

**Key Services:**

- **Access Control Service**: 
  - Validates RFID card UIDs against whitelist
  - Logs all access attempts (granted/denied)
  - Target: <50ms response time

- **Sensor Ingestion Service**:
  - Receives temperature/humidity data from ESP32
  - Publishes to Redis Stream for async processing
  - Broadcasts to WebSocket clients
  - Target: <100ms acknowledgment

- **Stream Processor** (Background Worker):
  - Consumes events from Redis Streams
  - Persists to TimescaleDB
  - Handles data aggregation
  - Runs independently from API server

### 3. Firmware (ESP32 Microcontrollers)

**Technology:** Arduino framework via PlatformIO

#### ESP32 #1: Door Control

**Purpose:** RFID access control with electromagnetic lock

**Key Libraries:**
- `MFRC522.h` - RFID reader communication
- `WiFiClientSecure.h` - TLS/HTTPS support
- `HTTPClient.h` - HTTP requests
- `ArduinoJson.h` - JSON parsing

**Main Loop:**
```cpp
void loop() {
    // 1. Check for RFID card
    if (rfid.PICC_IsNewCardPresent()) {
        String uid = readCardUID();
        
        // 2. Send authorization request to backend
        bool authorized = checkAccess(uid);
        
        // 3. Actuate lock based on response
        if (authorized) {
            unlockDoor();  // Energize solenoid
            delay(3000);   // Hold open
            lockDoor();    // De-energize
        } else {
            blinkErrorLED();
        }
    }
    
    // 4. Check connection health
    if (WiFi.status() != WL_CONNECTED) {
        reconnectWiFi();
    }
}
```

**Performance Requirements:**
- Card read to lock actuation: <500ms
- TLS handshake (first connection): <200ms
- TLS session resumption: <50ms

#### ESP32 #2: Sensor Monitor

**Purpose:** Environmental monitoring with OLED display

**Key Libraries:**
- `Adafruit_BME280.h` - Temperature/humidity sensor
- `Adafruit_SSD1306.h` - OLED display
- `WebSocketsClient.h` - WebSocket connection

**Main Loop:**
```cpp
void loop() {
    // 1. Read sensor every 1 second
    if (millis() - lastRead >= 1000) {
        float temperature = bme.readTemperature();
        float humidity = bme.readHumidity();
        float pressure = bme.readPressure();
        
        // 2. Update local display
        updateOLED(temperature, humidity);
        
        // 3. Send to backend via WebSocket
        sendSensorData(temperature, humidity, pressure);
        
        lastRead = millis();
    }
    
    // 4. Process WebSocket events
    webSocket.loop();
}
```

**Performance Requirements:**
- Sensor read time: <10ms
- Data transmission: <100ms
- Display update: <50ms

### 4. Data Storage

#### Redis (In-Memory Cache)

**Purpose:** 
- RFID whitelist cache (sub-millisecond lookups)
- Message queue (Redis Streams)
- WebSocket pub/sub

**Data Structures:**
```redis
# RFID whitelist (SET)
SADD rfid:whitelist "04:A3:2B:F2:1C:80"
SISMEMBER rfid:whitelist "04:A3:2B:F2:1C:80"  # O(1) lookup

# Sensor data stream
XADD sensors:data * device sensor-01 temp 23.5 humidity 45.2

# Access log stream
XADD access:logs * device door-01 uid 04:A3... granted true
```

**Configuration:**
- Persistence: AOF (Append-Only File) enabled
- Max memory: 256MB
- Eviction policy: allkeys-lru (if memory full)

#### TimescaleDB (Time-Series Database)

**Purpose:** Long-term storage of sensor data and access logs

**Schema:**
```sql
-- Hypertable for sensor data
CREATE TABLE sensor_readings (
    time        TIMESTAMPTZ NOT NULL,
    device_id   TEXT NOT NULL,
    temperature DOUBLE PRECISION,
    humidity    DOUBLE PRECISION,
    pressure    DOUBLE PRECISION
);

SELECT create_hypertable('sensor_readings', 'time');

-- Regular table for access logs
CREATE TABLE access_logs (
    time        TIMESTAMPTZ NOT NULL,
    device_id   TEXT NOT NULL,
    card_uid    TEXT NOT NULL,
    granted     BOOLEAN NOT NULL,
    latency_ms  INTEGER
);

CREATE INDEX idx_access_logs_time ON access_logs (time DESC);
CREATE INDEX idx_access_logs_card ON access_logs (card_uid);
```

**Query Performance:**
- Recent data (last 24h): <50ms
- Historical aggregation (30 days): <500ms
- Time-based compression: Automatic after 7 days

## Data Flow Diagrams

### Access Control Flow

```
┌─────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│  RFID   │──1──▶ │  ESP32   │──2──▶ │ Backend  │──3──▶ │  Redis   │
│ Reader  │       │  Door    │       │ FastAPI  │       │ Whitelist│
└─────────┘       │ Control  │◀──4───│          │◀──5───│          │
                  └──────────┘       └──────────┘       └──────────┘
                       │
                       │ 6
                       ▼
                  ┌──────────┐
                  │ Solenoid │
                  │   Lock   │
                  └──────────┘

1. Card presented (50ms)
2. HTTPS POST /api/access/check (100ms)
3. Redis SISMEMBER lookup (1ms)
4. Authorization response (50ms)
5. Background: Log to TimescaleDB (async)
6. Actuate lock (100ms)

Total: <300ms (target: <500ms)
```

### Sensor Data Flow

```
┌─────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│ BME280  │──1──▶ │  ESP32   │──2──▶ │ Backend  │──3──▶ │  Redis   │
│ Sensor  │       │  Sensor  │       │ FastAPI  │       │  Stream  │
└─────────┘       │ Monitor  │       └──────────┘       └──────────┘
                  └──────────┘            │                    │
                       │                  │4                   │5
                       │                  ▼                    ▼
                       │             ┌──────────┐       ┌──────────┐
                       │             │WebSocket │       │ Stream   │
                       │             │ Clients  │       │Processor │
                       │             └──────────┘       └──────────┘
                       │                                      │6
                       ▼                                      ▼
                  ┌──────────┐                         ┌──────────┐
                  │   OLED   │                         │TimescaleDB│
                  │ Display  │                         └──────────┘
                  └──────────┘

1. Read sensor (8ms)
2. WebSocket send (50ms)
3. Publish to Redis Stream (1ms)
4. Broadcast to WebSocket clients (10ms)
5. Background worker consumes stream (async)
6. Persist to TimescaleDB (async)

Total acknowledgment: <100ms
Dashboard update: <200ms (including browser render)
```

## Technology Stack

### Justification for Key Technologies

| Component | Technology | Why Chosen | Alternatives Considered |
|-----------|------------|------------|------------------------|
| Frontend Framework | React 18 | Component reusability, large ecosystem | Vue.js, Angular |
| Backend Framework | FastAPI | Native async, auto-docs, type safety | Flask, Django, Node.js |
| Microcontroller | ESP32-S3 | Hardware crypto, dual-core, WiFi | Arduino, Raspberry Pi Pico |
| Message Broker | Redis Streams | Low latency, simple, built-in pub/sub | RabbitMQ, Kafka |
| Time-Series DB | TimescaleDB | SQL interface, automatic compression | InfluxDB, Prometheus |
| Real-Time Graphs | Recharts | React-native, performant | Chart.js, D3.js |

## Security Architecture

### Mutual TLS Authentication

```
ESP32 Client                    Backend Server
     │                                 │
     │──1. ClientHello─────────────────▶│
     │                                 │
     │◀─2. ServerHello + ServerCert────│
     │                                 │
     │──3. Validate ServerCert────────▶│
     │    (against embedded CA)        │
     │                                 │
     │◀─4. Request ClientCert──────────│
     │                                 │
     │──5. ClientCert──────────────────▶│
     │                                 │
     │◀─6. Validate ClientCert─────────│
     │    (against CA + fingerprint)   │
     │                                 │
     │──7. Encrypted Session───────────▶│
     │                                 │
```

**Certificate Hierarchy:**
```
CA (Certificate Authority)
├── Server Certificate (backend.crt)
│   └── Used by: FastAPI server
└── Client Certificates
    ├── door-control.crt (ESP32 #1)
    └── sensor-monitor.crt (ESP32 #2)
```

**Security Properties:**
- **Authentication**: Both parties verify identity
- **Encryption**: All traffic encrypted (AES-256-GCM)
- **Integrity**: Prevents tampering (HMAC)
- **Non-repudiation**: Actions tied to specific devices

### Attack Mitigation

| Attack Vector | Mitigation |
|---------------|------------|
| Man-in-the-Middle | Mutual TLS with certificate pinning |
| Replay Attacks | Timestamp validation (5-second window) |
| DoS | Rate limiting (10 requests/second per device) |
| SQL Injection | Parameterized queries (SQLAlchemy ORM) |
| XSS | React auto-escaping, CSP headers |
| Unauthorized Access | Client certificates, RFID whitelist |

## Performance Targets

### Latency Requirements

| Operation | Target | Acceptable | Current |
|-----------|--------|------------|---------|
| RFID Authorization | <300ms | <500ms | TBD |
| Sensor Data Ingestion | <100ms | <200ms | TBD |
| Dashboard Update | <1000ms | <2000ms | TBD |
| Database Query (24h) | <50ms | <100ms | TBD |
| TLS Handshake | <150ms | <200ms | TBD |

### Throughput Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Sensor Readings | 1 Hz | Temperature updates every second |
| RFID Scans | 10/min | Peak usage (multiple people) |
| WebSocket Clients | 50 concurrent | Dashboard viewers |
| Database Writes | 100/sec | Batch processing via streams |

### Resource Constraints

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| Backend (Raspberry Pi) | <50% | <512MB | N/A |
| Redis | <10% | <256MB | <1GB |
| TimescaleDB | <30% | <1GB | <10GB/year |
| ESP32 #1 | <50% | <200KB | N/A |
| ESP32 #2 | <50% | <150KB | N/A |

## Design Decisions

### Why Event-Driven Architecture?

**Decision:** Use Redis Streams for async message processing

**Rationale:**
- ESP32 gets immediate acknowledgment (no wait for DB write)
- Backend can batch process events (better throughput)
- System naturally handles load spikes (buffering)
- Decouples ingestion from persistence

**Trade-offs:**
- Added complexity (need stream processor worker)
- Eventual consistency (small delay before DB write)
- Redis becomes critical dependency

### Why WebSocket for Sensor Data?

**Decision:** WebSocket instead of HTTP polling

**Rationale:**
- Lower latency (no request overhead)
- Less bandwidth (no HTTP headers on every message)
- Server can push data (no client polling delay)

**Trade-offs:**
- Connection management complexity
- Need reconnection logic
- Load balancing requires sticky sessions

### Why TimescaleDB over InfluxDB?

**Decision:** Use TimescaleDB (PostgreSQL extension)

**Rationale:**
- Familiar SQL interface (easier development)
- Can join time-series with relational data
- Better tooling ecosystem (pgAdmin, Grafana)
- Automatic compression and retention policies

**Trade-offs:**
- Slightly less optimized for time-series vs. InfluxDB
- Higher resource usage

---

## Diagram Placeholders

> **Note:** The following diagrams should be added to `docs/images/` once created:

- `architecture-overview.png` - High-level component diagram
- `access-control-sequence.png` - Detailed sequence diagram
- `sensor-data-flow.png` - Data pipeline visualization
- `network-topology.png` - Physical network layout
- `security-architecture.png` - TLS certificate chain

---

Last updated: 2026-02-09
