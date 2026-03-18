# Smart Home Model: Web-First Building Management System

**18-500 Capstone Design Project — Team A4**
Mario Belmonte · Cindy Chen — Department of Electrical and Computer Engineering, Carnegie Mellon University

---

## Abstract

This project presents a web-first smart building model that integrates RFID access control, PID-based HVAC temperature regulation, and adaptive lighting control using ESP32 microcontrollers. All sensing and actuation are centrally managed through a web dashboard, achieving <500 ms access response and <1 s environmental updates. A PID-controlled fan system maintains temperature within ±1 °C of a setpoint, while ambient-light-driven dimming automatically adjusts artificial lighting for energy efficiency. Compared to passive monitoring systems, this platform demonstrates real-time, closed-loop environmental control with secure centralized management, validating the feasibility of responsive, fully web-dependent building automation.

**Index Terms:** Access control, building automation, daylight harvesting, ESP32, HVAC control, Internet of Things, PID control, RFID, smart lighting, web-based control

---

## Table of Contents

1. [Introduction](#introduction)
2. [Use-Case Requirements](#use-case-requirements)
3. [System Architecture](#system-architecture)
4. [Design Requirements](#design-requirements)
5. [Design Trade Studies](#design-trade-studies)
6. [Hardware Components](#hardware-components)
7. [Software Stack](#software-stack)
8. [Verification Plan](#verification-plan)
9. [Project Management](#project-management)
10. [Related Work](#related-work)
11. [Quick Start](#quick-start)
12. [Repository Structure](#repository-structure)
13. [References](#references)

---

## Introduction

Modern buildings increasingly rely on automated systems to manage access control, lighting, and climate to improve security, energy efficiency, and occupant comfort. Traditionally, these subsystems operate as independent units with local controllers and limited integration, making centralized management difficult and reducing overall system visibility. Building managers and security personnel benefit from unified platforms that provide real-time monitoring, historical analytics, and remote control of critical infrastructure.

Existing commercial smart home and building automation products — such as standalone smart locks and thermostats — provide basic remote functionality but typically rely on proprietary ecosystems and distributed local control logic. These systems limit flexibility, make cross-vendor integration difficult, and provide limited quantitative assurance of response latency, system availability, or data integrity.

Our project explores a **fully web-dependent architecture** in which all sensing, decision-making, and actuation are coordinated through a centralized backend. This approach allows precise policy enforcement, complete system observability, and consistent integration across subsystems. The intended users are **building managers and security personnel** who require centralized RFID door access, lighting control, and environmental monitoring through a unified dashboard interface.

**Core Goals:**

1. **RFID Door Lock Access Control** — door unlock latency under 500 ms, with real-time policy enforcement and 100% audit logging
2. **Closed-Loop HVAC Temperature Regulation** — PID-controlled fans maintain temperature within ±0.5 °C of a user-defined setpoint across multiple rooms
3. **Adaptive Lighting with Daylight Harvesting** — ambient-light-driven PWM dimming with manual override through the dashboard

---

## Use-Case Requirements

The primary use case is centralized building management through a web-based platform. All requirements were identified with consideration for public health, safety, and welfare as well as environmental and economic factors.

### Access Control

| Requirement | Target |
|---|---|
| RFID credential detection | ≤ 50 ms from card presentation |
| Door lock actuation | ≤ 500 ms from initial swipe |
| Credential revocation enforcement | ≤ 100 ms after policy change |
| Access attempt logging | 100% with timestamps |

Safety and welfare drive these targets: reliable, low-latency door response reduces security risk and supports occupant safety.

### HVAC Temperature Regulation

| Requirement | Target |
|---|---|
| Temperature sampling rate | ≥ 1 Hz |
| Steady-state temperature accuracy | ± 0.5 °C of setpoint |
| Dashboard update latency | ≤ 1 s from measurement |
| Historical data retrieval (24-hour window) | ≤ 2 s |

Occupant welfare motivates the HVAC specifications; continuous temperature regulation within a comfort band supports a usable, comfortable environment.

### Lighting and Daylight Harvesting

| Requirement | Target |
|---|---|
| Ambient light update and response | ≤ 1 s from environmental change |
| Manual dashboard brightness update | ≤ 300 ms |
| Daylight harvesting | Continuous automatic adjustment |

Automatic lighting adjustment in response to ambient light reduces energy use and cost while meeting illumination needs.

### Web-Based Monitoring and Control

| Requirement | Target |
|---|---|
| Dashboard data display latency | ≤ 1 s from event occurrence |
| System availability | ≥ 99.9% during operation |
| Unauthorized access rejection | 100% |

---

## System Architecture

The system consists of four ESP32 nodes and three backend layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Web Dashboard (React)                        │
│   Dashboard │ Lighting │ Access Control │ Analytics │ Settings  │
└──────────────────────────┬──────────────────────────────────────┘
                    HTTPS / WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                Backend (FastAPI + TimescaleDB)                  │
│   /api/sensors  │  /api/lighting  │  /api/access                │
│   WebSocket     │  MQTT Broker    │  Redis (cache)              │
└──────┬──────────────────┬─────────────────┬─────────────────────┘
  WebSocket            WebSocket         HTTP POST
┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌────────────────┐
│  Room Node  │  │  Room Node  │  │  Room Node  │  │  Door Node     │
│  ESP32 #1   │  │  ESP32 #2   │  │  ESP32 #3   │  │  ESP32 #4      │
│ Living Room │  │  Bedroom    │  │  Kitchen    │  │  Entrance      │
│ ─────────── │  │ ─────────── │  │ ─────────── │  │ ──────────────│
│ BME280      │  │ BME280      │  │ BME280      │  │ MFRC522 RFID  │
│ TEMT6000    │  │ TEMT6000    │  │ TEMT6000    │  │ Solenoid Lock  │
│ PWM Dimmer  │  │ PWM Dimmer  │  │ PWM Dimmer  │  └────────────────┘
│ Fan Relay   │  │ Fan Relay   │  │ Fan Relay   │
└─────────────┘  └─────────────┘  └─────────────┘
```

### ESP32 Node Summary

| Node | Firmware | Sensors / Actuators | Device ID |
|------|----------|--------------------|-----------| 
| ESP32 #1 Room | `firmware/room-node` | BME280, TEMT6000, PWM dimmer, fan relay | `room-node-01` |
| ESP32 #2 Room | `firmware/room-node` | BME280, TEMT6000, PWM dimmer, fan relay | `room-node-02` |
| ESP32 #3 Room | `firmware/room-node` | BME280, TEMT6000, PWM dimmer, fan relay | `room-node-03` |
| ESP32 #4 Door | `firmware/door-control` | MFRC522 RFID, solenoid lock relay | `door-control-01` |

The **same firmware binary** (`firmware/room-node`) is flashed to all three room ESP32s.
Only `DEVICE_ROOM_ID` and `DEVICE_ROOM_LABEL` in `src/config.h` differ per room.

### Layer 1 — Physical Edge (ESP32 Nodes)

**Room nodes (×3):** Each room ESP32 collects environmental data (BME280), ambient
light (TEMT6000), and controls a PWM LED dimmer and a fan relay.  Data is streamed
to the backend via WebSocket every 2 s.  The backend can send dimmer, fan, relay, and
daylight-harvest commands back to the device in real time.

**Door node (×1):** The door ESP32 reads MFRC522 RFID cards and calls
`POST /api/access/check` for every scan.  The backend looks up the card in the
whitelist and returns `granted=true/false`.  On grant, the firmware energises the
solenoid relay for 3 s then locks again.  All attempts are logged.

### Layer 2 — Backend Services

- **FastAPI** (`backend/`) — HTTP + WebSocket entry points for devices and dashboard.
- **MQTT broker** — asynchronous publish-subscribe between devices and backend workers.
- **TimescaleDB** — time-series storage for sensor readings, relay states, fan states, access logs.
- **Redis** — optional cache for real-time device state.

### Layer 3 — Web Dashboard (React)

- Real-time sensor charts per room (temperature, humidity, light)
- Lighting control panel (dimmer slider, relay toggles, daylight harvesting, fan toggle)
- Access control log (card UID, device, result, timestamp)
- RFID card management (register / deactivate cards)
- Analytics (24-hour historical data)

### Data Flow: Access Control Latency Budget

| Stage | Time |
|---|---|
| RFID credential read | ~50 ms |
| Network transmission (Wi-Fi) | ~50 ms |
| Backend processing (DB lookup) | ~20 ms |
| Solenoid actuation | ~100 ms |
| **Total** | **~220 ms** (target: < 500 ms) |

### Security: Mutual TLS Handshake

1. ESP32 connects to `https://raspberrypi.local:8443`
2. Server presents certificate (signed by CA)
3. ESP32 validates server cert against embedded CA cert
4. Server requests client certificate
5. ESP32 presents client cert (signed by CA)
6. Server validates client cert and checks fingerprint allowlist
7. Encrypted session established

**First-connection handshake:** ~100–200 ms | **Session resumption:** ~20–50 ms

---

## Design Requirements

### Access Control Subsystem

- ESP32 must read RFID credentials and transmit over secure wireless with processing and transmission latency on the order of tens of milliseconds.
- Relay driver must provide sufficient current to actuate the solenoid reliably with electrical isolation and flyback protection.
- **Mutual TLS authentication** is required: only authorized ESP32 devices may communicate with the backend.

### HVAC Temperature Regulation Subsystem

- Sampling rate must be sufficient to detect meaningful environmental changes; selected rate is **1 Hz**.
- Closed-loop **PID controller** (discrete-time, implemented on ESP32) maintains temperature within the sensor accuracy range.
- Fan actuator must support variable PWM output for proportional control rather than simple on/off switching.
- Environmental data must be stored for historical trend analysis.

Discrete-time PID control law:

```
u[k] = Kp·e[k] + Ki·Ts·Σe[i] + Kd·(e[k] − e[k−1]) / Ts
```

where `u[k]` is the actuator (fan) output, `e[k]` is temperature error, `Ts` = 1 s (sampling period).

### Lighting and Daylight Harvesting Subsystem

- The BH1750 ambient light sensor communicates over I²C and outputs lux values directly (no ADC conversion required). It provides 1 lux resolution in high-resolution mode across a range that covers all relevant indoor lighting levels, well below the ~10 lux human perception threshold.
- PWM resolution: 8-bit (1/256 ≈ 0.39%, below the ~1% human visual perception threshold). PWM frequency: **5 kHz** (flicker-free).
- System supports both **manual dashboard control** and **automatic daylight harvesting** mode.

### Backend and Communication

- **MQTT** is the primary message broker (10–50 ms typical latency). Selected over polling (500–1000 ms) and Redis Streams (higher complexity).
- **HTTPS** for configuration and policy management; **WebSockets** for real-time telemetry to the dashboard.
- **TimescaleDB** for persistent time-series storage.

### Microcontroller Hardware Interfaces

The ESP32-S3 must support:

| Interface | Used For |
|---|---|
| SPI | RC522 RFID reader |
| I²C | BME280 sensors, BH1750 sensors, OLED display |
| PWM (LEDC) | Fan speed control, LED dimming |
| GPIO | Relay control |

---

## Design Trade Studies

### A. HVAC Temperature Control — Sampling Rate

The thermal dynamics of the model enclosure are approximated as a first-order system with a thermal time constant τ ≈ 20 s (bandwidth ≈ 0.008 Hz). The selected sampling rate of **1 Hz** exceeds the required minimum by more than an order of magnitude, ensuring stable PID control, accurate derivative estimation, and effective disturbance rejection. Higher rates were considered but rejected due to increased communication overhead without control performance benefit.

### B. PWM Resolution and Frequency

- 8-bit resolution (256 steps) → 1/256 = 0.39%, below the ~1% human brightness-change perception threshold → smooth, perceptibly continuous dimming.
- 5 kHz PWM frequency eliminates visible flicker (threshold ~100 Hz) and ensures stable actuator operation.

### C. Communication Architecture

| Architecture | Latency | Verdict |
|---|---|---|
| Polling | 500–1000 ms (poll interval) | ✗ Too slow |
| Redis Streams | 10–50 ms, higher complexity | Optional / alternative |
| **MQTT** | **10–50 ms, lightweight pub/sub** | **✓ Selected** |

MQTT was selected as the primary broker for best balance of low latency, scalability, and implementation simplicity.

### D. Access Control Latency

Total latency = T_RFID + T_network + T_process + T_actuation = 50 + 50 + 20 + 100 = **220 ms** < 500 ms requirement. ✓

### E. Lighting Sensor Resolution

The BH1750 ambient light sensor (I²C) provides a high-resolution mode with **1 lux resolution** across the indoor lighting range (1–65535 lux). This is well below the ~10 lux human perception threshold, providing accurate daylight harvesting control without ADC conversion overhead. The digital I²C interface also reduces noise susceptibility compared to analog sensor designs.

---

## Hardware Components

### ESP32-S3 Microcontroller (×1 DevKit, shared across nodes)

Selected for:
- **Hardware cryptographic acceleration** (AES, SHA-256, RSA) — reduces TLS handshake time by 60–80%
- **Dual-core architecture** — Core 0: Wi-Fi/network; Core 1: application logic (RFID, sensors)
- **Sufficient memory** — 512 KB SRAM, 8–16 MB Flash for certificates and libraries
- **Native Wi-Fi** — 802.11 b/g/n (2.4 GHz), no external module required

### BME280 Environmental Sensor (×3, one per room)

| Parameter | Specification |
|---|---|
| Temperature range | −40 °C to +85 °C |
| Temperature accuracy | ±0.5 °C typical @ 25 °C (±1 °C worst-case) |
| Temperature resolution | 0.01 °C |
| Humidity range / accuracy | 0–100% RH / ±3% RH |
| Pressure range | 300–1100 hPa |
| Interface | I²C (100/400 kHz) |
| Power consumption | 3.6 µA @ 1 Hz |

I²C address: 0x76 (SDO low, default) to avoid conflict with OLED (0x3C).

### RC522 / MFRC522 RFID Reader Module (×1)

- 13.56 MHz electromagnetic induction; read range 0–5 cm (intentionally short to prevent accidental reads and relay attacks)
- Supported cards: MIFARE Classic 1K/4K, MIFARE Ultralight, NTAG213/215/216
- SPI communication, up to 10 MHz; UID read time ~50 ms

### 12 V Mini Solenoid Door Lock (×1)

- Coil resistance: ~24 Ω | Inrush current: ~500 mA | Holding current: ~200 mA
- Mechanical actuation: < 100 ms
- Flyback diode (1N4007) required to clamp inductive kickback

### BH1750 Ambient Light Sensor (×3, one per room)

| Parameter | Specification |
|---|---|
| Interface | I²C |
| Range | 1–65535 lux |
| Resolution (high-res mode) | 1 lux |
| Measurement time | ~120 ms (high-res) |
| Supply voltage | 3.3 V / 5 V |

Selected over photoresistors (non-linear, slow) for its direct lux output and I²C integration. Used for daylight harvesting control in each room.

### N-Channel MOSFET PWM Dimmer (IRLZ44N, ×2 packs)

- Logic-level gate (3.3 V compatible with ESP32)
- Controls 12 V LED brightness via 8-bit PWM at 5 kHz
- High efficiency (~95%) vs. resistive dimming (~60%)
- TO-220 package; flyback diode (1N4007) for inductive loads

### 5 V 1-Channel Relay Module with Optocoupler (×1)

- Contact rating: suitable for HVAC fan switching
- Optocoupler isolation between ESP32 control signal and load circuit
- Active-low trigger (verify module jumper setting)

### 5 V Brushless Fans 30×30×10 mm (×3, one per room)

Used as HVAC actuators. Speed controlled via PWM from ESP32 (proportional PID output). Three fans — one per modeled room — allow independent temperature regulation.

### SSD1306 OLED Display (×1)

- 128×64 pixels, I²C (0x3C), 400 kHz
- Displays local system status and current environmental readings on the environmental node

### Power Supply System

| Supply | Specification | Used For |
|---|---|---|
| 12 V 2 A regulated PSU | 12 V @ 2 A | Solenoid lock, fan rail |
| 5 V 3 A regulated PSU | 5 V @ 3 A | ESP32 boards, relay module |
| LM2596 buck converter | 12 V → 5 V @ 3 A | Supplemental 5 V from 12 V rail |

**Power budget (typical operating):**

| Component | Current | Voltage | Power |
|---|---|---|---|
| ESP32-S3 (×1 DevKit, 3 logical nodes) | 200 mA each | 5 V | 3.0 W |
| RC522 RFID | 30 mA | 3.3 V | 0.1 W |
| BME280 ×3 | < 1 mA each | 3.3 V | ~0 W |
| BH1750 ×3 | < 1 mA each | 3.3 V | ~0 W |
| OLED | 10 mA | 3.3 V | 0.03 W |
| Relay module | 70 mA | 5 V | 0.35 W |
| Brushless fans ×3 | ~100 mA each | 5 V | 1.5 W |
| Solenoid (holding) | 200 mA | 12 V | 2.4 W |
| **Total (typical)** | | | **~7.4 W** |

---

## Software Stack

### Firmware (ESP32 — Arduino / PlatformIO)

Arduino framework with PlatformIO build system. Three independently deployable firmware projects:

1. **`firmware/door-control/`** — RFID access control, relay actuation, mTLS HTTPS
2. **`firmware/sensor-monitoring/`** — BME280 multi-room temperature reading, MQTT publish, OLED display
3. **`firmware/lighting-control/`** — BH1750 ambient sensing, MOSFET PWM dimming, relay control, daylight harvesting

Key libraries:

```cpp
#include <WiFi.h>              // ESP32 Wi-Fi (built-in)
#include <WiFiClientSecure.h>  // TLS/HTTPS
#include <WebSocketsClient.h>  // WebSocket (links2004 library)
#include <PubSubClient.h>      // MQTT client
#include <MFRC522.h>           // RFID reader
#include <Adafruit_BME280.h>   // Temperature/humidity/pressure sensor
#include <BH1750.h>            // Ambient light sensor (I²C)
#include <Adafruit_SSD1306.h>  // OLED display
#include <ArduinoJson.h>       // JSON parsing (v6)
```

### Backend (Python / FastAPI — Raspberry Pi)

FastAPI selected for native async/await support, auto-generated OpenAPI docs, and Python ecosystem integration.

```
backend/app/
├── main.py              # FastAPI app initialization
├── api/
│   ├── access.py        # Access control routes
│   ├── sensors.py       # Sensor data ingestion routes
│   └── lighting.py      # Lighting control routes
├── services/
│   ├── mqtt_client.py   # MQTT broker interface
│   └── db_client.py     # TimescaleDB interface
├── models/
│   └── sensor_data.py   # Database schemas
└── workers/
    └── stream_processor.py  # Async event processing
```

**Key API endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/access/validate` | Validate RFID UID against allowlist |
| `POST` | `/api/sensors/ingest/environmental` | BME280 temperature data ingestion |
| `POST` | `/api/sensors/ingest/lighting` | BH1750 ambient light data ingestion |
| `POST` | `/api/lighting/dimmer/{device_id}` | Set LED brightness (0–100%) |
| `POST` | `/api/lighting/relay/{device_id}` | Control relay state |
| `POST` | `/api/lighting/daylight-harvest/{device_id}` | Toggle daylight harvesting |
| `GET`  | `/api/sensors/history` | Retrieve 24-hour historical data |
| `WS`   | `/ws` | Real-time dashboard WebSocket stream |

**Framework comparison:**

| Framework | Req/sec | Async | Verdict |
|---|---|---|---|
| Flask | ~1,000 | Via extensions | — |
| Django | ~500 | Limited | — |
| **FastAPI** | **~20,000** | **Native** | **✓ Selected** |
| Node.js | ~25,000 | Native | — |

### Database (TimescaleDB)

PostgreSQL extension optimized for time-series data. Automatic data partitioning by time enables fast historical queries (24-hour window returned in < 2 s).

### Message Broker (MQTT — Mosquitto)

Runs on Raspberry Pi. ESP32 nodes publish sensor events and subscribe to actuator command topics. Typical end-to-end latency: 10–50 ms.

### Frontend (React)

Single-page application. Uses WebSocket connection to backend for live data; HTTP REST for configuration and policy management.

---

## Verification Plan

### A. Access Control Verification

Swipe known-good and known-bad RFID cards while measuring end-to-end latency (RFID detect → solenoid actuation) via firmware timing logs or oscilloscope.

- **Pass:** Door actuates within 500 ms; denied cards are rejected within 100 ms of policy revocation; 100% of attempts logged with timestamps.
- **Fail:** Latency > 500 ms, revocation delay > 100 ms, or missing log entries.

### B. HVAC Monitoring and Control Verification

Use sensor timestamps to confirm 1 Hz sampling rate. Monitor steady-state temperature against setpoint.

- **Pass:** Sampling at 1 Hz; temperature regulated within ±0.5 °C of setpoint under steady-state conditions; environmental data displayed on dashboard within 1 s; 24-hour historical data retrievable within 2 s.
- **Fail:** Sampling below 1 Hz, steady-state error > ±0.5 °C, or data not visible within 1 s.

### C. Lighting Control Verification

Send brightness commands from dashboard; measure response time via firmware logs or oscilloscope on PWM output pin.

- **Pass:** LED brightness changes within 300 ms of manual command; ambient light changes produce automatic brightness adjustment; PWM frequency confirmed at 5 kHz.
- **Fail:** Response > 300 ms, no automatic adjustment to ambient changes, or incorrect PWM frequency.

### D. Communication and Integration Validation

Run all three subsystems simultaneously for 24 hours.

- **Pass:** All sensor data transmitted, stored, and displayed without loss; dashboard updates within 1 s of measurement; access control, lighting, and environmental monitoring operate concurrently without failures.
- **Fail:** Any data loss, updates consistently > 1 s, or subsystem failures during combined operation.

---

## Project Management

### Schedule (12 Weeks)

| Phase | Weeks | Focus |
|---|---|---|
| 1 | 1–3 | System architecture; backend API + MQTT broker; TimescaleDB schema |
| 2 | 4–5 | Access control + environmental firmware; frontend dashboard foundation |
| 3 | 6–7 | Lighting firmware; hardware wiring and bring-up |
| 4 | 8–10 | Firmware–backend integration; dashboard–backend integration; full system integration |
| 5 | 11–12 | Latency and requirements verification; debug, hardening, and final demo |

Key milestones: completion of each phase (Weeks 3, 5, 7, 10, 12) and transition from integration to verification at Week 11.

### Team Responsibilities

**Mario Belmonte (MB)** — Primary: backend and web stack (FastAPI, MQTT topics, TimescaleDB schema, React dashboard), Raspberry Pi setup, CI pipeline, access-control / authorization logic, security configuration (TLS certificates, device provisioning), overall backend–ESP32 integration. Secondary: assist with firmware APIs, ESP32–backend communication debugging, documentation and final report.

**Cindy Chen (CC)** — Primary: embedded firmware and hardware integration (ESP32 bring-up, wiring of RFID, BME280, fans, BH1750, dimmers, relays), PID temperature control logic, lighting control logic, system architecture diagrams, requirements mapping, test/validation planning (latency measurements, multi-room behavior, safety checks). Secondary: dashboard UX and control flows, Gantt chart and risk tracking, user-facing documentation.

Both team members share responsibility for requirements refinement, design decisions, integration testing, and presentations/demos.

### Bill of Materials

| Description | Model | Qty | Unit Cost | Total |
|---|---|---|---|---|
| 30×30×10 mm 5 V brushless fans | 30x30x10mm 5V | 3 | $6.99 | $20.97 |
| BME280 temperature/humidity/pressure sensors (HiLetgo GY-BME280-3.3) | GY-BME280-3.3 | 3 | $8.99 | $26.97 |
| 12 V mini solenoid door lock | 12V mini solenoid | 1 | $16.99 | $16.99 |
| 5 V 1-channel relay module with optocoupler | 5V 1-CH Relay | 1 | $8.49 | $8.49 |
| RC522 / MFRC522 RFID reader kit (SPI, 13.56 MHz, with cards) | MFRC522 | 1 | $10.99 | $10.99 |
| Low-voltage LED PWM dimmers (12 V, knob style) | 12V PWM Dimmer | 3 | $9.99 | $29.97 |
| Ambient light sensors (BH1750 I²C modules) | BH1750 | 3 | $6.99 | $20.97 |
| USB wired keyboard (for Raspberry Pi 5) | USB Keyboard | 1 | $8.99 | $8.99 |
| ESP32-S3 DevKit-style board | ESP32-S3 DevKit | 1 | $30.99 | $30.99 |
| N-channel logic-level MOSFETs (IRLZ44N, TO-220) | IRLZ44N | 2 packs | $9.99 | $19.98 |
| Flyback diodes (1N4007, 100 pcs) | 1N4007 | 1 | $5.99 | $5.99 |
| 12 V 2 A regulated power supply | 12V 2A PSU | 1 | $11.99 | $11.99 |
| 5 V 3 A regulated power supply | 5V 3A PSU | 1 | $8.39 | $8.39 |
| LM2596 buck converter module (12 V → 5 V, 3 A) | LM2596 | 1 | $4.00 | $4.00 |
| **Total** | | | | **$225.68** |

All components are available through Amazon.

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Network/backend availability | Stable Wi-Fi (dedicated AP if needed); Raspberry Pi on wired Ethernet; fail-safe firmware (door stays locked if backend unreachable; fan defaults to safe mode from last valid setpoint) |
| Multi-room PID stability | Start with conservative gains; 1 Hz sampling; log temperature and fan commands to backend for offline tuning |
| End-to-end latency | Measure latency in integration tests; add timing logs in firmware and backend; optimize hot paths if measurements approach limits |
| Hardware/integration reliability | Test each subsystem independently before full integration; keep spare ESP32-S3 and critical parts; maintain single pinout and power-rail reference document |

---

## Related Work

**SmartWatt [10]** targets energy and cost savings through ML-based forecasting and appliance scheduling around solar and grid pricing. Our Smart Home Model treats the building as critical infrastructure — access, environmental control, and lighting are managed through a centralized web-based system, with emphasis on **security, policy enforcement, and real-time responsiveness** rather than energy optimization alone.

Lessons adapted from SmartWatt:

1. **Latency** — SmartWatt reports delays on the order of seconds; we target < 500 ms (access) and < 1 s (environmental/lighting) using WebSockets for live dashboard updates and MQTT for device messaging.
2. **Sensor and data quality** — We use specified-accuracy sensors (BME280) and TimescaleDB for logged, queryable historical data.
3. **Asynchronous design** — SmartWatt experienced UI freezes from synchronous heavy work. We use MQTT pub/sub so devices publish events and the backend processes asynchronously; the dashboard receives updates over WebSockets without blocking.

Commercial products (smart locks, thermostats, lighting systems) typically use proprietary ecosystems with distributed local control logic, limiting integration and transparency. Our project provides a **single, web-first control plane** with explicit latency and availability targets and full observability across access, environmental, and lighting state.

---

## Quick Start

See the detailed documentation in the `docs/` directory:

- **[docs/SETUP.md](docs/SETUP.md)** — Hardware assembly, software installation (PlatformIO, Python, Docker), configuration
- **[docs/WIRING.md](docs/WIRING.md)** — Exact pin connections for all 4 ESP32s
- **[docs/DEMO.md](docs/DEMO.md)** — Step-by-step final demo walkthrough
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Detailed system architecture diagrams
- **[docs/API.md](docs/API.md)** — Full API reference with example requests
- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** — Dashboard navigation, adding/revoking RFID cards
- **[docs/TESTING.md](docs/TESTING.md)** — Running tests for frontend, backend, and firmware

### Prerequisites

- Python 3.11+ and Docker
- PlatformIO CLI for ESP32 firmware (`pip install platformio`)
- Node.js 18+ for the frontend dashboard

### Basic Setup

```bash
# 1. Start infrastructure
cd infrastructure
docker compose up -d timescaledb mqtt redis

# 2. Configure and start backend
cd ../backend
cp .env.example .env    # fill in your settings
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Flash room-node firmware (repeat for each of 3 room ESP32s)
cd ../firmware/room-node
cp include/secrets.h.example include/secrets.h   # add WiFi creds + API_HOST
# Edit src/config.h to set DEVICE_ROOM_ID and DEVICE_ROOM_LABEL
pio run --target upload

# 4. Flash door-control firmware (door ESP32)
cd ../door-control
cp include/secrets.h.example include/secrets.h
pio run --target upload

# 5. Start the frontend dashboard
cd ../../frontend
npm install
cp .env.example .env    # set REACT_APP_API_URL=http://localhost:8000
npm start
```

Dashboard is available at **http://localhost:3000** in development.

---

## Repository Structure

```
smartHome/
├── backend/                  # FastAPI backend (Python)
│   ├── app/
│   │   ├── api/              # Endpoints: sensors, lighting, access, websocket
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # DB client, WebSocket manager, broker
│   ├── tests/                # pytest test suite (99 tests)
│   └── requirements.txt
├── firmware/                 # ESP32 firmware (PlatformIO / Arduino)
│   ├── room-node/            # Room ESP32 (BME280 + TEMT6000 + dimmer + fan) ← NEW
│   ├── door-control/         # Door ESP32 (RFID + solenoid lock)
│   ├── lighting-control/     # Legacy lighting-only firmware (kept for reference)
│   └── sensor-monitor/       # Legacy sensor-only firmware (kept for reference)
├── frontend/                 # React dashboard
├── docs/                     # Documentation
│   ├── SETUP.md              # Installation and hardware setup
│   ├── WIRING.md             # Pin connections for all 4 ESP32s ← NEW
│   ├── DEMO.md               # Final demo walkthrough ← NEW
│   ├── TESTING.md            # Test procedures
│   ├── API.md                # API reference
│   └── USER_GUIDE.md         # Dashboard user guide
├── hardware/            # Schematics, PCB files, BOM
├── infrastructure/      # Docker Compose, certs, deployment
├── scripts/             # Dev/deployment utility scripts
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

---

## References

[1] OASIS, "MQTT Version 3.1.1 Plus Errata 01," OASIS Standard, Dec. 2015. [Online]. Available: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/

[2] Bosch Sensortec, "BME280 Combined Humidity and Pressure Sensor," Data Sheet, Rev. 1.6, Oct. 2018.

[3] Espressif Systems, "ESP32-S3 Series: 2.4 GHz Wi-Fi and Bluetooth 5 (LE) System-on-Chip," Datasheet, v1.6, 2023.

[4] Rohm Semiconductor, "BH1750FVI Ambient Light Sensor IC," Technical Note, Rev. B, 2013.

[5] NXP Semiconductors, "MFRC522 Standard Performance MIFARE and NTAG Frontend," Data Sheet, Rev. 3.9, 2016.

[6] Timescale, Inc., "TimescaleDB: A Time-Series Database for PostgreSQL," White Paper, 2017. [Online]. Available: https://www.timescale.com/

[7] S. Raposo and contributors, "FastAPI Documentation," [Online]. Available: https://fastapi.tiangolo.com/

[8] Meta Platforms, Inc., "React: A JavaScript Library for Building User Interfaces," [Online]. Available: https://react.dev/

[9] I. Fette and A. Melnikov, "The WebSocket Protocol," RFC 6455, Dec. 2011.

[10] Team SmartWatt, "SmartWatt: Intelligent Residential Energy Management Using Predictive Scheduling," Carnegie Mellon Univ., ECE Capstone Project, Spring 2025. [Online]. Available: https://course.ece.cmu.edu/~ece500/projects/s25-teamd5/

---

*18-500 Design Project Report: A4 — Last updated: February 27, 2026*
