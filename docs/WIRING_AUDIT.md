# Wiring & Safety Audit Report

**Date:** 2026-03-25
**Scope:** All 4 ESP32 nodes (3 room nodes + 1 door node), plus legacy firmware
**Documents reviewed:** `WIRING.md`, `SETUP.md`, `DEMO.md`, `ARCHITECTURE.md`, `Design-Report.md`, `BUY_LIST.md`, `hardware/bom.csv`, all `config.h` files, all `main.cpp` files, all `platformio.ini` files, firmware READMEs

---

## Executive Summary

The wiring documentation is well-structured and mostly internally consistent between `WIRING.md` and the firmware `config.h` files. However, the audit uncovered **4 critical issues**, **5 major issues**, and **several minor issues** that should be resolved before the system is considered safe and production-ready.

| Severity | Count | Examples |
|----------|-------|---------|
| **CRITICAL** | 4 | GPIO pin availability mismatch with ESP32-S3; missing flyback diodes on inductive loads; boot-time relay activation risk; door relay voltage mismatch in BOM |
| **MAJOR** | 5 | Sensor type inconsistency (BH1750 vs TEMT6000); missing pull-down on relay GPIOs; 12V power budget marginal for 3 rooms; lighting-control GPIO 12 strapping conflict; SPI.begin() without explicit pins |
| **MINOR** | 6 | BOM resistor note error; BUY_LIST relay quantity; room-node relay1-4 phantom code; no fuse protection; no NTP timestamps; missing WIRING.md entries for legacy firmware |

---

## 1. GPIO Pin Conflict Analysis

### 1.1 Room Node (ESP32 #1, #2, #3)

| GPIO | Function | Direction | Conflict? |
|------|----------|-----------|-----------|
| 21 | I2C SDA (BME280) | Bidirectional | None |
| 22 | I2C SCL (BME280) | Output | None |
| 34 | TEMT6000 analog (ADC1_CH6) | Input | None |
| 25 | PWM dimmer (LEDC) | Output | None |
| 26 | Fan relay IN | Output | None |
| 2 | Status LED | Output | None |

**Verdict:** No intra-node GPIO conflicts. All six pins are unique. ✅

### 1.2 Door Node (ESP32 #4)

| GPIO | Function | Direction | Conflict? |
|------|----------|-----------|-----------|
| 5 | RFID SS (SPI CS) | Output | None |
| 11 | SPI MOSI (FSPI_MOSI) | Output | None |
| 12 | SPI SCK (FSPI_CLK) | Output | None |
| 13 | SPI MISO (FSPI_MISO) | Input | None |
| 22 | RFID RST | Output | None |
| 4 | Solenoid relay IN | Output | None |
| 2 | Status LED | Output | None |

**Verdict:** No intra-node GPIO conflicts. All seven pins are unique. ✅

### 1.3 Lighting Control (Legacy)

| GPIO | Function | Direction | Conflict? |
|------|----------|-----------|-----------|
| 34 | TEMT6000 analog | Input | None |
| 25 | PWM dimmer | Output | None |
| 26 | Relay CH1 | Output | None |
| 27 | Relay CH2 | Output | None |
| 14 | Relay CH3 | Output | None |
| 12 | Relay CH4 | Output | **⚠️ Strapping pin** |

**Verdict:** No pin-to-pin conflict, but GPIO 12 is a boot strapping pin on original ESP32 (see §3.4). ⚠️

### 1.4 Sensor Monitor (Legacy)

| GPIO | Function | Conflict? |
|------|----------|-----------|
| 21 | I2C SDA (BME280 + OLED) | None |
| 22 | I2C SCL (BME280 + OLED) | None |

**Verdict:** No GPIO conflicts. ✅

### 1.5 Cross-Node Summary

Since each ESP32 is a physically separate microcontroller, there are no cross-node GPIO conflicts by definition. ✅

---

## 2. CRITICAL: ESP32-S3 vs. Original ESP32 GPIO Availability

### The Problem

All documentation (WIRING.md, platformio.ini, READMEs) states the board is **"ESP32-S3 DevKit C1"** and platformio.ini targets `board = esp32-s3-devkitc-1`. However, the GPIO numbers used throughout the project exhibit a fundamental contradiction:

**Room node pins are valid for original ESP32 but NOT ESP32-S3:**

| GPIO | Used For | Original ESP32 | ESP32-S3-DevKitC-1 |
|------|----------|----------------|---------------------|
| 22 | I2C SCL | ✅ Available | ❌ Not exposed (internal flash) |
| 25 | PWM dimmer | ✅ Available (DAC1) | ❌ Not exposed (internal flash) |
| 26 | Fan relay | ✅ Available (DAC2) | ❌ Not exposed (SPI flash bus) |
| 34 | TEMT6000 ADC | ✅ Available (input-only) | ❌ Not exposed (PSRAM on N8R2) |

**Door node SPI pins are valid for ESP32-S3 but NOT original ESP32:**

| GPIO | Used For | Original ESP32 | ESP32-S3 |
|------|----------|----------------|----------|
| 11 | SPI MOSI | ❌ Internal flash pin | ✅ FSPI_MOSI |
| 12 | SPI SCK | ⚠️ Strapping pin | ✅ FSPI_CLK |
| 13 | SPI MISO | ✅ HSPI_MOSI | ✅ FSPI_MISO |

### Analysis

On the ESP32-S3-WROOM-1 module (used on DevKitC-1 boards), GPIOs 22–25 are **not routed to external pads** (used internally), and GPIOs 26–37 are reserved for SPI flash and/or PSRAM depending on module variant. The standard N8R2 variant has available GPIOs: **0–21, 35–48**.

This means:
- The **room-node firmware** uses original-ESP32 pin assignments and would malfunction (or crash) on actual ESP32-S3 hardware
- The **door-node firmware** uses ESP32-S3-specific SPI pins that would conflict with internal flash on original ESP32

### Root Cause

The GPIO assignments appear to be carried over from original ESP32 development, while the PlatformIO and documentation were updated to reference ESP32-S3 without updating the pin assignments.

### Evidence

WIRING.md line 63 explicitly states: _"GPIO 34 is an **input-only** pin on ESP32"_ — this is true for the original ESP32 where GPIO 34–39 are input-only. On ESP32-S3, there are no input-only GPIOs; all GPIOs support both input and output.

### Recommendation

**Option A (if hardware is actually original ESP32):** Update all documentation and `platformio.ini` to target `esp32dev` instead of `esp32-s3-devkitc-1`. Update the door-node SPI pins to use the original ESP32 VSPI/HSPI defaults (MOSI=23, MISO=19, SCK=18).

**Option B (if hardware is actually ESP32-S3):** Update all room-node pin assignments to use GPIOs available on ESP32-S3 (0–21, 35–48). For example:
- I2C SDA: GPIO 8, SCL: GPIO 9
- TEMT6000: GPIO 1 or any ADC-capable pin in 0–21 range
- PWM dimmer: GPIO 38
- Fan relay: GPIO 39

---

## 3. Voltage Level Analysis

### 3.1 ESP32 GPIO Levels ✅

All GPIO connections use 3.3V logic as required:
- BME280 VCC: 3.3V ✅
- TEMT6000 VCC: 3.3V ✅
- MFRC522 VCC: 3.3V ✅ (correctly warned as "3.3V only" in WIRING.md)
- Status LED: 3.3V via 330Ω → ~4mA (safe for GPIO and LED) ✅

### 3.2 Relay Module Interface ✅

- Relay modules powered from 5V (coil power) ✅
- Control signal from 3.3V GPIO — most common relay modules with optocoupler trigger at 3.3V ✅
- Electrical isolation between ESP32 and load circuit via relay contacts ✅

### 3.3 12V Load Isolation ✅

- Fan: Switched by relay (NO/COM terminals), 12V supply isolated from ESP32 ✅
- Solenoid: Switched by relay (NO/COM terminals), 12V supply isolated from ESP32 ✅
- LED strip: Controlled by PWM dimmer module, 12V supply isolated from ESP32 ✅
- WIRING.md checklist includes "12V supply is not connected to ESP32 GPIO pins" ✅

### 3.4 MFRC522 Voltage Warning ✅

WIRING.md correctly warns: _"The MFRC522 is a **3.3V device**. Applying 5V will damage it."_ This is critical and well-documented. ✅

---

## 4. Pull-up/Pull-down Resistor Requirements

### 4.1 I2C Pull-ups ✅

- SDA (GPIO 21): 4.7kΩ pull-up to 3.3V — documented in WIRING.md ✅
- SCL (GPIO 22): 4.7kΩ pull-up to 3.3V — documented in WIRING.md ✅
- Note: Many BME280 breakout modules include on-board pull-ups. WIRING.md should note this to avoid double pull-up (though not harmful, it reduces bus speed marginally).

### 4.2 TEMT6000 Pull-down ✅

- SIG (GPIO 34): 10kΩ pull-down to GND — documented in WIRING.md ✅

### 4.3 CRITICAL: Missing Pull-downs on Relay GPIOs ❌

**Neither WIRING.md nor any config document specifies pull-down resistors on relay control pins.**

| Node | Relay GPIO | Risk |
|------|-----------|------|
| Room node | GPIO 26 (fan relay) | Fan may briefly spin during boot |
| Door node | GPIO 4 (solenoid relay) | **Door may briefly unlock during boot** |

During ESP32 boot/reset, GPIO pins are in a high-impedance (floating) state until the firmware configures them. If the relay module input floats HIGH, the relay activates momentarily.

**For the door lock, this is a security vulnerability**: every power cycle or reset could cause a momentary unlock.

**Recommendation:** Add 10kΩ pull-down resistors from each relay control GPIO to GND. This ensures relays stay off during boot.

### 4.4 SPI Pull-ups (Door Node)

SPI is a push-pull interface and does not require external pull-up or pull-down resistors. ✅

### 4.5 RFID RST Pin

The MFRC522 RST pin (GPIO 22) has no documented external pull-up/pull-down. The MFRC522 module typically includes an internal pull-down or the library drives it explicitly. This is acceptable for prototyping but an external 10kΩ pull-up to 3.3V is recommended for reliability in production.

---

## 5. I2C Address Analysis

### 5.1 Room Node I2C Bus

| Device | Address | Source |
|--------|---------|--------|
| BME280 | 0x76 | SDO→GND (documented) |

Only one I2C device per room node. **No address conflict.** ✅

### 5.2 Sensor Monitor (Legacy) I2C Bus

| Device | Address | Source |
|--------|---------|--------|
| BME280 | 0x76 | SDO→GND |
| SSD1306 OLED | 0x3C | Fixed |

Two devices, different addresses. **No conflict.** ✅

### 5.3 BH1750 (if used per README)

The README.md and BUY_LIST.md reference BH1750 I2C ambient light sensors. If BH1750 were added to the room-node I2C bus:

| Device | Address |
|--------|---------|
| BME280 | 0x76 |
| BH1750 | 0x23 (ADDR=LOW) or 0x5C (ADDR=HIGH) |

**No conflict with BME280.** ✅ But if an OLED (0x3C) were also added, still no conflict with BH1750. ✅

---

## 6. SPI Pin Assignments (MFRC522)

### 6.1 Pin Mapping

| Signal | GPIO | ESP32-S3 Function | Correct? |
|--------|------|-------------------|----------|
| MOSI | 11 | FSPI_MOSI | ✅ (ESP32-S3 only) |
| MISO | 13 | FSPI_MISO | ✅ (ESP32-S3 only) |
| SCK | 12 | FSPI_CLK | ✅ (ESP32-S3 only) |
| CS/SS | 5 | GPIO5 | ✅ |
| RST | 22 | GPIO22 | ⚠️ (see §2 re: availability) |

### 6.2 Firmware SPI Initialization

In `door-control/main.cpp`, `SPI.begin()` is called **without explicit pin parameters**:

```cpp
void setupRFID() {
    SPI.begin();          // Uses default SPI pins
    rfid.PCD_Init();
}
```

On ESP32-S3, the default SPI bus (FSPI/SPI2) maps to SCK=12, MOSI=11, MISO=13 — which matches the config. ✅

On original ESP32, `SPI.begin()` defaults to VSPI: SCK=18, MOSI=23, MISO=19 — which would **NOT** match. ❌

**Recommendation:** Explicitly pass pin arguments to `SPI.begin(SCK, MISO, MOSI, SS)` to avoid platform-dependent defaults:

```cpp
SPI.begin(12, 13, 11, RFID_SS_PIN);  // Explicit FSPI pins
```

### 6.3 WIRING.md vs config.h Consistency ✅

All SPI pin assignments match between WIRING.md, config.h, and the door-control README. ✅

---

## 7. CRITICAL: Flyback Diode Protection

### 7.1 What's Documented

- BUY_LIST.md includes 1N4007 flyback diodes ✅
- README.md Hardware Components section states: _"Flyback diode (1N4007) required to clamp inductive kickback"_ for the solenoid ✅
- Design-Report.md mentions: _"protecting the microcontroller from voltage transients using electrical isolation and flyback protection"_ ✅

### 7.2 What's Missing in Wiring Diagrams ❌

**WIRING.md does NOT show flyback diodes in any wiring diagram.** The solenoid, fan, and LED dimmer circuits are drawn without diodes:

```
# Current WIRING.md (solenoid - NO flyback diode shown):
  COM ──── 12V supply
  NO  ──── Solenoid +
            Solenoid − ── GND

# What it SHOULD show:
  COM ──── 12V supply
  NO  ──── Solenoid + ──┐
            Solenoid − ──┤── GND
                    [1N4007]  (cathode to +, anode to −)
```

### 7.3 Affected Circuits

| Load | Inductive? | Flyback Diode in Diagram? | Risk Level |
|------|-----------|--------------------------|------------|
| 12V Solenoid lock | **Yes** (coil) | ❌ Not shown | **HIGH** — can damage relay contacts, create arcing |
| DC Fan (×3) | **Yes** (motor) | ❌ Not shown | **HIGH** — back-EMF from motor |
| LED strip | No (resistive) | N/A | None |

### 7.4 Recommendation

Add 1N4007 flyback diodes across **every inductive load** (solenoid, fans):
- Cathode → positive terminal
- Anode → negative terminal

Update all WIRING.md diagrams to show these diodes. This is essential for hardware longevity and safety.

---

## 8. Power Budget Analysis

### 8.1 Room Node (per ESP32)

| Component | Voltage | Current | Power |
|-----------|---------|---------|-------|
| ESP32 (via USB) | 5V | ~250 mA peak | 1.25 W |
| BME280 | 3.3V | ~1 mA | negligible |
| TEMT6000 | 3.3V | ~2 mA | negligible |
| Relay coil | 5V | ~70 mA | 0.35 W |
| **5V total** | | **~323 mA** | **1.6 W** |

**5V supply:** USB 5V 2A adapter → 2000 mA capacity for ~323 mA load. **Ample margin.** ✅

### 8.2 Room Node 12V Rail (Shared)

| Component | Voltage | Current per Unit | Units | Total |
|-----------|---------|-----------------|-------|-------|
| Fan | 12V | 200–400 mA | ×3 | 600–1200 mA |
| LED strip (per meter) | 12V | ~500–1000 mA | ×3 | 1500–3000 mA |
| **12V total** | | | | **2.1–4.2 A** |

**12V supply:** WIRING.md recommends "12V 2A". BUY_LIST specifies one 12V 2A PSU.

**⚠️ MAJOR: The 12V 2A supply is likely insufficient for all 3 rooms:**
- 3 fans alone at maximum: 1.2A (60% of 2A budget)
- Adding LED strips could easily exceed 2A
- Recommended: **12V 5A PSU** for 3-room shared 12V rail, or separate 12V 2A per room

### 8.3 Door Node

| Component | Voltage | Current |
|-----------|---------|---------|
| ESP32 | 5V | ~250 mA |
| MFRC522 | 3.3V | ~26 mA |
| Relay coil | 5V | ~70 mA |
| **5V total** | | **~346 mA** |

**5V supply:** 2A adapter → ample. ✅

| Component | Voltage | Current |
|-----------|---------|---------|
| Solenoid (inrush) | 12V | ~500 mA |
| Solenoid (holding) | 12V | ~200 mA |

**12V supply:** WIRING.md recommends "12V 1A". Solenoid inrush 500 mA → ample. ✅

### 8.4 Overall System Total

| Rail | Estimated Load | Available Supply | Adequate? |
|------|---------------|-----------------|-----------|
| 5V (per room ESP32) | ~323 mA | 2A USB adapter × 4 | ✅ |
| 12V (3 rooms shared) | 2.1–4.2 A | 2A PSU | ❌ Under-provisioned |
| 12V (door) | 500 mA peak | 1A PSU | ✅ |

---

## 9. CRITICAL: BOM vs WIRING.md Relay Voltage Mismatch

### The Problem

| Source | Door Node Relay Part | Coil Voltage |
|--------|---------------------|-------------|
| `hardware/bom.csv` | SRD-**12V**DC-SL-C | **12V** coil |
| `WIRING.md` | Relay VCC → **5V** | Implies **5V** coil |
| `BUY_LIST.md` | "5V 1-channel relay module" | **5V** coil |
| `door-control/README.md` | "5V Relay Module" | **5V** coil |

### Impact

If the BOM is followed and a 12V relay (SRD-12VDC-SL-C) is purchased, but wired to 5V as per WIRING.md:
- The relay coil will **not receive enough voltage to energize**
- The solenoid lock will **never activate**
- The door will be permanently locked regardless of RFID authorization

### Recommendation

Update `hardware/bom.csv` to specify **SRD-05VDC-SL-C** (5V relay) for the door node, consistent with all other documentation.

---

## 10. MAJOR: BH1750 vs TEMT6000 Sensor Inconsistency

### Conflicting Documentation

| Document | Ambient Light Sensor | Interface |
|----------|---------------------|-----------|
| **WIRING.md** | TEMT6000 (analog) | ADC GPIO 34 |
| **config.h** (room-node, lighting-control) | TEMT6000 (analog) | ADC GPIO 34 |
| **main.cpp** (room-node, lighting-control) | `analogRead()` | Analog |
| **README.md** (project root) | BH1750 (I2C digital) | I2C |
| **BUY_LIST.md** | BH1750 I2C modules | I2C |
| **Design-Report.md** §Lighting | TEMT6000 (analog) | Analog |
| **README.md** §Design Requirements | BH1750 (1 lux digital) | I2C |

### Analysis

The firmware and wiring diagrams consistently use TEMT6000 (analog), while the project README and buy list reference BH1750 (I2C digital). These are completely different sensors:

| Property | TEMT6000 | BH1750 |
|----------|----------|--------|
| Interface | Analog (voltage output) | I2C (digital lux output) |
| Resolution | Depends on ADC (12-bit → 0.24 lux) | 1 lux native |
| Wiring | 3 wires (VCC, GND, SIG) | 4 wires (VCC, GND, SDA, SCL) |
| I2C address | N/A | 0x23 or 0x5C |

### Recommendation

Decide which sensor is actually used and unify all documentation:
- If TEMT6000: Update README.md and BUY_LIST.md
- If BH1750: Update WIRING.md, all config.h files, and all firmware code

---

## 11. Safety Hazards Summary

### 11.1 CRITICAL Hazards

| # | Hazard | Location | Risk | Mitigation |
|---|--------|----------|------|------------|
| S1 | **Boot-time relay activation** — door may briefly unlock on every ESP32 reset | Door node GPIO 4 | Unauthorized entry during reboot | Add 10kΩ pull-down on GPIO 4 |
| S2 | **Missing flyback diodes** on solenoid and fan loads | All relay-switched inductive loads | Relay contact damage, voltage spikes, potential fire | Add 1N4007 across every inductive load |
| S3 | **Wrong relay voltage** if BOM is followed — 12V relay on 5V = non-functional lock | Door node | Complete access control failure | Fix BOM to SRD-05VDC-SL-C |

### 11.2 MAJOR Hazards

| # | Hazard | Location | Risk | Mitigation |
|---|--------|----------|------|------------|
| S4 | **12V PSU undersized** for 3-room shared rail | Room nodes 12V rail | PSU overheating, potential fire under full load | Upgrade to 12V 5A PSU |
| S5 | **No fuse protection** on 12V rails | All 12V wiring | Unlimited current on short circuit | Add inline fuse (2A per room, 1A for door) |

### 11.3 MINOR Hazards

| # | Hazard | Location | Risk | Mitigation |
|---|--------|----------|------|------------|
| S6 | Boot-time fan activation | Room node GPIO 26 | Unexpected mechanical motion | Add 10kΩ pull-down on GPIO 26 |
| S7 | Breadboard prototyping with 12V | All nodes | Accidental shorts | Use screw terminals for 12V connections |

---

## 12. Documentation Consistency Check

### 12.1 WIRING.md ↔ config.h

| Parameter | WIRING.md | config.h | Match? |
|-----------|-----------|----------|--------|
| Room I2C SDA | GPIO 21 | `I2C_SDA 21` | ✅ |
| Room I2C SCL | GPIO 22 | `I2C_SCL 22` | ✅ |
| Room TEMT6000 | GPIO 34 | `LIGHT_SENSOR_PIN 34` | ✅ |
| Room Dimmer PWM | GPIO 25 | `DIMMER_PWM_PIN 25` | ✅ |
| Room Fan Relay | GPIO 26 | `FAN_RELAY_PIN 26` | ✅ |
| Room Status LED | GPIO 2 | `STATUS_LED_PIN 2` | ✅ |
| Door RFID SS | GPIO 5 | `RFID_SS_PIN 5` | ✅ |
| Door RFID RST | GPIO 22 | `RFID_RST_PIN 22` | ✅ |
| Door SPI MOSI | GPIO 11 | Comment: GPIO 11 | ✅ |
| Door SPI MISO | GPIO 13 | Comment: GPIO 13 | ✅ |
| Door SPI SCK | GPIO 12 | Comment: GPIO 12 | ✅ |
| Door Relay | GPIO 4 | `RELAY_PIN 4` | ✅ |
| Door Status LED | GPIO 2 | `LED_PIN 2` | ✅ |
| BME280 Address | 0x76 | `BME280_ADDRESS 0x76` | ✅ |

**All pin assignments are consistent between WIRING.md and config.h.** ✅

### 12.2 WIRING.md ↔ SETUP.md

SETUP.md §Firmware Setup lists hardware connections that match WIRING.md exactly. ✅

### 12.3 WIRING.md ↔ DEMO.md

DEMO.md references GPIO numbers for troubleshooting that match WIRING.md. ✅

### 12.4 config.h ↔ main.cpp

All `#define` values in config.h are used correctly in main.cpp for each firmware project. ✅

---

## 13. Additional Issues

### 13.1 Room-Node Phantom Relay Code

The room-node `main.cpp` accepts `relay1` through `relay4` WebSocket commands and tracks state for all four relays. However:
- `config.h` only defines `FAN_RELAY_PIN` (GPIO 26) — no relay channel GPIOs
- `setRelay()` only updates boolean state variables without any `digitalWrite()` calls
- The `relays` JSON array in sensor data always reflects software state, not hardware

This means relay1–4 commands are silently accepted but have **no physical effect**. If multi-relay support is intended, GPIO pin definitions and actual `digitalWrite()` calls must be added.

### 13.2 BOM Resistor Annotation Error

`hardware/bom.csv` entry for 10kΩ resistors reads:
> "2 per room – pull-up for I2C + TEMT6000 pull-down"

This is misleading. I2C pull-ups use **4.7kΩ** (listed separately in the BOM). The 10kΩ resistors are for TEMT6000 pull-downs only (1 per room, qty = 3). The BOM quantity of 6 is double what's needed.

### 13.3 Lighting-Control GPIO 12 Strapping Issue

On the original ESP32, GPIO 12 is a boot strapping pin that selects flash voltage:
- HIGH at boot → VDD_SDIO = 1.8V (may prevent boot if flash requires 3.3V)
- LOW at boot → VDD_SDIO = 3.3V (normal operation)

If the relay module connected to GPIO 12 (RELAY_CH4) has a pull-up, it could prevent the ESP32 from booting. The lighting-control firmware is marked as "legacy" but this should be noted if it's ever revived.

### 13.4 NTP Time Synchronization

All firmware files contain `// TODO: add NTP sync` with placeholder timestamps. The door-control uses a hardcoded timestamp (`"2026-02-09T19:59:04.032Z"`), and the room-node uses uptime-based stubs. This means:
- Access logs have inaccurate timestamps
- Sensor data time-series alignment is unreliable
- mTLS certificate validation (time-dependent) would fail

### 13.5 Missing WIRING.md Entries for Legacy Firmware

The lighting-control and sensor-monitor firmware projects have pin assignments in their config.h files but no corresponding entries in WIRING.md. While marked as "legacy," adding a brief note or reference would help developers understand the full system.

### 13.6 BUY_LIST Relay Quantity

BUY_LIST.md lists only "1× 5V 1-channel relay module" but the project requires 4 relay modules (3 for room fans + 1 for door solenoid). The BOM correctly lists quantities (3 + 1 = 4).

---

## 14. Recommendations Summary (Prioritized)

### Must Fix Before Power-On

1. **Resolve ESP32 vs ESP32-S3 GPIO conflict** (§2) — determine actual hardware variant and update either pin assignments or board target
2. **Add flyback diodes** across solenoid and all fan motors (§7)
3. **Add 10kΩ pull-down resistors** on GPIO 4 (door relay) and GPIO 26 (fan relay) (§4.3)
4. **Fix BOM door relay** from SRD-12VDC-SL-C to SRD-05VDC-SL-C (§9)

### Should Fix Before Demo

5. **Upgrade 12V PSU** to 5A for 3-room shared rail, or use per-room supplies (§8.2)
6. **Unify BH1750/TEMT6000 references** across all documentation (§10)
7. **Add explicit SPI pin arguments** in `SPI.begin()` call (§6.2)
8. **Add inline fuses** on 12V power rails (§11.2)

### Nice to Have

9. Implement NTP time sync in all firmware
10. Add wiring entries for legacy firmware in WIRING.md
11. Fix BOM resistor annotations
12. Implement actual GPIO control for relay1–4 in room-node or remove phantom commands

---

## Appendix A: Pin Map Quick Reference

### Room Node (×3)

```
ESP32 GPIO Map (Room Node)
═══════════════════════════
  GPIO 2  ──── Status LED (via 330Ω)
  GPIO 21 ──── I2C SDA → BME280 SDA [4.7kΩ pull-up to 3.3V]
  GPIO 22 ──── I2C SCL → BME280 SCL [4.7kΩ pull-up to 3.3V]
  GPIO 25 ──── PWM → Dimmer Module IN
  GPIO 26 ──── Digital → Fan Relay IN [ADD 10kΩ pull-down to GND]
  GPIO 34 ──── ADC → TEMT6000 SIG [10kΩ pull-down to GND]

  3.3V ──── BME280 VCC, TEMT6000 VCC, BME280 CSB
  5V   ──── Relay VCC, Dimmer VCC
  GND  ──── Common ground (all components)
  12V  ──── Fan (via relay NO/COM), LED strip (via dimmer)
```

### Door Node (×1)

```
ESP32 GPIO Map (Door Node)
═══════════════════════════
  GPIO 2  ──── Status LED (via 330Ω)
  GPIO 4  ──── Digital → Solenoid Relay IN [ADD 10kΩ pull-down to GND]
  GPIO 5  ──── SPI CS → MFRC522 SDA/SS
  GPIO 11 ──── SPI MOSI → MFRC522 MOSI
  GPIO 12 ──── SPI SCK → MFRC522 SCK
  GPIO 13 ──── SPI MISO → MFRC522 MISO
  GPIO 22 ──── Digital → MFRC522 RST

  3.3V ──── MFRC522 VCC (NOT 5V!)
  5V   ──── Relay VCC
  GND  ──── Common ground (all components)
  12V  ──── Solenoid (via relay NO/COM) [ADD 1N4007 flyback diode]
```

---

## Appendix B: Audit Checklist Status

| Check | Room Nodes | Door Node |
|-------|-----------|-----------|
| No GPIO pin conflicts | ✅ | ✅ |
| GPIO pins available on stated board | ❌ (§2) | ⚠️ (§2) |
| Correct voltage levels (3.3V/5V/12V) | ✅ | ✅ |
| Pull-up/pull-down resistors documented | ⚠️ (§4.3) | ⚠️ (§4.3) |
| I2C address conflicts | ✅ None | N/A |
| SPI pin assignments correct | N/A | ✅ (for S3) |
| Flyback diode protection | ❌ (§7) | ❌ (§7) |
| Power budget within PSU capacity | ⚠️ (§8.2) | ✅ |
| Safety hazards addressed | ❌ (§11) | ❌ (§11) |
| WIRING.md ↔ config.h consistency | ✅ | ✅ |
| WIRING.md ↔ BOM consistency | ⚠️ (§9) | ❌ (§9) |
| Sensor type consistent across docs | ❌ (§10) | N/A |

---

*End of audit report.*
