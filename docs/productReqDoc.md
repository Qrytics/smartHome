# Smart Home Model - Product Requirements Document (PRD)

## Project Overview

**Project Name:** Smart Home Model - Web-First Building Management System  
**Team Members:** Mario Belmonte, Cindy Chen  
**Course:** 18-500 Capstone Design  
**Focus Areas:** RFID Door Lock Access Control & Real-Time Temperature Monitoring

---

## Executive Summary

This project demonstrates a fully integrated, web-dependent smart home system focused on two critical building management functions: secure access control via RFID door locks and real-time environmental temperature monitoring. The system architecture prioritizes ultra-low latency (<500ms for access control, <1s for sensor updates) through asynchronous message handling, secure device provisioning, and event-driven design patterns.

**Core Thesis:** How much control can be centralized in a web-based platform before system dependency becomes a critical vulnerability?

---

## Table of Contents

1. [Project Scope & Objectives](#1-project-scope--objectives)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Functional Requirements](#3-functional-requirements)
4. [Technical Requirements](#4-technical-requirements)
5. [Hardware Components & Specifications](#5-hardware-components--specifications)
6. [Software Stack & Architecture](#6-software-stack--architecture)
7. [Implementation Phases](#7-implementation-phases)
8. [Testing & Verification](#8-testing--verification)
9. [Milestones & Timeline](#9-milestones--timeline)
10. [Risk Assessment & Mitigation](#10-risk-assessment--mitigation)
11. [Success Criteria](#11-success-criteria)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. Project Scope & Objectives

### 1.1 Primary Objectives

1. **Demonstrate Web-First Architecture**: Build a physical model house that is entirely dependent on a web-based control system
2. **Achieve Ultra-Low Latency**: Maintain <500ms response time for access control and <1s for environmental monitoring
3. **Implement Secure Device Provisioning**: Establish cryptographically secure handshake protocol between ESP32 devices and backend
4. **Create Centralized Policy System**: Enable real-time permission management through web dashboard
5. **Ensure Comprehensive Data Logging**: Capture 100% of telemetry data with efficient time-series storage and retrieval

### 1.2 In-Scope Features

**Phase 1: Core Infrastructure**
- ESP32-S3 microcontroller setup with WiFi connectivity
- BME280 temperature/humidity/pressure sensor integration
- RFID-RC522 reader and 12V solenoid door lock system
- Basic FastAPI backend gateway
- Redis Streams message broker setup
- TimescaleDB database initialization

**Phase 2: Access Control System**
- RFID tag reading and validation
- Solenoid lock actuation (<500ms latency)
- Secure TLS/SSL handshake between ESP32 and provisioning API
- Permission management via web UI
- Real-time permission revocation (<100ms propagation)

**Phase 3: Environmental Monitoring**
- Real-time temperature data collection
- Dashboard updates within 1 second of sensor readings
- Historical data visualization (24-hour query in <2s)
- 100% data point logging to TimescaleDB

**Phase 4: Integration & Polish**
- WebSocket-based real-time dashboard updates
- SSD1306 OLED display showing system status
- Fail-safe offline state detection (>5s Redis loss)
- React-based web dashboard with policy management UI

### 1.3 Out-of-Scope (Deferred Features)

- CO2 sensing (SCD40 sensor)
- Ambient light control (TEMT6000 sensor)
- Power monitoring (INA226 sensor)
- Occupancy detection (HC-SR501 PIR sensor)
- HVAC control (fans, dampers, relays)
- Light dimming systems
- Multi-zone climate control
- Machine learning forecasting
- Mobile application
- Cloud deployment (local Raspberry Pi only)

### 1.4 Target Users

- **Primary:** Building managers requiring centralized control interface
- **Secondary:** Security personnel needing real-time access monitoring
- **Demonstration:** Evaluators assessing web-first building automation feasibility

---

## 2. System Architecture Overview

### 2.2 Data Flow Diagrams

#### Access Control Flow
User swipes RFID card
ESP32 reads UID → timestamp T1
ESP32 publishes event to Redis Stream (via FastAPI)
FastAPI acknowledges immediately (async)
Backend worker validates UID against permissions DB
Decision published to Redis Stream
ESP32 subscribes to decision → timestamp T2
Solenoid actuates (grant/deny)
Total latency = T2 - T1 < 500ms
Code

#### Temperature Monitoring Flow
BME280 reads temperature (every 1s)
ESP32 publishes reading to Redis Stream
Backend worker stores in TimescaleDB
WebSocket pushes update to connected dashboards
React dashboard updates graph within 1s
Code

## 3. Functional Requirements

### 3.1 Access Control System

#### FR-AC-001: RFID Card Reading
- **Description:** System shall read RFID card UIDs using RC522 module
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Detects card within 5cm range
  - Reads UID within 50ms of card detection
  - Supports ISO 14443A cards (MIFARE Classic, MIFARE Ultralight)
  - Handles multiple rapid swipes without deadlock

#### FR-AC-002: Door Lock Actuation
- **Description:** System shall actuate 12V solenoid lock based on authorization
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Lock engages within 500ms of valid RFID read
  - Lock remains engaged for configurable duration (default 3s)
  - Lock state visible on OLED display
  - Failsafe: lock defaults to engaged on power loss

#### FR-AC-003: Permission Validation
- **Description:** Backend shall validate RFID UIDs against permission database
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Query response time <100ms
  - Supports whitelist/blacklist logic
  - Logs all access attempts (granted/denied)
  - Thread-safe concurrent access handling

#### FR-AC-004: Real-Time Permission Revocation
- **Description:** Admins can revoke access via web UI with <100ms propagation
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - UI provides instant feedback on revocation
  - Next swipe attempt denied within 100ms
  - Revocation event logged with timestamp
  - No cached credentials on ESP32

#### FR-AC-005: Access Audit Logging
- **Description:** System logs 100% of RFID swipe events
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Timestamp, UID, result (grant/deny) logged
  - No data loss during peak load (50 events/min)
  - Logs queryable via web dashboard
  - 90-day retention period

### 3.2 Environmental Monitoring

#### FR-EM-001: Temperature Data Collection
- **Description:** System collects temperature readings from BME280 every 1 second
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Sampling rate: 1 Hz (1 sample/second)
  - Accuracy: ±0.5°C (sensor spec)
  - I2C communication error handling
  - Automatic sensor recovery on fault

#### FR-EM-002: Real-Time Dashboard Updates
- **Description:** Web dashboard displays temperature within 1s of sensor reading
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - WebSocket push latency <200ms
  - Graph updates without page reload
  - Handles 10+ concurrent dashboard viewers
  - Graceful degradation on connection loss

#### FR-EM-003: Historical Data Storage
- **Description:** 100% of temperature readings stored in TimescaleDB
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Zero data loss during normal operation
  - Timestamps in UTC with millisecond precision
  - Automatic data compression (TimescaleDB hypertables)
  - 30-day retention minimum

#### FR-EM-004: Historical Data Query
- **Description:** Retrieve 24-hour temperature history in <2 seconds
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Query execution time <2s for 86,400 data points
  - Results include min/max/avg aggregations
  - Support for custom time range selection
  - CSV export capability

#### FR-EM-005: Multi-Sensor Support (Future)
- **Description:** System extensible for humidity and pressure data
- **Priority:** P2 (Nice-to-have)
- **Acceptance Criteria:**
  - Same data pipeline as temperature
  - Multi-line graph visualization
  - Independent query performance

### 3.3 System Management

#### FR-SM-001: Secure Device Provisioning
- **Description:** ESP32 devices authenticate via TLS/SSL handshake
- **Priority:** P0 (Critical)
- **Acceptance Criteria:**
  - Certificate exchange <200ms overhead
  - Mutual TLS authentication (client + server certs)
  - Certificate rotation capability
  - Reject connections from unknown devices

#### FR-SM-002: Offline State Detection
- **Description:** ESP32 detects Redis connection loss and enters failsafe mode
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Detection within 5 seconds of connection loss
  - OLED displays "System Offline" message
  - Lock defaults to secure state (engaged)
  - Automatic reconnection attempts every 10s

#### FR-SM-003: System Status Display
- **Description:** OLED shows real-time system state on physical model
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Displays IP address when online
  - Shows current security policy name
  - Indicates WiFi signal strength
  - Updates on state changes (online/offline)

#### FR-SM-004: Web Dashboard Authentication
- **Description:** Dashboard requires login for policy management
- **Priority:** P1 (High)
- **Acceptance Criteria:**
  - Basic HTTP authentication (demo-grade)
  - Session timeout after 30 minutes
  - Read-only view for unauthenticated users
  - Admin role for policy changes

---

## 4. Technical Requirements

### 4.1 Performance Requirements

#### TR-PERF-001: Access Control Latency
- **Metric:** End-to-end RFID swipe to lock actuation
- **Target:** <500ms for 95th percentile
- **Measurement:** 
  - ESP32 timestamps T1 (card read) and T2 (actuation signal received)
  - Python script aggregates 100 test swipes
  - Statistical analysis: median, 95th percentile, max
- **Acceptance:** 95% of swipes complete within 500ms

#### TR-PERF-002: Dashboard Update Latency
- **Metric:** Sensor reading to graph update
- **Target:** <1 second end-to-end
- **Measurement:**
  - ESP32 embeds timestamp in payload
  - Frontend logs WebSocket receipt timestamp
  - 50-sample average over heat source test
- **Acceptance:** Average latency <1000ms

#### TR-PERF-003: Historical Query Performance
- **Metric:** 24-hour data retrieval and rendering
- **Target:** <2 seconds for query execution
- **Measurement:**
  - PostgreSQL EXPLAIN ANALYZE on Raspberry Pi
  - Measure with 100,000 dummy data points (1 week)
  - Include network transfer time to browser
- **Acceptance:** Total time <2000ms

#### TR-PERF-004: Permission Revocation Latency
- **Metric:** UI revoke action to lock denial
- **Target:** <100ms propagation time
- **Measurement:**
  - FastAPI logs request receipt and Redis publish timestamps
  - ESP32 logs Redis subscription timestamp
  - Immediate swipe test after revocation
- **Acceptance:** Denial within 100ms of revocation

#### TR-PERF-005: Concurrent Load Handling
- **Metric:** System stability under simulated sensor load
- **Target:** Handle 50 virtual sensors at 10Hz without data loss
- **Measurement:**
  - Laptop script sends 500 messages/second
  - Compare TimescaleDB INSERT count vs sent count
  - Monitor Redis queue depth and CPU usage
- **Acceptance:** Zero message loss, <10% CPU overhead

### 4.2 Reliability Requirements

#### TR-REL-001: Data Integrity
- **Description:** No data loss during normal operation
- **Target:** 100% capture rate for sensor readings and access logs
- **Mitigation:**
  - Redis persistence (AOF + RDB snapshots)
  - TimescaleDB ACID transactions
  - ESP32 retry logic for failed publishes (max 3 attempts)

#### TR-REL-002: System Uptime
- **Description:** Backend services available during demo
- **Target:** 99.9% uptime (excluding planned maintenance)
- **Mitigation:**
  - Systemd service auto-restart on crash
  - Watchdog timers on ESP32 (reset on freeze)
  - Health check endpoints (GET /health)

#### TR-REL-003: Network Resilience
- **Description:** Graceful handling of WiFi disconnections
- **Target:** Auto-reconnect within 30 seconds
- **Mitigation:**
  - ESP32 WiFi reconnection logic
  - Exponential backoff for retry attempts
  - Local buffering of critical events (last 10 readings)

#### TR-REL-004: Database Corruption Prevention
- **Description:** Protect against power loss during writes
- **Target:** Zero corrupted records
- **Mitigation:**
  - TimescaleDB write-ahead logging (WAL)
  - UPS backup for Raspberry Pi (optional)
  - Daily database backups via cron job

### 4.3 Security Requirements

#### TR-SEC-001: Device Authentication
- **Description:** Only authorized ESP32 devices can connect
- **Target:** Reject 100% of unsigned connection attempts
- **Implementation:**
  - TLS 1.2+ with client certificates
  - Certificate whitelist in provisioning API
  - Automated cert rotation every 90 days

#### TR-SEC-002: Data Encryption in Transit
- **Description:** All ESP32-to-backend communication encrypted
- **Target:** TLS encryption for 100% of network traffic
- **Implementation:**
  - HTTPS for REST API calls
  - WSS (WebSocket Secure) for dashboard
  - Self-signed CA for local network (demo)

#### TR-SEC-003: SQL Injection Prevention
- **Description:** Protect TimescaleDB from malicious queries
- **Target:** Zero successful injection attacks
- **Implementation:**
  - Parameterized queries (SQLAlchemy ORM)
  - Input validation on all API endpoints
  - Least-privilege database user accounts

#### TR-SEC-004: Access Control Policy Enforcement
- **Description:** Unauthorized users cannot modify permissions
- **Target:** 100% authorization check coverage
- **Implementation:**
  - Role-based access control (RBAC) in FastAPI
  - Admin-only endpoints for policy changes
  - Audit logging of all permission modifications

### 4.4 Scalability Requirements

#### TR-SCALE-001: Horizontal Sensor Scaling
- **Description:** Architecture supports adding sensors without code changes
- **Target:** 10+ ESP32 devices on single Raspberry Pi
- **Implementation:**
  - Device registry in database
  - Topic-based Redis Streams (device/{id}/events)
  - Load testing with simulated devices

#### TR-SCALE-002: Dashboard Concurrent Users
- **Description:** Support multiple simultaneous dashboard viewers
- **Target:** 10 WebSocket connections without degradation
- **Implementation:**
  - Async WebSocket handling (FastAPI)
  - Connection pooling for database queries
  - Rate limiting (10 requests/second per client)

#### TR-SCALE-003: Historical Data Growth
- **Description:** Efficient storage as data accumulates
- **Target:** <10GB for 90 days of 1Hz sensor data
- **Implementation:**
  - TimescaleDB compression (50%+ reduction)
  - Automated chunk management (1-day chunks)
  - Data retention policies (auto-delete >90 days)

### 4.5 Maintainability Requirements

#### TR-MAINT-001: Code Documentation
- **Description:** All critical functions documented
- **Target:** 100% docstring coverage for public APIs
- **Implementation:**
  - Python: Google-style docstrings
  - C++: Doxygen comments for ESP32 code
  - README.md in each repository folder

#### TR-MAINT-002: Configuration Management
- **Description:** Environment-specific settings externalized
- **Target:** Zero hardcoded credentials in source code
- **Implementation:**
  - .env files for secrets (gitignored)
  - YAML config files for device parameters
  - Example configs (.env.example) in repo

#### TR-MAINT-003: Logging and Debugging
- **Description:** Sufficient logs for troubleshooting
- **Target:** Debug any issue within 10 minutes using logs
- **Implementation:**
  - Structured logging (JSON format)
  - Log levels: DEBUG, INFO, WARNING, ERROR
  - Centralized log aggregation (Raspberry Pi)

#### TR-MAINT-004: Automated Testing
- **Description:** Regression test coverage for critical paths
- **Target:** 70%+ code coverage on backend
- **Implementation:**
  - Pytest for Python backend
  - Mock Redis/DB for unit tests
  - Integration tests for end-to-end flows

---

## 5. Hardware Components & Specifications

### 5.1 Microcontroller Unit

#### ESP32-S3-DevKitC-1 (Quantity: 2)

**Specifications:**
- **CPU:** Dual-core Xtensa LX7, 240 MHz
- **RAM:** 512 KB SRAM
- **Flash:** 8 MB (recommend 16 MB variant)
- **WiFi:** 802.11 b/g/n (2.4 GHz only)
- **Bluetooth:** BLE 5.0
- **GPIO:** 45 programmable pins
- **Peripherals:** I2C, SPI, UART, ADC, PWM
- **Security:** Hardware crypto acceleration (AES, SHA, RSA)
- **USB:** Native USB-OTG (no UART bridge needed)
- **Voltage:** 3.3V logic, 5V USB power input

**Rationale:**
- S3 variant chosen for native USB debugging
- Hardware crypto essential for <200ms TLS handshake
- Dual-core allows multitasking (WiFi + sensor sampling)
- 2.4GHz WiFi has better wall penetration than 5GHz

**Pinout Allocation - ESP32 #1 (Door Control):**
| Component        | Pin(s)           | Protocol |
|------------------|------------------|----------|
| RFID-RC522 SDA   | GPIO 10          | SPI      |
| RFID-RC522 SCK   | GPIO 12          | SPI      |
| RFID-RC522 MOSI  | GPIO 11          | SPI      |
| RFID-RC522 MISO  | GPIO 13          | SPI      |
| RFID-RC522 RST   | GPIO 9           | GPIO     |
| Solenoid Relay   | GPIO 4           | GPIO     |
| Status LED       | GPIO 2 (built-in)| GPIO     |

**Pinout Allocation - ESP32 #2 (Sensors):**
| Component        | Pin(s)           | Protocol |
|------------------|------------------|----------|
| BME280 SDA       | GPIO 21          | I2C      |
| BME280 SCL       | GPIO 22          | I2C      |
| OLED SSD1306 SDA | GPIO 21 (shared) | I2C      |
| OLED SSD1306 SCL | GPIO 22 (shared) | I2C      |
| Status LED       | GPIO 2 (built-in)| GPIO     |

**Power Budget:**
- ESP32-S3 idle: ~40mA
- ESP32-S3 active WiFi: ~160mA
- Worst case per board: 200mA @ 5V = 1W
- Total: 2W for both ESP32s

### 5.2 Sensors

#### BME280 Digital Temperature/Humidity/Pressure Sensor

**Specifications:**
- **Temperature Range:** -40°C to +85°C
- **Temperature Accuracy:** ±0.5°C (0°C to 65°C)
- **Temperature Resolution:** 0.01°C
- **Humidity Range:** 0% to 100% RH
- **Humidity Accuracy:** ±3% RH (20% to 80% RH)
- **Pressure Range:** 300 hPa to 1100 hPa
- **Pressure Accuracy:** ±1 hPa
- **Interface:** I2C (address 0x76 or 0x77)
- **Voltage:** 3.3V logic
- **Current Consumption:** 3.6 µA @ 1Hz sampling

**Rationale:**
- I2C allows sharing bus with OLED display
- Single sensor provides 3 environmental metrics
- Low power consumption enables always-on sampling
- Standard library support (Adafruit BME280)

**Data Sheet Notes:**
- I2C clock speed: 100 kHz standard mode (up to 400 kHz fast mode)
- Recommended pull-up resistors: 4.7kΩ on SDA/SCL lines
- Reading time: ~8ms for full temp/humidity/pressure read

**Power Budget:**
- Continuous operation: 3.6 µA negligible

### 5.3 Access Control Hardware

#### RFID-RC522 13.56MHz Reader Module

**Specifications:**
- **Frequency:** 13.56 MHz (ISO 14443A)
- **Supported Cards:** MIFARE Classic, MIFARE Ultralight, NTAG
- **Read Range:** 0-5 cm (depends on antenna and card size)
- **Interface:** SPI (up to 10 Mbps)
- **Voltage:** 3.3V logic and power
- **Current Consumption:** 13-26mA (idle), 80mA (peak during read)

**Rationale:**
- Low-cost, widely available, well-documented
- SPI interface faster than I2C for frequent reads
- Compatible with standard contactless cards

**Library:** MFRC522 Arduino library (PlatformIO compatible)

**Wiring Notes:**
- Requires 3.3V power (not 5V tolerant)
- SPI pins shared with built-in flash on ESP32 require careful pin selection

**Power Budget:**
- Average: ~30mA @ 3.3V = 0.1W

#### 12V DC Solenoid Door Lock (Electric Bolt Lock)

**Specifications:**
- **Voltage:** 12V DC
- **Current:** 500mA inrush, 200mA holding
- **Force:** 10kg holding force
- **Actuation Time:** <100ms
- **Duty Cycle:** 100% (can remain energized indefinitely)
- **Lock Type:** Fail-secure (locked when de-energized)

**Control Circuit:**
- **Relay Module:** 1-channel 5V relay with optocoupler isolation
- **Relay Coil:** 5V, 70mA
- **Relay Contacts:** 10A @ 250VAC (vastly exceeds 12V 0.5A requirement)
- **Transistor Driver:** NPN (2N2222) or integrated on relay module

**Safety Features:**
- Flyback diode across solenoid coil (prevent voltage spikes)
- Optocoupler isolation protects ESP32 from electrical noise

**Wiring:**
ESP32 GPIO 4 → Relay IN pin (3.3V logic HIGH = solenoid ON) Relay COM → 12V power supply (+) Relay NO (Normally Open) → Solenoid (+) Solenoid (-) → 12V power supply GND ESP32 GND → Power supply GND (common ground)


**Power Budget:**
- Solenoid holding: 200mA @ 12V = 2.4W
- Relay coil: 70mA @ 5V = 0.35W

### 5.4 Display

#### SSD1306 128x64 OLED Display (0.96 inch)

**Specifications:**
- **Resolution:** 128x64 pixels (monochrome)
- **Interface:** I2C (address 0x3C or 0x3D)
- **Voltage:** 3.3V or 5V logic (most modules have voltage regulator)
- **Current Consumption:** 20mA (all pixels on), <10mA (typical usage)
- **Viewing Angle:** >160° (OLED advantage)

**Display Content:**
- Line 1: System status ("ONLINE" / "OFFLINE")
- Line 2: IP address (e.g., "192.168.1.100")
- Line 3: Current policy ("Default Policy")
- Line 4: WiFi signal strength (e.g., "-65 dBm")

**Library:** Adafruit SSD1306 + Adafruit GFX (PlatformIO)

**Power Budget:**
- Average: 10mA @ 3.3V = 0.033W

### 5.5 Power Supply System

#### Power Requirements Summary

| Component                  | Voltage | Current (mA) | Power (W) |
|----------------------------|---------|--------------|-----------|
| ESP32 #1 (Door)            | 5V      | 200          | 1.0       |
| ESP32 #2 (Sensors)         | 5V      | 200          | 1.0       |
| RFID-RC522                 | 3.3V    | 30           | 0.1       |
| BME280                     | 3.3V    | <1           | ~0        |
| SSD1306 OLED               | 3.3V    | 10           | 0.033     |
| Solenoid Lock              | 12V     | 200 (hold)   | 2.4       |
| Relay Module               | 5V      | 70           | 0.35      |
| **TOTAL (lock engaged)**   |         |              | **4.88W** |
| **TOTAL (lock idle)**      |         |              | **2.48W** |

**Power Supply Components:**

1. **12V 2A DC Power Adapter (Wall Wart)**
   - Input: 120VAC (US standard)
   - Output: 12V DC, 2A (24W capacity)
   - Connector: 2.1mm barrel jack

2. **LM2596 Buck Converter Module (x2)**
   - **Buck #1:** 12V → 5V @ 2A (for ESP32s and relay)
   - **Buck #2:** 5V → 3.3V @ 1A (for RFID, OLED, BME280)
   - Efficiency: ~85% (better than linear regulators)


**Safety Considerations:**
- Add 1A fuse on 12V line (protects against short circuit)
- Decoupling capacitors on each power rail (100µF + 0.1µF)
- Twisted pair wiring for 12V solenoid (reduce EMI)

### 5.6 Physical Model Construction

**Materials:**
- Cardboard or 1/4" plywood for walls (12"x12"x12" model house)
- Hot glue gun / wood glue for assembly
- Acrylic sheet for "door" (3"x5" panel)
- 3D-printed mounts for ESP32, RFID reader, OLED (optional)
- Velcro strips for repositionable components

**Assembly Notes:**
- Mount RFID reader near door cutout (exterior side)
- Solenoid lock installed on door frame (interior side)
- OLED display visible on front wall
- ESP32s secured inside with ventilation holes
- Cable management: route wires through channels to avoid clutter

---

## 6. Software Stack & Architecture

### 6.1 Embedded Firmware (ESP32)

#### Development Environment
- **IDE:** PlatformIO (VS Code extension)
- **Framework:** Arduino (easier libraries) or ESP-IDF (more control)
- **Language:** C++11
- **Build System:** PlatformIO's native toolchain
- **Version Control:** Git (GitHub repository)

#### Core Libraries

**ESP32 #1 (Door Control):**
| Library            | Purpose                          | Version   |
|--------------------|----------------------------------|-----------|
| MFRC522            | RFID reader communication        | ^1.4.10   |
| WiFi (ESP32)       | Network connectivity             | Built-in  |
| HTTPClient         | REST API calls                   | Built-in  |
| ArduinoJson        | JSON parsing/serialization       | ^6.21.0   |
| PubSubClient       | MQTT (alternative to custom TCP) | ^2.8.0    |

**ESP32 #2 (Sensors):**
| Library            | Purpose                          | Version   |
|--------------------|----------------------------------|-----------|
| Adafruit BME280    | Temperature sensor driver        | ^2.2.2    |
| Adafruit SSD1306   | OLED display driver              | ^2.5.7    |
| Adafruit GFX       | Graphics primitives              | ^1.11.3   |
| WiFi (ESP32)       | Network connectivity             | Built-in  |
| ArduinoJson        | JSON serialization               | ^6.21.0   |
| WebSockets         | WebSocket client (for real-time) | ^2.3.7    |

#### Firmware Architecture (ESP32 #1 - Door)

**Main Loop Structure:**

6.2 Backend Services (Raspberry Pi)
Technology Stack
Core Framework:

FastAPI (Python 3.10+)
Async/await support for concurrent requests
Automatic OpenAPI documentation (Swagger UI)
WebSocket support built-in
Pydantic for data validation
Data Storage:

Redis (v7.0+)
In-memory message broker (Redis Streams)
Pub/Sub for real-time events
Persistence: AOF (Append-Only File) + RDB snapshots
TimescaleDB (PostgreSQL 14 + TimescaleDB extension)
Hypertables for automatic partitioning
Continuous aggregates for pre-computed stats
Native SQL compatibility
Supporting Libraries:

Library	Purpose	Version
uvicorn	ASGI server (runs FastAPI)	^0.24.0
redis-py	Redis client	^5.0.0
psycopg2-binary	PostgreSQL driver	^2.9.9
sqlalchemy	ORM for database queries	^2.0.0
python-jose	JWT token handling	^3.3.0
cryptography	TLS certificate management	^41.0.0
pytest	Testing framework	^7.4.0
python-dotenv	Environment variable loading	^1.0.0
Project Structure

    smartHome/
    ├── .github/
    │ ├── workflows/
    │ │ ├── esp32-build.yml # CI for firmware compilation
    │ │ ├── backend-tests.yml # Python unit tests
    │ │ └── frontend-build.yml # React build/deploy
    │ └── ISSUE_TEMPLATE/
    │ ├── bug_report.md
    │ └── feature_request.md
    │
    ├── docs/
    │ ├── productReqDoc.md # Comprehensive PRD
    │ ├── projectDescription.md # Detailed project overview
    │ ├── SETUP.md # Installation guide
    │ ├── USER_GUIDE.md # End-user documentation
    │ ├── API.md # API reference
    │ ├── ARCHITECTURE.md # System design details
    │ ├── TESTING.md # Testing procedures
    │ └── images/
    │ ├── architecture-diagram.png
    │ ├── hardware-assembly.jpg
    │ └── dashboard-screenshot.png
    │
    ├── firmware/ # ESP32 embedded code
    │ ├── door-control/ # ESP32 #1: RFID + Lock
    │ │ ├── platformio.ini
    │ │ ├── src/
    │ │ │ ├── main.cpp
    │ │ │ ├── rfid_handler.cpp
    │ │ │ ├── rfid_handler.h
    │ │ │ ├── wifi_manager.cpp
    │ │ │ ├── wifi_manager.h
    │ │ │ ├── api_client.cpp
    │ │ │ ├── api_client.h
    │ │ │ └── config.h
    │ │ ├── include/
    │ │ │ └── secrets.h.example # WiFi credentials template
    │ │ ├── test/
    │ │ │ └── test_rfid.cpp
    │ │ └── README.md
    │ │
    │ └── sensor-monitor/ # ESP32 #2: BME280 + OLED
    │ ├── platformio.ini
    │ ├── src/
    │ │ ├── main.cpp
    │ │ ├── sensor_handler.cpp
    │ │ ├── sensor_handler.h
    │ │ ├── display_manager.cpp
    │ │ ├── display_manager.h
    │ │ ├── websocket_client.cpp
    │ │ ├── websocket_client.h
    │ │ └── config.h
    │ ├── include/
    │ │ └── secrets.h.example
    │ └── README.md
    │
    ├── backend/ # Python FastAPI server
    │ ├── app/
    │ │ ├── init.py
    │ │ ├── main.py # FastAPI entry point
    │ │ ├── config.py # Environment variables
    │ │ │
    │ │ ├── api/ # HTTP / WebSocket endpoints
    │ │ │ ├── init.py
    │ │ │ ├── access.py # POST /api/access/check
    │ │ │ ├── sensors.py # POST /api/sensors/ingest
    │ │ │ ├── policies.py # RFID whitelist CRUD
    │ │ │ ├── websocket.py # WebSocket handler
    │ │ │ └── health.py # GET /health
    │ │ │
    │ │ ├── models/ # SQLAlchemy models
    │ │ │ ├── init.py
    │ │ │ ├── device.py
    │ │ │ ├── access_log.py
    │ │ │ ├── sensor_data.py
    │ │ │ └── policy.py
    │ │ │
    │ │ ├── services/ # Business logic
    │ │ │ ├── init.py
    │ │ │ ├── redis_client.py
    │ │ │ ├── db_client.py
    │ │ │ ├── auth_service.py # TLS cert validation
    │ │ │ └── stream_processor.py # Background worker
    │ │ │
    │ │ ├── schemas/ # Pydantic models
    │ │ │ ├── init.py
    │ │ │ ├── access.py
    │ │ │ └── sensor.py
    │ │ │
    │ │ └── utils/
    │ │ ├── init.py
    │ │ ├── logger.py
    │ │ └── crypto.py
    │ │
    │ ├── tests/
    │ │ ├── init.py
    │ │ ├── conftest.py
    │ │ ├── test_access_api.py
    │ │ ├── test_sensor_api.py
    │ │ └── test_stream_processor.py
    │ │
    │ ├── alembic/
    │ │ ├── versions/
    │ │ ├── env.py
    │ │ └── alembic.ini
    │ │
    │ ├── scripts/
    │ │ ├── init_db.py
    │ │ ├── generate_certs.sh
    │ │ └── stress_test.py
    │ │
    │ ├── requirements.txt
    │ ├── requirements-dev.txt
    │ ├── .env.example
    │ ├── Dockerfile
    │ └── README.md
    │
    ├── frontend/ # React dashboard
    │ ├── public/
    │ │ ├── index.html
    │ │ ├── favicon.ico
    │ │ └── manifest.json
    │ │
    │ ├── src/
    │ │ ├── components/
    │ │ │ ├── TemperatureGraph.jsx
    │ │ │ ├── AccessLogTable.jsx
    │ │ │ ├── PolicyManager.jsx
    │ │ │ ├── SystemStatus.jsx
    │ │ │ └── Header.jsx
    │ │ │
    │ │ ├── services/
    │ │ │ ├── api.js
    │ │ │ └── websocket.js
    │ │ │
    │ │ ├── contexts/
    │ │ │ └── AuthContext.js
    │ │ │
    │ │ ├── hooks/
    │ │ │ ├── useWebSocket.js
    │ │ │ └── useSensorData.js
    │ │ │
    │ │ ├── pages/
    │ │ │ ├── Dashboard.jsx
    │ │ │ ├── AccessControl.jsx
    │ │ │ ├── Analytics.jsx
    │ │ │ └── Settings.jsx
    │ │ │
    │ │ ├── App.jsx
    │ │ ├── App.css
    │ │ ├── index.js
    │ │ └── index.css
    │ │
    │ ├── package.json
    │ ├── package-lock.json
    │ ├── .env.example
    │ └── README.md
    │
    ├── infrastructure/ # Deployment configs
    │ ├── docker-compose.yml
    │ ├── docker-compose.dev.yml
    │ ├── docker-compose.prod.yml
    │ │
    │ ├── redis/
    │ │ └── redis.conf
    │ │
    │ ├── timescaledb/
    │ │ ├── init.sql
    │ │ └── seed.sql
    │ │
    │ ├── nginx/
    │ │ ├── nginx.conf
    │ │ └── Dockerfile
    │ │
    │ └── systemd/
    │ ├── smarthome-backend.service
    │ └── smarthome-frontend.service
    │
    ├── certs/ # TLS certificates (gitignored)
    │ ├── .gitkeep
    │ ├── README.md
    │ ├── ca.crt.example
    │ └── generate.sh
    │
    ├── hardware/ # Physical build resources
    │ ├── schematics/
    │ │ ├── door-control.fzz
    │ │ ├── sensor-module.fzz
    │ │ └── power-supply.fzz
    │ │
    │ ├── 3d-models/
    │ │ ├── esp32-mount.stl
    │ │ ├── sensor-enclosure.stl
    │ │ └── oled-holder.stl
    │ │
    │ ├── bom.csv
    │ └── assembly-guide.pdf
    │
    ├── scripts/ # Top-level utilities
    │ ├── setup-dev-env.sh
    │ ├── run-tests.sh
    │ ├── deploy.sh
    │ └── backup-database.sh
    │
    ├── .gitignore
    ├── .gitattributes
    ├── .editorconfig
    ├── LICENSE
    ├── README.md
    ├── CONTRIBUTING.md
    └── CHANGELOG.md

6.3 Database Schema (TimescaleDB)
TimescaleDB Setup

6.4 Frontend Dashboard (React)
Technology Stack
Framework: React 18 (Create React App or Vite)
UI Library: Material-UI (MUI) or Ant Design
Charts: Recharts or Chart.js
WebSocket: native WebSocket API
HTTP Client: Axios
State Management: React Context API (simple) or Redux (complex)

7. Implementation Phases
Phase 1: Foundation Setup (Week 1-2)
1.1 Development Environment Setup
Tasks:

 Install PlatformIO IDE (VS Code extension)
 Configure ESP32-S3 board definitions in PlatformIO
 Set up Git repository (GitHub/GitLab)
.gitignore for secrets, build artifacts
README.md with project description
 Install Python 3.10+ on Raspberry Pi
 Set up virtual environment (python -m venv venv)
 Install Docker + Docker Compose (for Redis/TimescaleDB)
Deliverables:

Working "Hello World" firmware on both ESP32s
FastAPI skeleton responding to GET /health
Git repository with initial commit
1.2 Hardware Assembly
Tasks:

 Construct cardboard/plywood model house (12"x12"x12")
 Mount ESP32 #1 (Door) with RFID reader and relay
 Mount ESP32 #2 (Sensors) with BME280 and OLED
 Wire power supply (12V adapter → buck converters → components)
 Solder
 Start containers: docker-compose up -d
 Run SQL schema creation script (from Section 6.3)
 Test database connection from Python:
Python
from sqlalchemy import create_engine
engine = create_engine('postgresql://smarthome:changeme@localhost/smarthome_db')
 Populate test data (5 RFID UIDs in whitelist)
Deliverables:

Running Redis + TimescaleDB containers
Database schema created with indexes
Test query returns expected results
1.4 TLS Certificate Generation
Tasks:

 Generate Certificate Authority (CA):
bash
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt \
  -subj "/CN=SmartHome-CA"
 Generate server certificate (Raspberry Pi):
bash
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=raspberrypi.local"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365
 Generate client certificates (ESP32s):
bash
openssl genrsa -out esp32_door.key 2048
openssl req -new -key esp32_door.key -out esp32_door.csr \
  -subj "/CN=esp32-door-01"
openssl x509 -req -in esp32_door.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out esp32_door.crt -days 365
 Convert certificates to C arrays for ESP32 embedding:
bash
xxd -i ca.crt > ca_cert.h
 Test HTTPS connection: curl -v --cacert ca.crt https://raspberrypi.local:8443/health
Deliverables:

certs/ folder with CA, server, and client certificates
FastAPI running with SSL (uvicorn --ssl-keyfile server.key --ssl-certfile server.crt)
ESP32 firmware includes CA certificate in code
Phase 2: Access Control System (Week 3-4)
2.1 RFID Reading Firmware
Tasks:

 Install MFRC522 library in PlatformIO
 Write readRFIDUID() function:
C++
String readRFIDUID() {
    if (!rfid.PICC_ReadCardSerial()) {
        return "";
    }
    
    String uid = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
        uid += String(rfid.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    
    return uid;
}
 Test with multiple RFID cards (record UIDs)
 Handle edge cases:
Card removed mid-read
Multiple rapid swipes
Invalid/corrupted card data
 Add debouncing (ignore swipes within 500ms of previous)
Deliverables:

Firmware reliably reads 5 different RFID cards
Serial monitor logs UID on each swipe
No crashes after 100 consecutive swipes
2.2 Backend Access API
Tasks:

 Implement POST /api/access/check endpoint (from Section 6.2)
 Create Redis SET for whitelist:
bash
redis-cli SADD whitelist:uids "ABCD1234" "EF567890"
 Write access log to TimescaleDB after each check
 Add latency measurement (log to console):
Python
import time
start = time.time()
# ... validation logic ...
latency_ms = (time.time() - start) * 1000
print(f"Access check latency: {latency_ms:.2f}ms")
 Unit test with pytest:
Python
def test_authorized_uid(client):
    response = client.post("/api/access/check", json={
        "uid": "ABCD1234",
        "timestamp": 1234567890
    })
    assert response.status_code == 200
    assert response.json()["authorized"] == True
Deliverables:

API returns 200 OK with authorization decision
Average latency <50ms (measured with 100 requests)
All access attempts logged in access_logs table
2.3 ESP32-Backend Integration
Tasks:

 Implement checkAccess(String uid) function (from Section 6.1)
 Configure WiFi credentials in secrets.h:
C++
const char* WIFI_SSID = "YourNetworkName";
const char* WIFI_PASSWORD = "YourPassword";
const char* API_HOST = "https://raspberrypi.local:8443";
 Load TLS certificates into ESP32 firmware
 Test HTTPS POST request to API:
C++
HTTPClient http;
http.begin(client, "https://raspberrypi.local:8443/api/access/check");
http.addHeader("Content-Type", "application/json");
int httpCode = http.POST("{\"uid\":\"ABCD1234\",\"timestamp\":12345}");
 Parse JSON response (ArduinoJson library)
 Measure end-to-end latency (T1 = card read, T2 = response received)
Deliverables:

ESP32 successfully communicates with API over TLS
Console logs show request/response for each swipe
Measured latency logged (target: <300ms at this stage)
2.4 Solenoid Lock Control
Tasks:

 Implement unlockDoor() and lockDoor() functions (from Section 6.1)
 Add configurable unlock duration:
C++
const int UNLOCK_DURATION_MS = 3000; // 3 seconds

void unlockDoor() {
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println("DOOR UNLOCKED");
    delay(UNLOCK_DURATION_MS);
    lockDoor();
}
 Test relay actuation (listen for click)
 Connect solenoid lock to relay
 Physical test: door unlocks on authorized swipe, re-locks after 3s
 Add visual feedback (built-in LED blinks on unlock)
Deliverables:

Solenoid reliably actuates on GPIO signal
Door physically unlocks and re-locks
No missed actuations in 50-swipe test
2.5 End-to-End Access Control Testing
Tasks:

 Register 3 test RFID cards in whitelist
 Test authorized access flow:
Swipe valid card → door unlocks within 500ms
Check database: access log created with authorized=true
Verify latency recorded in log
 Test unauthorized access:
Swipe unknown card → door remains locked
Check database: access log shows authorized=false
 Latency measurement script (100 swipes):
Python
import statistics
latencies = [log.latency_ms for log in db.query(AccessLog).limit(100)]
print(f"Median: {statistics.median(latencies)}ms")
print(f"95th percentile: {statistics.quantiles(latencies, n=20)[18]}ms")
Deliverables:

95% of swipes complete within 500ms
Zero false positives (unauthorized cards granted access)
Zero false negatives (authorized cards denied access)
Phase 3: Environmental Monitoring (Week 5-6)
3.1 BME280 Sensor Integration
Tasks:

 Install Adafruit BME280 library
 Initialize I2C communication:
C++
#include <Wire.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;

void setup() {
    Wire.begin(SDA_PIN, SCL_PIN);
    if (!bme.begin(0x76)) {
        Serial.println("BME280 not found!");
        while(1);
    }
}
 Read sensor values every 1 second:
C++
unsigned long lastRead = 0;
const int READ_INTERVAL = 1000; // 1 second

void loop() {
    if (millis() - lastRead >= READ_INTERVAL) {
        float temp = bme.readTemperature();
        float humidity = bme.readHumidity();
        float pressure = bme.readPressure() / 100.0F; // hPa
        
        Serial.printf("Temp: %.2fC, Humidity: %.1f%%, Pressure: %.1fhPa\n",
                      temp, humidity, pressure);
        
        lastRead = millis();
    }
}
 Validate sensor accuracy (compare with room thermometer)
 Handle I2C errors gracefully (retry on read failure)
Deliverables:

ESP32 reads temperature every 1 second
Serial monitor shows stable readings (±0.5°C variation)
Sensor survives 24-hour continuous operation test
3.2 Sensor Data Backend API
Tasks:

 Implement POST /api/sensors/ingest endpoint (from Section 6.2)
 Create TimescaleDB hypertable (if not done in Phase 1.3)
 Test bulk insertion performance:
Python
# Simulate 1000 sensor readings
import time
start = time.time()
for i in range(1000):
    db.session.add(SensorReading(...))
db.session.commit()
print(f"Inserted 1000 records in {time.time() - start:.2f}s")
 Implement GET /api/sensors/history endpoint
 Optimize query with TimescaleDB time_bucket:
SQL
SELECT time_bucket('1 minute', timestamp) AS minute,
       AVG(temperature) AS avg_temp
FROM sensor_readings
WHERE device_id = 'esp32_sensor_01'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY minute
ORDER BY minute;
Deliverables:

API ingests sensor data with <10ms latency
Bulk insert handles 1000 records in <1 second
History query returns 24 hours (86,400 points) in <2 seconds
3.3 WebSocket Real-Time Updates
Tasks:

 Implement WebSocket endpoint /ws (from Section 6.2)
 ESP32 connects to WebSocket on startup:
C++
#include <WebSocketsClient.h>

WebSocketsClient webSocket;

void setup() {
    // ... other setup ...
    webSocket.begin("raspberrypi.local", 8443, "/ws");
    webSocket.onEvent(webSocketEvent);
}

void loop() {
    webSocket.loop();
    // ... sensor reading code ...
    if (newDataAvailable) {
        String json = createSensorJSON(temp, humidity, pressure);
        webSocket.sendTXT(json);
    }
}
 Backend publishes to Redis Pub/Sub:
Python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    async for message in websocket.iter_text():
        data = json.loads(message)
        
        # Store in database
        await ingest_sensor_data(data)
        
        # Publish to Redis for dashboard
        await redis_client.publish("sensors:realtime", message)
 Test latency: ESP32 sends reading → Dashboard updates
Measure with timestamp comparison
Target: <1 second end-to-end
Deliverables:

WebSocket connection stable for 1+ hour
Dashboard receives updates within 1 second of sensor reading
No message loss in 1000-message stress test
3.4 OLED Display Implementation
Tasks:

 Install Adafruit SSD1306 and GFX libraries
 Initialize display:
C++
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

void setup() {
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("OLED not found!");
        while(1);
    }
}
 Implement updateDisplay() function (from Section 6.1):
Line 1: "ONLINE" / "OFFLINE"
Line 2: IP address
Line 3: Current temperature
Line 4: WiFi signal strength (RSSI)
 Update display on state changes (don't refresh every loop to reduce I2C traffic)
Deliverables:

OLED shows correct system status
Display updates within 1 second of WiFi connect/disconnect
Text readable from 3 feet away
3.5 Historical Data Visualization
Tasks:

 Build React temperature graph component (from Section 6.4)
 Install Recharts: npm install recharts
 Fetch initial 24-hour data on component mount
 Subscribe to WebSocket for live updates
 Implement time range selector (1hr / 6hr / 24hr / 7day)
 Add CSV export button:
JavaScript
const exportCSV = () => {
    const csv = data.map(row => `${row.time},${row.temperature}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'temperature_data.csv';
    link.click();
};
Deliverables:

Dashboard displays live updating temperature graph
Historical data loads in <2 seconds
Graph smoothly updates without flickering
Phase 4: Security & Policy Management (Week 7-8)
4.1 Permission Revocation System
Tasks:

 Implement POST /api/access/revoke/{uid} endpoint (from Section 6.2)
 Set up Redis Pub/Sub for revocation events:
Python
await redis_client.publish("access:revoked", uid)
 ESP32 subscribes to revocation channel:
C++
// In WebSocket handler
if (event["type"] == "revocation") {
    String revokedUID = event["uid"];
    // Clear any local cache
    Serial.printf("Access revoked for UID: %s\n", revokedUID.c_str());
}
 Test propagation latency:
Click "Revoke" button in dashboard
Immediately swipe card
Measure time from click to denial
Target: <100ms
Deliverables:

Revocation propagates to ESP32 within 100ms
Revoked card denied on next swipe attempt
Revocation logged in database with timestamp
4.2 Policy Management UI
Tasks:

 Create React component PolicyManager.jsx:
jsx
function PolicyManager() {
    const [whitelist, setWhitelist] = useState([]);
    const [newUID, setNewUID] = useState('');
    
    const addUID = async () => {
        await axios.post('/api/policies/add', { uid: newUID });
        fetchWhitelist();
    };
    
    const revokeUID = async (uid) => {
        await axios.post(`/api/access/revoke/${uid}`);
        fetchWhitelist();
    };
    
    return (
        <div>
            <h2>RFID Whitelist</h2>
            <input value={newUID} onChange={e => setNewUID(e.target.value)} />
            <button onClick={addUID}>Add UID</button>
            
            <table>
                {whitelist.map(entry => (
                    <tr key={entry.uid}>
                        <td>{entry.uid}</td>
                        <td>{entry.user_name}</td>
                        <td><button onClick={() => revokeUID(entry.uid)}>Revoke</button></td>
                    </tr>
                ))}
            </table>
        </div>
    );
}
 Implement backend endpoints:
GET /api/policies/list - Return all whitelisted UIDs
POST /api/policies/add - Add new UID to whitelist
DELETE /api/policies/remove/{uid} - Remove UID
 Add confirmation dialog for revocations
Deliverables:

Admin can add/remove UIDs via web UI
Changes take effect immediately (no page reload needed)
Audit trail: all policy changes logged to database
4.3 Offline Failsafe Mode
Tasks:

 Implement connection monitoring on ESP32:
C++
unsigned long lastHeartbeat = 0;
const int HEARTBEAT_INTERVAL = 5000; // 5 seconds

void loop() {
    if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
        if (!testConnection()) {
            enterFailsafeMode();
        }
        lastHeartbeat = millis();
    }
}

bool testConnection() {
    HTTPClient http;
    http.begin("https://raspberrypi.local:8443/health");
    int code = http.GET();
    http.end();
    return (code == 200);
}

void enterFailsafeMode() {
    lockDoor(); // Secure state
    displayOfflineMessage();
    
    // Stop attempting access checks
    while (!reconnectWiFi()) {
        delay(10000); // Retry every 10 seconds
    }
}
 Update OLED to show "SYSTEM OFFLINE" in red (if color OLED)
 Test by disconnecting Raspberry Pi network cable
 Verify ESP32 detects offline state within 5 seconds
 Test auto-recovery when network restored
Deliverables:

ESP32 detects backend failure within 5 seconds
Lock defaults to secure (locked) state during outage
System auto-recovers when backend comes back online
4.4 Authentication for Dashboard
Tasks:

 Implement basic HTTP authentication:
Python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, "admin")
    correct_password = secrets.compare_digest(credentials.password, "changeme")
    
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.get("/api/policies/list")
async def list_policies(username: str = Depends(verify_credentials)):
    # Protected endpoint
    return {"policies": [...]}
 Add login form to React dashboard
 Store credentials in .env (not hardcoded)
 Implement session timeout (30 minutes)
Deliverables:

Dashboard requires login for policy management
Read-only views accessible without auth (optional)
No credentials stored in browser localStorage (security best practice)
Phase 5: Testing & Optimization (Week 9-10)
5.1 Latency Verification
Tasks:

 Access Control Latency Test

ESP32 script: Log T1 (card read) and T2 (lock actuation) for 100 swipes
Python analysis script:
Python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('latency_log.csv')
latencies = df['latency_ms']

print(f"Median: {latencies.median():.2f}ms")
print(f"95th percentile: {latencies.quantile(0.95):.2f}ms")
print(f"Max: {latencies.max():.2f}ms")

latencies.hist(bins=20)
plt.xlabel('Latency (ms)')
plt.ylabel('Frequency')
plt.title('Access Control Latency Distribution')
plt.savefig('latency_histogram.png')
Acceptance: 95% < 500ms
 Dashboard Update Latency Test

ESP32 embeds timestamp in sensor payload
Frontend logs receipt timestamp:
JavaScript
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const latency = Date.now() - data.timestamp;
    console.log(`Update latency: ${latency}ms`);
};
Run heat source test (hair dryer) with 50 temperature changes
Acceptance: Average < 1000ms
 Historical Query Performance Test

Populate database with 100,000 dummy records:
Python
from datetime import datetime, timedelta
import random

base_time = datetime.now() - timedelta(days=7)
for i in range(100000):
    timestamp = base_time + timedelta(seconds=i*6)  # Every 6 seconds
    temp = 20 + random.gauss(0, 2)  # 20°C ± 2°C
    db.session.add(SensorReading(
        device_id='esp32_sensor_01',
        timestamp=timestamp,
        temperature=temp
    ))
db.session.commit()
Measure query time with PostgreSQL EXPLAIN ANALYZE:
SQL
EXPLAIN ANALYZE
SELECT timestamp, temperature
FROM sensor_readings
WHERE device_id = 'esp32_sensor_01'
  AND timestamp > NOW() - INTERVAL '24 hours';
Acceptance: Execution time < 2000ms
 Permission Revocation Latency Test

FastAPI middleware logs request timestamps:
Python
@app.middleware("http")
async def log_latency(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    latency = (time.time() - start) * 1000
    print(f"{request.url.path}: {latency:.2f}ms")
    return response
Test: Click revoke → immediate swipe
Acceptance: Denial within 100ms
Deliverables:

Latency test report with histograms and statistics
All performance targets met (documented evidence)
Identified bottlenecks and optimization notes
5.2 Stress Testing
Tasks:

 Concurrent Sensor Load Test

Laptop script simulates 50 virtual sensors at 10Hz:
Python
import asyncio
import aiohttp
import time
from datetime import datetime

async def send_sensor_data(session, device_id):
    payload = {
        "device_id": device_id,
        "timestamp": int(time.time() * 1000),
        "temperature": 20 + (device_id % 10),
        "humidity": 50,
        "pressure": 1013
    }
    async with session.post(
        'https://raspberrypi.local:8443/api/sensors/ingest',
        json=payload,
        ssl=False
    ) as response:
        return await response.text()

async def stress_test():
    async with aiohttp.ClientSession() as session:
        for _ in range(100):  # 100 iterations
            tasks = [
                send_sensor_data(session, f"sensor_{i}")
                for i in range(50)
            ]
            await asyncio.gather(*tasks)
            await asyncio.sleep(0.1)  # 10Hz

asyncio.run(stress_test())
Monitor Raspberry Pi CPU/memory usage:
bash
htop  # Interactive process viewer
iotop  # Disk I/O monitor
Query database: Compare SELECT COUNT(*) FROM sensor_readings with expected count
Acceptance: Zero message loss, CPU < 80%
 Rapid Access Attempts Test

Swipe RFID card 100 times in rapid succession (simulate tailgating attack)
Verify no deadlocks or missed events
Check all 100 attempts logged in database
Acceptance: No crashes, all events processed
 Long-Duration Stability Test

Run system continuously for 48 hours
Monitor memory leaks (check RAM usage trends)
Check log files for errors/warnings
Acceptance: Stable memory usage, zero crashes
Deliverables:

Stress test report with graphs (CPU, memory, message throughput)
Database integrity verified (no missing records)
System passes 48-hour burn-in test
5.3 Security Validation
Tasks:

 TLS Certificate Verification

Attempt connection with invalid client cert:
bash
curl --cert fake.crt --key fake.key https://raspberrypi.local:8443/api/access/check
# Expected: Connection refused / SSL handshake error
Verify server cert fingerprint matches expected value
Acceptance: 100% rejection of unauthorized clients
 SQL Injection Test

Try malicious payloads:
Python
response = requests.post('/api/access/check', json={
    "uid": "'; DROP TABLE access_logs; --",
    "timestamp": 12345
})
# Expected: Rejected or safely escaped
Use SQLMap tool for automated testing (optional)
Acceptance: No successful injections
 Replay Attack Prevention

Capture valid RFID check request
Replay same request (simulate man-in-the-middle)
Verify system doesn't double-process (use request IDs)
Acceptance: Duplicate requests handled gracefully
Deliverables:

Security audit report
No critical vulnerabilities found
Recommendations for production hardening
5.4 Code Optimization
Tasks:

 Database Query Optimization

Analyze slow queries:
SQL
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
Add missing indexes
Use TimescaleDB compression:
SQL
ALTER TABLE sensor_readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id'
);
SELECT add_compression_policy('sensor_readings', INTERVAL '7 days');
 ESP32 Memory Optimization

Check heap usage:
C++
Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
Move large strings to PROGMEM (flash storage):
C++
const char CA_CERT[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
)EOF";
Reduce JSON buffer sizes if possible
 Frontend Bundle Size Reduction

Run npm run build and check bundle size
Enable code splitting for large components
Lazy load charts library:
JavaScript
const TemperatureGraph = React.lazy(() => import('./TemperatureGraph'));
Deliverables:

Query execution times reduced by 20%+
ESP32 free heap > 100KB after initialization
Frontend bundle < 500KB gzipped
Phase 6: Documentation & Demo Preparation (Week 11-12)
6.1 Code Documentation
Tasks:

 Add docstrings to all Python functions:
Python
async def check_access(request: AccessRequest) -> AccessResponse:
    """
    Validate RFID UID against whitelist and return authorization decision.
    
    Args:
        request: AccessRequest object containing UID and timestamp
        
    Returns:
        AccessResponse with authorization status and latency
        
    Raises:
        HTTPException: If database connection fails
    """
 Add comments to ESP32 firmware (explain non-obvious logic)
 Generate API documentation:
bash
# FastAPI auto-generates OpenAPI docs
# Access at https://raspberrypi.local:8443/docs
 Create README.md files in each subdirectory
Deliverables:

100% docstring coverage for public APIs
Auto-generated API documentation accessible via browser
Code comments explain "why" (not just "what")
6.2 User Guides
Tasks:

 Setup Guide (SETUP.md):
Hardware assembly instructions with photos
Software installation steps (PlatformIO, Python, Docker)
Configuration file templates
Troubleshooting common errors
 User Manual (USER_GUIDE.md):
How to add/remove RFID cards
Dashboard navigation tutorial
Interpreting temperature graphs
Exporting historical data
 API Reference (auto-generated + examples):
Sample curl commands for each endpoint
Postman collection for testing
Deliverables:

Non-technical user can follow setup guide to replicate system
User manual covers all dashboard features with screenshots
API reference includes example requests/responses
6.3 Demo Script Preparation
Tasks:

 Write demonstration script (5-7 minutes):

Introduction (30s): Problem statement and system overview
Architecture Walkthrough (1 min): Explain diagram on poster/slides
Live Demo - Access Control (2 min):
Swipe authorized card → door unlocks (<500ms)
Show access log entry in dashboard
Revoke card in UI → immediate swipe denied (<100ms)
Live Demo - Environmental Monitoring (2 min):
Show real-time temperature graph updating
Heat sensor with hair dryer → graph responds within 1s
Query 24-hour history → results in <2s
Stress Test (1 min): Run 50 virtual sensors → show zero data loss
Offline Resilience (1 min): Disconnect backend → OLED shows "OFFLINE"
Q&A (time permitting)
 Prepare backup plan for each demo:

WiFi fails → use phone hotspot
Door lock jams → have video recording as backup
Database crash → restore from backup (practice this!)
 Rehearse demo 5+ times to identify failure points

Deliverables:

Polished demo script with timing marks
Backup materials (videos, screenshots)
Tested recovery procedures for common failures
6.4 Final Presentation Materials
Tasks:

 Create poster/slides covering:

Problem statement and motivation
System architecture diagram
Performance metrics (latency graphs)
Security features
Comparison to past project (SmartWatt)
Lessons learned
 Prepare demo table setup:

Model house positioned for visibility
Laptop with dashboard open
Poster/monitor showing architecture
Test RFID cards accessible
Extension cord for power
 Create handout (optional):

QR code to GitHub repository
Key performance metrics
Team contact information
Deliverables:

Professional presentation materials (poster/slides)
Demo setup checklist
Practiced responses to anticipated questions
8. Testing & Verification
8.1 Latency Verification Tests
Test 8.1.1: Access Control End-to-End Latency
Objective: Verify RFID swipe to lock actuation completes in <500ms for 95% of attempts

Procedure:

Modify ESP32 firmware to log timestamps:

C++
unsigned long t1 = millis(); // Card detected
String uid = readRFIDUID();
bool authorized = checkAccess(uid);
unsigned long t2 = millis(); // Decision received

// Log to Serial and send to backend
Serial.printf("LATENCY,%lu,%s,%d\n", t2-t1, uid.c_str(), authorized);
Perform 100 test swipes with valid RFID card

Capture serial output and parse latency values:

Python
import pandas as pd

df = pd.read_csv('serial_log.csv', names=['latency_ms', 'uid', 'authorized'])
latencies = df['latency_ms']

median = latencies.median()
percentile_95 = latencies.quantile(0.95)
max_latency = latencies.max()

print(f"Median: {median}ms")
print(f"95th percentile: {percentile_95}ms")
print(f"Maximum: {max_latency}ms")

# Pass/fail determination
if percentile_95 < 500:
    print("PASS: 95% of requests under 500ms")
else:
    print(f"FAIL: 95th percentile is {percentile_95}ms")
Repeat test under load (simulate 5 concurrent sensors sending data)

Expected Results:

Median latency: 200-350ms
95th percentile: <500ms
Maximum: <800ms
Pass Criteria: 95% of swipes complete within 500ms

Test 8.1.2: Dashboard Update Latency
Objective: Verify temperature reading appears on dashboard within 1 second

Procedure:

Modify ESP32 to embed timestamp in WebSocket payload:

C++
StaticJsonDocument<300> payload;
payload["device_id"] = "esp32_sensor_01";
payload["timestamp"] = millis();
payload["temperature"] = bme.readTemperature();
Modify React dashboard to calculate latency:

JavaScript
const [latencies, setLatencies] = useState([]);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const now = Date.now();
    const sent = data.timestamp;
    const latency = now - sent;
    
    setLatencies(prev => [...prev, latency]);
    console.log(`Latency: ${latency}ms`);
};
Apply heat source (hair dryer) to BME280 sensor

Record 50 temperature change events

Calculate average latency:

JavaScript
const avgLatency = latencies.reduce((a,b) => a+b, 0) / latencies.length;
console.log(`Average latency: ${avgLatency}ms`);
Expected Results:

Average latency: 400-800ms
Maximum latency: <1200ms
Pass Criteria: Average latency <1000ms

Test 8.1.3: Historical Query Performance
Objective: Retrieve 24 hours of sensor data in <2 seconds

Procedure:

Populate database with realistic test data:

Python
# 1 reading/second for 7 days = 604,800 records
import random
from datetime import datetime, timedelta

base_time = datetime.now() - timedelta(days=7)
records = []

for i in range(604800):
    timestamp = base_time + timedelta(seconds=i)
    temp = 20 + random.gauss(0, 2)  # 20°C ± 2°C
    records.append(SensorReading(
        device_id='esp32_sensor_01',
        timestamp=timestamp,
        temperature=temp,
        humidity=50,
        pressure=1013
    ))
    
    if i % 10000 == 0:
        db.session.bulk_save_objects(records)
        db.session.commit()
        records = []
Run query with timing:

Python
import time

start = time.time()
results = db.session.query(SensorReading).filter(
    SensorReading.device_id == 'esp32_sensor_01',
    SensorReading.timestamp > datetime.now() - timedelta(hours=24)
).all()
elapsed = time.time() - start

print(f"Retrieved {len(results)} records in {elapsed:.3f}s")
Run PostgreSQL EXPLAIN ANALYZE:

SQL
EXPLAIN ANALYZE
SELECT timestamp, temperature
FROM sensor_readings
WHERE device_id = 'esp32_sensor_01'
  AND timestamp > NOW() - INTERVAL '24 hours';
Check execution plan uses index scan (not sequential scan)

Expected Results:

Query execution: 500-1500ms
Network transfer + rendering: 200-500ms
Total: <2000ms
Pass Criteria: Total time from button click to graph render <2 seconds

Test 8.1.4: Permission Revocation Propagation
Objective: Verify revoked card denied access within 100ms

Procedure:

Add timing instrumentation to backend:

Python
import time

@app.post("/api/access/revoke/{uid}")
async def revoke_access(uid: str):
    t1 = time.time()
    
    await redis_client.srem("whitelist:uids", uid)
    await redis_client.publish("access:revoked", uid)
    
    t2 = time.time()
    print(f"Revocation propagated in {(t2-t1)*1000:.2f}ms")
    
    return {"status": "revoked", "timestamp": t2}
Test procedure:

Click "Revoke" button in dashboard for test UID
Immediately swipe physical card with that UID
Check access log for denial timestamp
Calculate propagation time:

Python
revoke_time = db.session.query(PolicyChange).filter(
    PolicyChange.uid == test_uid,
    PolicyChange.action == 'revoke'
).first().timestamp

denial_time = db.session.query(AccessLog).filter(
    AccessLog.uid == test_uid,
    AccessLog.authorized == False
).order_by(AccessLog.timestamp.desc()).first().timestamp

propagation_ms = (denial_time - revoke_time).total_seconds() * 1000
print(f"Propagation time: {propagation_ms:.2f}ms")
Expected Results:

Revocation API call: 10-30ms
Redis Pub/Sub latency: 5-20ms
Total propagation: 50-100ms
Pass Criteria: Card denied on first swipe after revocation (<100ms)

8.2 Reliability & Stress Tests
Test 8.2.1: Concurrent Sensor Load
Objective: Handle 50 virtual sensors at 10Hz without data loss

Procedure:

Run load generation script:

Python
import asyncio
import aiohttp
import time
from datetime import datetime

total_sent = 0
total_errors = 0

async def send_reading(session, device_id):
    global total_sent, total_errors
    
    payload = {
        "device_id": f"sensor_{device_id:02d}",
        "timestamp": int(time.time() * 1000),
        "temperature": 20 + (device_id % 10),
        "humidity": 50,
        "pressure": 1013
    }
    
    try:
        async with session.post(
            'https://raspberrypi.local:8443/api/sensors/ingest',
            json=payload,
            ssl=False,
            timeout=aiohttp.ClientTimeout(total=2)
        ) as response:
            if response.status == 200:
                total_sent += 1
            else:
                total_errors += 1
    except Exception as e:
        total_errors += 1
        print(f"Error: {e}")

async def stress_test():
    async with aiohttp.ClientSession() as session:
        start_time = time.time()
        
        for iteration in range(100):  # 10 seconds @ 10Hz
            tasks = [send_reading(session, i) for i in range(50)]
            await asyncio.gather(*tasks)
            await asyncio.sleep(0.1)  # 10Hz
        
        elapsed = time.time() - start_time
        
    print(f"\n=== Stress Test Results ===")
    print(f"Duration: {elapsed:.2f}s")
    print(f"Messages sent: {total_sent}")
    print(f"Errors: {total_errors}")
    print(f"Success rate: {total_sent/(total_sent+total_errors)*100:.2f}%")

asyncio.run(stress_test())
Monitor system resources during test:

bash
# Terminal 1: CPU/memory monitoring
htop

# Terminal 2: Database write rate
watch -n 1 'psql -c "SELECT COUNT(*) FROM sensor_readings"'

# Terminal 3: Redis queue depth
watch -n 1 'redis-cli XLEN sensors:stream'
After test, verify data integrity:

Python
# Should be 5000 records (50 sensors × 100 iterations)
count = db.session.query(SensorReading).filter(
    SensorReading.timestamp > datetime.now() - timedelta(minutes=1)
).count()

print(f"Stored {count}/5000 records ({count/5000*100:.2f}%)")
Expected Results:

99%+ success rate (4950+ messages stored)
CPU usage: 60-80% during test
Memory usage: stable (no leaks)
Redis queue: <100 pending messages
Pass Criteria: Zero data loss (5000/5000 records stored)

Test 8.2.2: Long-Duration Stability
Objective: System runs without crashes for 48 hours

Procedure:

Start continuous operation:

ESP32 sensors sending data every 1s
Simulate RFID swipe every 5 minutes (automated with servo or second ESP32)
Dashboard open in browser
Monitor memory usage trends:

bash
# Log memory every 10 minutes
while true; do
    echo "$(date),$(free -m | awk 'NR==2{print $3}')" >> memory_log.csv
    sleep 600
done
Check for errors in logs:

bash
# FastAPI logs
tail -f /var/log/smarthome/fastapi.log | grep ERROR

# ESP32 logs (via serial monitor)
# Watch for crash dumps or reboot messages
After 48 hours, analyze:

Total database records (should be ~172,800 sensor readings)
Memory usage trend (plot CSV)
Error count in logs
Expected Results:

Zero crashes or reboots
Memory usage stable (±10% variation)
All expected records in database
<10 error log entries (transient network glitches acceptable)
Pass Criteria: System operational for full 48 hours without manual intervention

8.3 Security Validation Tests
Test 8.3.1: TLS Certificate Validation
Objective: Reject connections from unauthorized devices

Procedure:

Generate fake client certificate:

bash
openssl req -x509 -newkey rsa:2048 -keyout fake.key -out fake.crt \
  -days 1 -nodes -subj "/CN=attacker"
Attempt connection with fake cert:

bash
curl --cert fake.crt --key fake.key --cacert ca.crt \
  https://raspberrypi.local:8443/api/access/check \
  -d '{"uid":"test","timestamp":12345}' \
  -H "Content-Type: application/json"

# Expected: SSL handshake failure
Attempt connection without client cert:

bash
curl --cacert ca.crt https://raspberrypi.local:8443/api/access/check \
  -d '{"uid":"test","timestamp":12345}' \
  -H "Content-Type: application/json"

# Expected: HTTP 403 Forbidden or connection refused
Check server logs for rejected attempts:

bash
grep "SSL handshake failed" /var/log/smarthome/fastapi.log
Expected Results:

All unauthorized connection attempts rejected
Valid client cert (ESP32) connects successfully
No false negatives (authorized client rejected)
Pass Criteria: 100% rejection rate for invalid certificates

Test 8.3.2: SQL Injection Prevention
Objective: Verify input validation prevents SQL injection

Procedure:

Test malicious UID payload:

Python
import requests

payloads = [
    "'; DROP TABLE access_logs; --",
    "1' OR '1'='1",
    "admin'--",
    "'; UPDATE rfid_whitelist SET authorized=true; --"
]

for payload in payloads:
    response = requests.post(
        'https://raspberrypi.local:8443/api/access/check',
        json={"uid": payload, "timestamp": 12345},
        verify='ca.crt'
    )
    
    print(f"Payload: {payload}")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
Check database integrity after test:

SQL
-- Should return all tables intact
\dt

-- Check for unexpected records
SELECT * FROM access_logs WHERE uid LIKE '%DROP%';
Verify parameterized queries used:

Python
# Review code: ensure all queries use SQLAlchemy ORM or parameterized raw SQL
# BAD:  db.execute(f"SELECT * FROM users WHERE uid='{uid}'")
# GOOD: db.query(User).filter(User.uid == uid)
Expected Results:

All malicious payloads rejected or safely escaped
No database modifications from injection attempts
Application remains stable (no crashes)
Pass Criteria: Zero successful SQL injections

8.4 Functional Integration Tests
Test 8.4.1: End-to-End Access Control Flow
Test Case: Authorized RFID Access

Steps:

Add test UID "ABCD1234" to whitelist via dashboard
Swipe physical card with UID "ABCD1234"
Observe door unlock (solenoid clicks)
Wait 3 seconds
Observe door re-lock automatically
Verification:

 Door unlocks within 500ms of swipe
 OLED displays "ACCESS GRANTED"
 Access log entry created in database:
SQL
SELECT * FROM access_logs WHERE uid='ABCD1234' ORDER BY timestamp DESC LIMIT 1;
 Entry shows authorized=TRUE and latency_ms < 500
 Door re-locks after exactly 3 seconds
Test Case: Unauthorized RFID Access

Steps:

Swipe card with unknown UID "99999999"
Observe door remains locked
Verification:

 Door does not unlock
 OLED displays "ACCESS DENIED"
 Access log shows authorized=FALSE
 No errors in backend logs
Test Case: Real-Time Permission Revocation

Steps:

Add UID "TEST5678" to whitelist
Verify card grants access (test swipe)
Click "Revoke" button in dashboard for UID "TEST5678"
Immediately swipe card again
Verification:

 First swipe: access granted
 Revocation completes within 100ms (check logs)
 Second swipe: access denied
 Policy change logged in database
Test 8.4.2: End-to-End Temperature Monitoring
Test Case: Real-Time Temperature Display

Steps:

Open dashboard in browser
Observe current temperature reading
Apply heat source (hair dryer) to BME280 sensor
Watch dashboard graph
Verification:

 Initial temperature displays (±0.5°C of room temp)
 Graph updates within 1 second of heat application
 Temperature rises smoothly on graph (no jumps)
 OLED shows updated temperature value
 No console errors in browser
Test Case: Historical Data Query

Steps:

Click "24 Hour History" button in dashboard
Wait for graph to render
Verification:

 Query completes in <2 seconds
 Graph shows ~86,400 data points (24 hrs @ 1Hz)
 Time axis labeled correctly (past 24 hours)
 Temperature range reasonable (no outliers like -273°C or 1000°C)
Test Case: CSV Export

Steps:

Select date range (last 1 hour)
Click "Export CSV" button
Download file
Verification:

 CSV file downloads successfully
 Format correct: timestamp,temperature,humidity,pressure
 Data matches dashboard graph
 File opens in Excel/Google Sheets
Test 8.4.3: Offline Failsafe Behavior
Test Case: Backend Disconnect

Steps:

System running normally
Disconnect Raspberry Pi network cable (or stop Docker containers)
Wait 5 seconds
Observe ESP32 behavior
Attempt RFID swipe
Reconnect network
Verification:

 ESP32 detects offline state within 5 seconds
 OLED displays "SYSTEM OFFLINE"
 Door remains locked (failsafe state)
 RFID swipes logged locally (optional)
 After reconnect: ESP32 shows "ONLINE" within 30 seconds
 Normal operation resumes
9. Milestones & Timeline
Week-by-Week Schedule
Week	Phase	Key Deliverables	Estimated Hours
1-2	Foundation Setup	Dev environment, hardware assembly, database running	30 hrs
3-4	Access Control	RFID reading, backend API, end-to-end door unlock	35 hrs
5-6	Environmental Monitoring	BME280 integration, WebSocket, dashboard graph	30 hrs
7-8	Security & Policy	TLS handshake, revocation system, policy UI	25 hrs
9-10	Testing & Optimization	All tests passing, performance tuning	35 hrs
11-12	Documentation & Demo	User guides, demo rehearsal, presentation materials	25 hrs
Total			180 hrs
Critical Path Items
Milestone 1: Hardware Functional (End of Week 2)

Blocker for: All subsequent phases
Definition of Done:
ESP32s connect to WiFi
RFID reader detects cards
BME280 reads temperature
Solenoid lock actuates on GPIO signal
Database accepts INSERT queries
Milestone 2: Access Control MVP (End of Week 4)

Blocker for: Security features, demo script
Definition of Done:
RFID swipe unlocks door
Latency <500ms
Access logged to database
At least 2 test cards authorized
Milestone 3: Temperature Monitoring MVP (End of Week 6)

Blocker for: Historical queries, dashboard polish
Definition of Done:
Dashboard shows live temperature graph
Updates within 1 second
24-hour history query works
100% data logged to database
Milestone 4: All Tests Passing (End of Week 10)

Blocker for: Demo day, final report
Definition of Done:
All tests in Section 8 passing
Performance targets met
No critical bugs
Documentation complete
Contingency Plans
Risk: Hardware component failure (ESP32, sensor, lock)

Mitigation: Order 2x of critical components upfront
Fallback: Demo with video recording if live demo fails
Risk: WiFi connectivity issues during demo

Mitigation: Set up phone hotspot as backup network
Fallback: Raspberry Pi connected via Ethernet, ESP32s on hotspot
Risk: Database performance below target

Mitigation: Use pre-loaded database with test data
Fallback: Demo with smaller dataset (1 week instead of 90 days)
Risk: TLS handshake adds >200ms latency

Mitigation: Optimize certificate size (use ECC instead of RSA)
Fallback: Use self-signed certs without CA chain validation
10. Risk Assessment & Mitigation
Technical Risks
Risk	Probability	Impact	Mitigation Strategy
ESP32 WiFi instability	Medium	High	Use ESP-IDF instead of Arduino framework; implement exponential backoff reconnection
TimescaleDB query timeout on RPi	Medium	Medium	Pre-compute aggregates with continuous aggregates; use connection pooling
TLS handshake >200ms overhead	Low	Medium	Use hardware crypto acceleration; cache sessions; consider PSK instead of certificates
Redis data loss on crash	Low	High	Enable AOF persistence; use fsync every 1s; backup to TimescaleDB
I2C bus conflicts (OLED + BME280)	Low	Low	Use separate I2C buses if needed; add pull-up resistors
Solenoid overheating	Low	Medium	Add thermal protection; limit duty cycle; monitor current
Project Management Risks
Risk	Probability	Impact	Mitigation Strategy
Scope creep (adding features)	High	Medium	Strictly adhere to MVP definition; defer non-critical features to "Future Work"
Component shipping delays	Medium	High	Order all parts by end of Week 1; identify local alternatives
Team member illness	Medium	Medium	Cross-train on each subsystem; maintain detailed documentation
Demo day technical failure	Medium	Critical	Rehearse demo 5+ times; prepare video backup; have spare hardware
Safety Considerations
Electrical Safety:

 Use UL-listed power adapter
 Add fuse on 12V line (1A fast-blow)
 Insulate all solder joints with heat shrink
 No exposed mains voltage (120VAC)
 Ground model house frame if metal
Fire Safety:

 Don't leave system running unattended during development
 Buck converters rated for 2x expected current
 Smoke detector in demo area
 Fire extinguisher accessible
Data Safety:

 Daily backups of database (automated cron job)
 Git commits after each major change
 Test restore procedure before demo day
11. Success Criteria
Minimum Viable Product (MVP)
The project is considered successful if:

Functional Requirements Met:

Door unlocks on authorized RFID swipe
Temperature displayed in real-time dashboard
Access control and sensor data logged to database
Policy changes (add/revoke UIDs) work via web UI
Performance Requirements Met:

Access control latency: <500ms (95th percentile)
Dashboard update latency: <1s (average)
Historical query: <2s for 24 hours
Permission revocation: <100ms propagation
System Demonstrates Web-First Architecture:

Physical model fully dependent on backend
Offline state detected and handled gracefully
All control happens via web dashboard (not physical buttons)
Security Implemented:

TLS encryption for all communication
Client certificate authentication
No successful SQL injection attacks in testing
Documentation Complete:

Setup guide allows replication
API documented with examples
Code commented and readable
Stretch Goals (Nice-to-Have)
 Add CO2 sensor (SCD40) and display in dashboard
 Implement occupancy detection (PIR sensor)
 Multi-zone temperature monitoring (3+ sensors)
 Email/SMS alerts on unauthorized access attempts
 Machine learning anomaly detection (temperature spikes)
 Mobile-responsive dashboard (works on phone)
 Cloud deployment (AWS/Azure) instead of local Raspberry Pi
Comparison to Past Work (Success Metric)
SmartWatt Project (Spring 2025) - Key Differences:

Aspect	SmartWatt	Our Project
Primary Goal	Energy cost optimization via ML forecasting	Critical infrastructure management
Latency Target	~2s acceptable	<500ms required
Architecture	Request-response (synchronous)	Event-driven (asynchronous)
Backend	FastAPI + MQTT	FastAPI + Redis Streams + WebSockets
Security Focus	Low (local network only)	High (TLS mutual auth, policy enforcement)
Real-Time Control	Scheduling (hours ahead)	Immediate actuation (milliseconds)
Database	Standard SQL	TimescaleDB (time-series optimized)
UI Freezing Issue	Occurred due to sync calls	Avoided via background workers
Our Innovation:

Proved <500ms web-based access control is feasible
Demonstrated secure device provisioning at scale
Showed fail-safe architecture for critical systems
Addressed synchronous bottleneck with Redis Streams
12. Future Enhancements
Phase 2 Features (Post-Demo)
HVAC Control Integration

Add servo-controlled dampers for air vents
Relay-controlled fans for climate zones
Automated temperature setpoint management
Advanced Analytics

Predictive maintenance (detect sensor drift)
Access pattern analysis (identify unusual activity)
Energy usage correlation (temp vs. door opens)
Mobile Application

React Native app for iOS/Android
Push notifications for alerts
Remote door unlock (with geofencing)
Scalability Improvements

Kubernetes deployment for backend
Load balancer for multiple Raspberry Pis
Distributed database (Cassandra/CockroachDB)
Enhanced Security

Two-factor authentication for dashboard
Biometric access (fingerprint/facial recognition)
Intrusion detection system (IDS)
Research Opportunities
Thesis Topic: "Latency Optimization in Web-Based Building Automation Systems"
Publication: Conference paper on event-driven architecture for IoT (e.g., IEEE IoT Journal)
Open Source: Release as reference implementation for ESP32 + FastAPI + TimescaleDB stack
Appendix A: Bill of Materials (BOM)
Component	Quantity	Unit Price	Supplier	Total
ESP32-S3-DevKitC-1 (16MB)	2	$12.00	Adafruit	$24.00
BME280 Sensor Breakout	1	$10.00	Adafruit	$10.00
| Component | Quantity | Unit Price | Supplier | Total |
|-----------|----------|-----------|----------|-------|
| ESP32-S3-DevKitC-1 (16MB) | 2 | $12.00 | Adafruit | $24.00 |
| BME280 Sensor Breakout | 1 | $10.00 | Adafruit | $10.00 |
| RFID-RC522 Module + Cards | 1 | $8.00 | Amazon | $8.00 |
| 12V Solenoid Door Lock | 1 | $15.00 | Amazon | $15.00 |
| SSD1306 OLED Display (0.96") | 1 | $7.00 | Amazon | $7.00 |
| 1-Channel 5V Relay Module | 1 | $4.00 | Amazon | $4.00 |
| LM2596 Buck Converter | 2 | $3.00 | Amazon | $6.00 |
| 12V 2A Power Adapter | 1 | $10.00 | Amazon | $10.00 |
| Breadboards (400-point) | 2 | $5.00 | Amazon | $10.00 |
| Jumper Wire Kit | 1 | $8.00 | Amazon | $8.00 |
| Resistors Kit (assorted) | 1 | $6.00 | Amazon | $6.00 |
| Cardboard/Plywood (model house) | 1 | $15.00 | Hardware Store | $15.00 |
| Hot glue gun + glue sticks | 1 | $10.00 | Hardware Store | $10.00 |
| Raspberry Pi 4 (4GB) | 1 | $55.00 | Adafruit | $55.00 |
| MicroSD Card (32GB) | 1 | $10.00 | Amazon | $10.00 |
| Ethernet Cable | 1 | $5.00 | Amazon | $5.00 |
| USB-C Cables (power) | 3 | $3.00 | Amazon | $9.00 |
| **TOTAL** | | | | **$212.00** |

**Note:** Prices are approximate and may vary by supplier/region. Budget includes 10% contingency for shipping and replacement parts.

---

## Appendix B: Configuration Files
Appendix F: Troubleshooting Guide
Common Issues and Solutions
Issue: ESP32 Won't Connect to WiFi
Symptoms:

Serial monitor shows "Connecting to WiFi..." indefinitely
WiFi.status() returns WL_CONNECT_FAILED
Solutions:

Verify WiFi credentials in code (SSID/password)
Check 2.4GHz network (ESP32 doesn't support 5GHz)
Move ESP32 closer to router (weak signal)
Check router MAC filtering (whitelist ESP32)
Try different WiFi channel (avoid congestion)
C++
// Debug WiFi connection
Serial.println(WiFi.status());  // Should be 3 (WL_CONNECTED)
Serial.println(WiFi.SSID());
Serial.println(WiFi.RSSI());     // Signal strength (>-70 dBm good)
Issue: RFID Reader Not Detecting Cards
Symptoms:

rfid.PICC_IsNewCardPresent() always returns false
Serial monitor shows "Card not detected"
Solutions:

Check SPI wiring (MOSI, MISO, SCK, SDA, RST)
Verify 3.3V power to RFID module (NOT 5V)
Try different RFID card (some cards incompatible)
Reduce distance (optimal: <3cm)
Check antenna connection on RC522 module
C++
// Test RFID initialization
byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
Serial.printf("MFRC522 version: 0x%02X (should be 0x91 or 0x92)\n", version);
Issue: Solenoid Lock Not Actuating
Symptoms:

Relay clicks but lock doesn't move
Lock moves weakly or intermittently
Solutions:

Check 12V power supply (measure with multimeter)
Verify relay contacts handling 12V/500mA
Check flyback diode polarity across solenoid
Ensure common ground between ESP32 and 12V supply
Test solenoid directly with 12V battery
C++
// Test relay
digitalWrite(RELAY_PIN, HIGH);
delay(5000);  // Should hear click and lock move
digitalWrite(RELAY_PIN, LOW);
Issue: TLS Handshake Fails
Symptoms:

http.POST() returns -1 or negative error code
Serial shows "SSL handshake failed"
Solutions:

Verify CA certificate matches server cert
Check certificate expiration dates
Ensure client certificate loaded correctly
Try disabling certificate validation (testing only):
C++
client.setInsecure();  // INSECURE - testing only
Increase mbedTLS buffer size in Arduino core
Issue: Database Query Slow (>2s)
Symptoms:

Historical queries timeout
Dashboard shows "Loading..." for >5 seconds
Solutions:

Check indexes exist (see init.sql)
Run VACUUM ANALYZE on TimescaleDB:
SQL
VACUUM ANALYZE sensor_readings;
Enable compression (see Appendix D)
Use continuous aggregates for large time ranges
Check Raspberry Pi CPU/disk I/O (may be overloaded)
SQL
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM sensor_readings 
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Should use "Index Scan" not "Seq Scan"
Issue: WebSocket Disconnects Frequently
Symptoms:

Dashboard shows "Reconnecting..." repeatedly
ESP32 logs "WebSocket disconnected"
Solutions:

Increase WebSocket timeout in FastAPI
Implement ping/pong heartbeat:
Python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        await websocket.send_text(json.dumps({"type": "ping"}))
        await asyncio.sleep(30)
Check WiFi stability (ESP32 RSSI)
Disable power saving mode on ESP32:
C++
WiFi.setSleep(false);
Conclusion
This Product Requirements Document provides a comprehensive roadmap for implementing the Smart Home Model project. By following the phased approach and adhering to the technical requirements, the team will deliver a functional demonstration of web-first building automation with proven performance metrics.

Key Success Factors:

Rigorous testing at each phase (don't skip verification)
Early hardware assembly to identify issues
Daily Git commits for rollback capability
Weekly milestone reviews to stay on track
Rehearse demo multiple times before presentation
Final Checklist Before Demo:

 All hardware components mounted and wired
 ESP32s connect to backend reliably
 Door unlocks in <500ms (verified with 100 tests)
 Dashboard updates in <1s (verified with heat source)
 Historical query <2s (verified with 100k records)
 Revocation propagates in <100ms (verified with immediate swipe)
 Documentation complete (setup guide, API docs)
 Demo script rehearsed 5+ times
 Backup materials ready (videos, screenshots)
 Power supply tested for full demo duration
 Presentation materials printed/displayed
