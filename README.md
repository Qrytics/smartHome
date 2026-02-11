# Smart Home Model: Web-First Building Management System
## Comprehensive Project Description

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Market Context & Motivation](#market-context--motivation)
3. [Problem Statement](#problem-statement)
4. [Proposed Solution](#proposed-solution)
5. [System Architecture](#system-architecture)
6. [Hardware Components](#hardware-components)
7. [Software Stack](#software-stack)
8. [Technical Requirements](#technical-requirements)
9. [Implementation Approach](#implementation-approach)
10. [Testing Strategy](#testing-strategy)
11. [Minimum Viable Product (MVP)](#minimum-viable-product-mvp)
12. [Comparison to Prior Work](#comparison-to-prior-work)
13. [Innovation & Contributions](#innovation--contributions)
14. [Timeline & Milestones](#timeline--milestones)
15. [Team Members](#team-members)

---

## Executive Summary

The **Smart Home Model** project is an 18-500 Capstone Design initiative that demonstrates the feasibility and limitations of fully centralizing building control through a web-based platform. Unlike traditional smart home systems that retain local control capabilities, our system intentionally creates complete dependency on a web dashboard to explore the critical question: **"How much control can be centralized before you risk losing it?"**

This project addresses the growing demand for integrated, intelligent building management systems in an era where artificial intelligence and cloud connectivity are rapidly expanding. By building a physical model house equipped with RFID-based access control, real-time environmental monitoring, and intelligent lighting control, we prove that sub-second latency web-first architectures are achievable for critical infrastructure—while simultaneously exposing the vulnerabilities inherent in such designs.

**Core Focus Areas:**
1. **RFID Door Lock Access Control:** Sub-500ms authorization from card swipe to lock actuation
2. **Real-Time Temperature Monitoring:** Sub-1-second dashboard updates with 100% data logging
3. **Intelligent Lighting Control:** Daylight harvesting with ambient light sensing for energy optimization

The system leverages modern asynchronous web technologies (FastAPI, Redis Streams, WebSockets, TimescaleDB) paired with ESP32 microcontrollers featuring hardware cryptographic acceleration. Through rigorous testing and optimization, we demonstrate that web-based building automation can meet the performance demands of security-critical applications—provided the network infrastructure and failsafe mechanisms are properly designed.

---

## Market Context & Motivation

### Growing Demand for Smart Home Integration

The smart home market is experiencing unprecedented growth, driven by two converging trends:

1. **Consumer demand for convenience:** Homeowners want centralized control of lighting, climate, security, and appliances through unified interfaces (smartphones, voice assistants, dashboards)

2. **AI integration:** Machine learning algorithms promise energy optimization, predictive maintenance, and personalized automation—but require continuous data collection and cloud processing

#### Market Data Analysis

**Smart Thermostat Market (Grand View Research):**

The market research data shows smart thermostats growing from approximately $1.5 billion (2024) to a projected $6+ billion by 2032, representing a compound annual growth rate (CAGR) of ~18%. This explosive growth indicates that consumers are willing to adopt connected devices that promise comfort and energy savings.

**Global Smart Devices Revenue (Statista):**

The broader smart home device market shows similar expansion, with global revenue expected to exceed $150 billion by 2026. Notably, the data highlights a significant uptick in **energy management** solutions between 2025-2026, suggesting increased interest in sustainability and cost control.

### The Crossover Opportunity

There's a clear intersection between these markets:
- Smart thermostats are fundamentally building management tools
- Energy management requires real-time sensor data and automated control
- Security systems (access control) share the same infrastructure needs
- Intelligent lighting contributes to both comfort and energy efficiency

Our project targets this crossover by building a unified platform that handles **security** (door locks), **environmental control** (temperature monitoring), and **energy management** (intelligent lighting)—three critical building management functions.

### Why This Matters for Building Managers

While consumer smart homes focus on convenience, **commercial buildings** (offices, hospitals, schools) have stricter requirements:

- **Security personnel** need centralized access logs and real-time revocation capabilities
- **Facility managers** require historical environmental data for HVAC optimization
- **Energy managers** demand lighting control and energy usage analytics
- **Compliance officers** demand audit trails proving 100% data retention

Current solutions often use proprietary, closed systems with high vendor lock-in. Our open-source, web-first approach demonstrates an alternative that prioritizes:
- **Transparency:** All code and protocols documented
- **Flexibility:** Standard web technologies enable easy customization
- **Cost-effectiveness:** Commodity hardware (ESP32, Raspberry Pi) instead of specialized controllers

---

## Problem Statement

### The Central Question

**How much control can be centralized in a web-based platform before system dependency becomes a critical vulnerability?**

This question has become increasingly relevant as:
- IoT devices proliferate (projected 30+ billion connected devices by 2030)
- Cloud outages cause widespread service disruptions (AWS, Azure incidents)
- Cybersecurity threats target building automation systems (ransomware attacks on HVAC)

### Specific Challenges Addressed

#### 1. Latency Constraints

**Problem:** Traditional web applications accept 1-2 second response times, but physical security systems require **immediate** feedback. A door lock that responds slowly:
- Frustrates users (perceived as "broken")
- Creates security vulnerabilities (tailgating attacks during unlock delay)
- Fails safety requirements (emergency egress must be instantaneous)

**Our Target:** <500ms end-to-end latency (competitive with local control systems)

#### 2. Real-Time Data Synchronization

**Problem:** Environmental monitoring generates high-frequency data (1 Hz or faster), overwhelming synchronous request-response architectures. Past projects (e.g., SmartWatt) experienced:
- UI freezing during heavy computation
- Data loss under concurrent load
- Inconsistent dashboard updates

**Our Target:** <1 second dashboard updates with zero data loss

#### 3. Secure Device Communication

**Problem:** IoT devices are notorious for weak security:
- Hardcoded credentials
- Unencrypted communication
- No device authentication

A compromised access control system is worse than no system at all.

**Our Target:** Mutual TLS authentication with <200ms handshake overhead

#### 4. Fail-Safe Behavior

**Problem:** When web-dependent systems lose connectivity, they often:
- Fail insecurely (doors unlock)
- Fail silently (no error indication)
- Require manual recovery (physical reset)

**Our Target:** Automatic offline detection (5s) with secure default state

---

## Proposed Solution

### High-Level Concept

We propose a **fully integrated model building** (12"x12"x12" physical structure) with three primary subsystems:

1. **Access Control System:**
   - RFID card reader (RC522 module)
   - Electromagnetic door lock (12V solenoid)
   - ESP32 microcontroller with WiFi
   - Real-time authorization via web API (<500ms)
   - Permission management dashboard

2. **Environmental Monitoring System:**
   - BME280 temperature/humidity/pressure sensor
   - ESP32 microcontroller with WiFi
   - WebSocket-based real-time data streaming
   - TimescaleDB time-series database
   - Historical analytics dashboard

3. **Lighting Control System:**
   - TEMT6000 ambient light sensor
   - PWM dimmer module for LED brightness control
   - 4-channel relay module for high-power loads
   - ESP32 microcontroller with WiFi
   - Daylight harvesting for energy optimization
   - Real-time control via WebSocket

**Critical Design Decision:** The physical model is **intentionally rendered inoperative** without the web platform. This forces us to:
- Optimize every millisecond of latency
- Implement bulletproof error handling
- Design meaningful failsafe states

### Key Innovation: Event-Driven Architecture

Unlike synchronous request-response systems, we use **Redis Streams** as a message broker:

ESP32 → Publishes event → Redis Stream → Backend worker consumes ↓ Immediate ACK to ESP32 ↓ (Processing happens async)

**Benefits:**
- ESP32 doesn't wait for database writes (faster response)
- Backend can batch process events (higher throughput)
- System naturally handles load spikes (buffering)

### System Layers

**Layer 1: Physical Edge (ESP32 + Sensors/Actuators)**
- Collects sensor data (temperature, RFID swipes)
- Actuates devices (solenoid lock)
- Establishes secure TLS connections
- Detects offline states

**Layer 2: Backend Services (Raspberry Pi)**
- FastAPI gateway (HTTP/WebSocket entry point)
- Redis Streams (event buffer + pub/sub)
- TimescaleDB (time-series persistence)
- Stream processor (background worker)

**Layer 3: User Interface (React Dashboard)**
- Real-time temperature graphs (live updates)
- Real-time light level monitoring (ambient lux)
- Access control logs (granted/denied attempts)
- Lighting control panel (dimmer, relays, daylight harvesting)
- Policy management (add/revoke RFID cards)
- Historical analytics (24-hour queries)

---

## System Architecture

### Data Flow: Access Control

**Key Latency Components:**
- TLS handshake: ~50-150ms (first connection, then cached)
- Network RTT: ~10-50ms (local WiFi)
- Redis SET lookup: ~1ms (in-memory)
- HTTP processing: ~5-20ms
- **Total budget:** <500ms (includes actuation time)

### Data Flow: Temperature Monitoring

**Key Performance Points:**
- BME280 read time: ~8ms (I2C transaction)
- WebSocket send: ~5-10ms (no HTTP overhead)
- Redis Pub/Sub latency: ~1-5ms
- Dashboard update: ~50-200ms (browser render)
- **Total:** <1 second

### Data Flow: Lighting Control

**Sensor Reading Path:**
- TEMT6000 ADC read: ~1ms (analog conversion)
- Lux calculation: <1ms (arithmetic)
- Daylight harvesting logic: ~1ms (brightness mapping)
- PWM dimmer update: ~1ms (hardware PWM)
- WebSocket data send: ~5-10ms
- **Total:** <20ms (sensor-to-control loop)

**Remote Control Path:**
- Dashboard command → Backend API: ~10-50ms
- Redis Pub/Sub → WebSocket: ~1-5ms
- ESP32 receives command: ~5-10ms
- PWM/Relay actuation: ~1-10ms
- **Total:** <100ms (command-to-actuation)

### Security Architecture

**Mutual TLS Handshake:**

1. ESP32 connects to `https://raspberrypi.local:8443`
2. Server presents certificate (signed by CA)
3. ESP32 validates server cert against embedded CA cert
4. Server requests client certificate
5. ESP32 presents client cert (signed by CA)
6. Server validates client cert against CA and checks fingerprint whitelist
7. Connection established (encrypted session)

**Total handshake time:** ~100-200ms (first connection)  
**Session resumption:** ~20-50ms (subsequent connections)

---

## Hardware Components

### ESP32-S3 Microcontroller (Quantity: 3)

**Why ESP32-S3?**

The ESP32-S3 was chosen over alternatives (Arduino, Raspberry Pi Pico) for specific technical reasons:

1. **Hardware Cryptographic Acceleration:**
   - AES, SHA-256, RSA coprocessors
   - Reduces TLS handshake time by 60-80%
   - Critical for meeting <200ms overhead target

2. **Dual-Core Architecture:**
   - Core 0: WiFi/network stack
   - Core 1: Application logic (RFID, sensors)
   - Prevents network interrupts from blocking sensor reads

3. **Native WiFi + Bluetooth:**
   - No external WiFi module needed
   - 802.11 b/g/n (2.4GHz) with acceptable range (30+ feet)
   - Bluetooth reserved for future proximity detection

4. **Sufficient Memory:**
   - 512KB SRAM (vs. 320KB on ESP32 original)
   - 8-16MB Flash for TLS certificates and libraries
   - No external memory chips required

**Pinout Strategy:**

We carefully selected GPIO pins to avoid conflicts with built-in peripherals:

- **SPI pins** (RFID): GPIO 10-13 (VSPI interface)
- **I2C pins** (BME280, OLED): GPIO 21-22 (can share bus)
- **GPIO output** (Door Relay): GPIO 4 (far from ADC pins to reduce noise)
- **ADC input** (TEMT6000): GPIO 34 (ADC1_CH6, dedicated analog input)
- **PWM output** (Dimmer): GPIO 25 (LEDC channel)
- **GPIO outputs** (4-Ch Relay): GPIO 26, 27, 14, 12 (relay channels 1-4)

### BME280 Environmental Sensor

**Technical Specifications:**

| Parameter | Specification | Relevance |
|-----------|--------------|-----------|
| Temperature range | -40°C to +85°C | Covers all indoor scenarios |
| Temperature accuracy | ±0.5°C @ 25°C | Sufficient for HVAC control |
| Temperature resolution | 0.01°C | Enables detecting small changes |
| Humidity range | 0-100% RH | Full scale coverage |
| Humidity accuracy | ±3% RH | Industry standard |
| Pressure range | 300-1100 hPa | Sea level to high altitude |
| Interface | I2C (100/400 kHz) | Standard protocol |
| Power consumption | 3.6 µA @ 1Hz | Negligible power draw |

**Why BME280 over alternatives?**

- **DHT22:** Lower accuracy (±2°C), slower read time (~2s)
- **DS18B20:** Temperature-only, requires 1-Wire protocol
- **SHT31:** More expensive ($15 vs. $10), no pressure sensing
- **BME680:** Adds gas sensor (not needed), 3x cost

The BME280 offers the best price/performance ratio for multi-parameter environmental monitoring.

**I2C Address Configuration:**

- Default: 0x76 (SDO pin LOW)
- Alternate: 0x77 (SDO pin HIGH)

We use 0x76 to avoid conflicts with OLED (0x3C/0x3D).

### RFID-RC522 Reader Module

**Operating Principle:**

The RC522 uses 13.56 MHz electromagnetic induction to communicate with passive RFID cards:

1. Reader generates RF field (antenna coil)
2. Card enters field → induces current in card antenna
3. Card modulates RF field with its UID (data)
4. Reader detects modulation and decodes UID

**Supported Card Types:**
- MIFARE Classic 1K/4K (most common)
- MIFARE Ultralight (transit cards)
- NTAG213/215/216 (NFC tags)

**Read Range:**
- Optimal: 0-3 cm (very close proximity)
- Maximum: ~5 cm (larger cards/antennas)

**Why short range is a feature:**

Unlike long-range RFID (UHF, 5-10 meter range), the 13.56 MHz short range:
- Prevents accidental reads (user must intentionally swipe)
- Reduces relay attacks (attacker must be very close)
- Complies with access control best practices (intentional action)

**SPI Communication:**

The RC522 uses SPI for high-speed data transfer:
- Clock frequency: up to 10 MHz
- Read UID time: ~50ms (includes anticollision protocol)
- SPI mode: MODE0 (CPOL=0, CPHA=0)

### 12V Solenoid Door Lock

**Electrical Characteristics:**

- **Coil resistance:** ~24Ω (nominal)
- **Inrush current:** ~500mA (first 100ms)
- **Holding current:** ~200mA (steady state)
- **Actuation time:** <100ms (mechanical response)
- **Duty cycle:** 100% (can remain energized)

**Power Calculation:**
- P = V² / R = 12² / 24 = 6W (instantaneous)
- P = V × I = 12 × 0.2 = 2.4W (holding)

**Flyback Diode:**

Essential for protecting relay contacts from inductive kickback:

When relay opens, collapsing magnetic field generates voltage spike (~50-100V). Diode clamps this to safe level.

### SSD1306 OLED Display

**Display Technology:**

- **Type:** Passive-matrix OLED (organic light-emitting diode)
- **Benefits over LCD:**
  - No backlight (each pixel emits light)
  - True black (pixels off = no light)
  - Wide viewing angle (>160°)
  - Fast response time (<1ms)

**Resolution:** 128x64 pixels (monochrome white)

**Text Display Capacity:**
- 8 lines × 21 characters (6x8 font)
- 4 lines × 10 characters (12x16 font) ← **We use this**

**I2C Communication:**

- Address: 0x3C (default) or 0x3D (if ADR pin tied high)
- Clock speed: 400 kHz (fast mode)
- Frame buffer size: 128×64÷8 = 1024 bytes
- Screen refresh: ~15-30ms (full redraw)

### TEMT6000 Ambient Light Sensor

**Operating Principle:**

The TEMT6000 is an analog light sensor that converts ambient light intensity into a voltage output:

- **Type:** Phototransistor-based sensor
- **Output:** Analog voltage (0-3.3V proportional to light level)
- **Response:** Linear across visible spectrum
- **Peak sensitivity:** ~570nm (green-yellow, matching human eye response)

**Technical Specifications:**

| Parameter | Specification | Relevance |
|-----------|--------------|-----------|
| Voltage range | 0-3.3V | Direct connection to ESP32 ADC |
| Light range | 0-1000+ lux | Covers indoor/outdoor scenarios |
| Response time | <1ms | Real-time sensing |
| Viewing angle | ~60° | Sufficient for room coverage |
| Power consumption | <1mA | Negligible power draw |

**Why TEMT6000 over alternatives?**

- **BH1750:** Digital I2C sensor, more expensive, slower (120ms read time)
- **Photoresistor (LDR):** Non-linear response, slower, less accurate
- **TSL2561:** More complex, requires calibration, higher cost

The TEMT6000 offers simple analog output with fast response time, ideal for real-time daylight harvesting.

**Connection:**
- VCC → 3.3V
- GND → GND
- SIG → GPIO 34 (ADC1_CH6 on ESP32)

### PWM Dimmer Module (MOSFET-based)

**Hardware Type:**

- **MOSFET:** IRF520 or IRF540N (N-channel power MOSFET)
- **Purpose:** LED brightness control via pulse-width modulation
- **Control:** Low-voltage PWM signal from ESP32 (3.3V)
- **Load:** 12V LED strips or panels

**Technical Specifications:**

| Parameter | Specification | Notes |
|-----------|--------------|-------|
| Input voltage | 5V (module logic) | From ESP32 5V pin |
| Output voltage | 12V (LED supply) | From external power supply |
| Max current | 5-10A | Depends on MOSFET model |
| PWM frequency | 5 kHz | Flicker-free for human vision |
| Duty cycle range | 0-100% | Full brightness control |

**How PWM Dimming Works:**

1. ESP32 generates PWM signal (0-255 duty cycle)
2. MOSFET switches LED power on/off rapidly (5000 times/sec)
3. Higher duty cycle = longer "on" time = brighter LED
4. Human eye perceives average brightness (no flicker at 5kHz)

**Benefits over linear dimming:**
- High efficiency (~95% vs. 60% for resistive dimming)
- No heat generation in control circuit
- Smooth brightness control

### 4-Channel Relay Module

**Hardware Type:**

- **Relay type:** Electromechanical (SPDT - Single Pole Double Throw)
- **Coil voltage:** 5V (controlled by ESP32)
- **Contact rating:** 10A @ 250VAC / 30VDC per channel
- **Isolation:** Optical isolation between control and load circuits

**Use Cases:**

1. **Main lighting control:** Switch overhead lights on/off
2. **HVAC fan control:** Turn ventilation fans on/off
3. **Auxiliary loads:** Control any high-power device
4. **Safety interlocks:** Emergency lighting circuits

**Technical Details:**

- **Response time:** ~10ms (mechanical actuation)
- **Lifetime:** 100,000+ cycles (mechanical relays)
- **Active state:** Low (relay energized when GPIO LOW) or High (configurable)
- **Flyback protection:** Built-in diodes on most modules

**Pin Connections:**
- IN1-IN4 → GPIO 26, 27, 14, 12 (channel control)
- VCC → 5V (coil power)
- GND → GND

**Safety Note:** Always use appropriate wire gauges and fuses when switching high-power AC loads. Follow local electrical codes.

### Power Supply System

**Buck Converter Selection:**

LM2596-based modules chosen for:
- High efficiency (~85%) vs. linear regulators (~40%)
- Low heat generation (important in enclosed model)
- Adjustable output (potentiometer tuning)
- Overcurrent protection (built-in)

**Voltage Tolerances:**

| Component | Nominal | Min | Max | Notes |
|-----------|---------|-----|-----|-------|
| ESP32-S3 | 5V (USB) | 4.5V | 5.5V | Or 3.3V on VIN pin |
| RFID-RC522 | 3.3V | 3.0V | 3.6V | NOT 5V tolerant |
| BME280 | 3.3V | 1.7V | 3.6V | Logic level |
| TEMT6000 | 3.3V | 3.0V | 3.6V | Analog sensor |
| OLED | 3.3-5V | 3.0V | 5.5V | Most modules auto-detect |
| PWM Dimmer | 5V (logic) | 4.5V | 5.5V | Plus 12V for LED supply |
| Relay Module | 5V | 4.5V | 5.5V | Coil voltage |
| Solenoid | 12V | 10V | 14V | Tolerance ±15% |
| LED Strips | 12V | 11V | 13V | Via dimmer module |

**Power Budget (Total System):**

| Component | Current | Voltage | Power | Duty Cycle |
|-----------|---------|---------|-------|------------|
| ESP32 #1 (Door) | 200mA | 5V | 1.0W | 100% |
| ESP32 #2 (Env) | 200mA | 5V | 1.0W | 100% |
| ESP32 #3 (Light) | 200mA | 5V | 1.0W | 100% |
| RFID | 30mA | 3.3V | 0.1W | 100% |
| BME280 | <1mA | 3.3V | ~0W | 100% |
| TEMT6000 | <1mA | 3.3V | ~0W | 100% |
| OLED | 10mA | 3.3V | 0.03W | 100% |
| PWM Dimmer | 5mA | 5V | 0.025W | 100% |
| 4-Ch Relay (coils) | 280mA | 5V | 1.4W | 25% (avg) |
| Solenoid | 200mA | 12V | 2.4W | 10% (avg) |
| LED Strips | 500mA | 12V | 6.0W | 50% (avg) |
| **Total** | - | - | **13.0W** | Peak |
| **Avg** | - | - | **6.9W** | Typical |

**Safety Factor:** 12V 5A = 60W capacity → 60W / 13.0W = **4.6x headroom**

**Note:** Power supply upgraded to 5A to accommodate LED strips and multiple relay channels operating simultaneously.

---

## Software Stack

### Firmware (ESP32)

**Development Framework Options:**

| Framework | Pros | Cons | Our Choice |
|-----------|------|------|------------|
| Arduino | Easy, huge library support | Less control, bloated | **Use for MVP** |
| ESP-IDF | Full hardware control, optimized | Steeper learning curve | Migrate if needed |
| MicroPython | Rapid prototyping | Slow, high memory use | Too slow |

**Arduino chosen because:**
- Extensive RFID/sensor libraries (MFRC522, Adafruit BME280)
- TLS/HTTPS support via WiFiClientSecure
- PlatformIO provides professional build system (better than Arduino IDE)

**Key Libraries:**

```cpp
// Network
#include <WiFi.h>              // ESP32 WiFi (built-in)
#include <HTTPClient.h>        // HTTP requests
#include <WiFiClientSecure.h>  // TLS/HTTPS
#include <WebSocketsClient.h>  // WebSocket (links2004 library)

// Sensors & Actuators
#include <MFRC522.h>           // RFID reader
#include <Adafruit_BME280.h>   // Temperature sensor
#include <Adafruit_SSD1306.h>  // OLED display

// Data handling
#include <ArduinoJson.h>       // JSON parsing (v6)
#include <SPI.h>               // Serial Peripheral Interface
#include <Wire.h>              // I2C (Two-Wire Interface)
```

**Firmware Projects:**

1. **door-control/** - RFID access control with solenoid lock
2. **sensor-monitoring/** - BME280 environmental data collection
3. **lighting-control/** - TEMT6000 light sensing with PWM dimming and relay control

Each firmware project is independently deployable with its own PlatformIO configuration.

Backend (Python/FastAPI)
Why FastAPI?

Comparison with alternatives:

Framework	Request/sec	Async Support	Documentation
Flask	~1,000	Via extensions	Good
Django	~500	Limited	Excellent
FastAPI	~20,000	Native	Auto-generated
Node.js	~25,000	Native	Goood
FastAPI wins because:

- async/await native: Non-blocking I/O crucial for WebSockets
- Type hints: Pydantic models catch errors at development time
- OpenAPI docs: Auto-generates Swagger UI for testing
- Python ecosystem: Easy integration with scientific libraries (future ML)

Backend Architecture Pattern:

Python

    app/
    ├── main.py           # FastAPI app initialization
    ├── api/              # HTTP endpoints
    │   ├── access.py     # Access control routes
    │   ├── sensors.py    # Sensor data ingestion routes
    │   └── lighting.py   # Lighting control routes
    ├── services/         # Business logic
    │   ├── redis_client.py
    │   └── db_client.py
    ├── models/           # Database schemas
    │   └── sensor_data.py
    └── workers/          # Background tasks
        └── stream_processor.py

This follows separation of concerns:

- API layer: Request validation, response formatting
- Service layer: Business logic (authorization checks)
- Workers: Async data processing (database writes)

**Key API Endpoints:**

- `POST /api/sensors/ingest/environmental` - BME280 data ingestion
- `POST /api/sensors/ingest/lighting` - TEMT6000 data ingestion
- `POST /api/lighting/dimmer/{device_id}` - Set LED brightness
- `POST /api/lighting/relay/{device_id}` - Control relay state
- `POST /api/lighting/daylight-harvest/{device_id}` - Toggle daylight harvesting
- Database (TimescaleDB)
