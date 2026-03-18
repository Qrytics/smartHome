# Wiring Guide – 4-ESP32 Smart Home

This document gives you **exact pin connections** for every component in the
4-ESP32 smart home model.

```
System overview
  ESP32 #1  →  Room Node (Living Room)   fan + dimmer + TEMT6000 + BME280
  ESP32 #2  →  Room Node (Bedroom)       fan + dimmer + TEMT6000 + BME280
  ESP32 #3  →  Room Node (Kitchen)       fan + dimmer + TEMT6000 + BME280
  ESP32 #4  →  Door Node (Entrance)      RFID RC522 + solenoid lock
```

All three room nodes are wired **identically**; only the `DEVICE_ROOM_ID` value
in `config.h` differs.

---

## Room Node Wiring (ESP32 #1, #2, #3)

### Board: ESP32-S3 DevKit C1

> **Tip:** The ESP32-S3 uses 3.3 V logic.  Do **not** connect 5 V signals directly to GPIO pins.

### 1. BME280 (Temperature / Humidity / Pressure) — I2C

| BME280 Pin | ESP32-S3 Pin | Notes |
|------------|-------------|-------|
| VCC | 3.3 V | |
| GND | GND | |
| SDA | GPIO **21** | 4.7 kΩ pull-up to 3.3 V |
| SCL | GPIO **22** | 4.7 kΩ pull-up to 3.3 V |
| SDO | GND | Sets I2C address = 0x76 (connect to 3.3 V for 0x77) |
| CSB | 3.3 V | Selects I2C mode |

```
ESP32-S3                    BME280
  3.3V ──────────────────── VCC
  GND  ──────────────────── GND
  GPIO21 (SDA) ──[4.7k]─── SDA ──[4.7k]── 3.3V
  GPIO22 (SCL) ──[4.7k]─── SCL ──[4.7k]── 3.3V
                            SDO ──────────── GND   (addr = 0x76)
                            CSB ──────────── 3.3V
```

### 2. TEMT6000 Ambient Light Sensor — Analog

| TEMT6000 Pin | ESP32-S3 Pin | Notes |
|-------------|-------------|-------|
| VCC | 3.3 V | |
| GND | GND | |
| SIG | GPIO **34** | + 10 kΩ resistor from SIG to GND |

```
ESP32-S3                    TEMT6000
  3.3V ──────────────────── VCC
  GND  ──────────────────── GND
  GPIO34 (ADC) ─────────── SIG
               └──[10kΩ]── GND
```

> GPIO 34 is an **input-only** pin on ESP32 – ideal for analog reads.

### 3. PWM LED Dimmer Module — PWM

| Dimmer Module Pin | ESP32-S3 Pin | Notes |
|-------------------|-------------|-------|
| IN | GPIO **25** | PWM signal (0–3.3 V) |
| GND | GND | Common ground |
| VCC | 5 V | Module power (check module datasheet) |

Connect the LED strip / load to the module's OUT+ and OUT− terminals.

```
ESP32-S3                    Dimmer Module
  GPIO25 ─────────────────  IN
  GND    ─────────────────  GND
  5V     ─────────────────  VCC

                            OUT+ ─── LED Strip +
                            OUT− ─── LED Strip −  (with 12V supply)
```

### 4. Fan Relay Module — Digital

| Relay Module Pin | ESP32-S3 Pin | Notes |
|-----------------|-------------|-------|
| IN | GPIO **26** | HIGH = relay ON |
| VCC | 5 V | Relay coil power |
| GND | GND | |

Connect the fan to **NO** (Normally Open) and **COM** terminals of the relay.

```
ESP32-S3                    Relay Module        Fan
  GPIO26 ─────────────────  IN
  5V     ─────────────────  VCC
  GND    ─────────────────  GND

                            COM ────────────── Fan +
                            NO  ──┐
                                  │  (closes when IN = HIGH)
                            12V ──┘──────────── 12V supply
```

### 5. Status LED (optional)

| LED | ESP32-S3 Pin | Notes |
|-----|-------------|-------|
| Anode (+) | GPIO **2** | via 330 Ω resistor |
| Cathode (−) | GND | |

```
ESP32-S3
  GPIO2 ──[330Ω]──[LED+]──[LED−]── GND
```

### Room Node GPIO Summary

| GPIO | Function | Direction |
|------|----------|-----------|
| 21 | I2C SDA (BME280) | Bidirectional |
| 22 | I2C SCL (BME280) | Output |
| 34 | TEMT6000 analog signal | Input (ADC1_CH6) |
| 25 | PWM dimmer signal | Output (LEDC) |
| 26 | Fan relay IN | Output |
| 2  | Status LED | Output |

---

## Door Node Wiring (ESP32 #4)

### Board: ESP32-S3 DevKit C1

### 1. MFRC522 RFID Reader — SPI

| MFRC522 Pin | ESP32-S3 Pin | Notes |
|------------|-------------|-------|
| VCC (3.3 V) | 3.3 V | **3.3 V only** – not 5 V! |
| GND | GND | |
| RST | GPIO **22** | Reset |
| SDA (SS/CS) | GPIO **5** | Chip Select |
| MOSI | GPIO **11** (FSPI_MOSI) | SPI MOSI |
| MISO | GPIO **13** (FSPI_MISO) | SPI MISO |
| SCK | GPIO **12** (FSPI_CLK) | SPI Clock |
| IRQ | Not connected | (optional interrupt) |

```
ESP32-S3                         MFRC522
  3.3V  ──────────────────────── VCC
  GND   ──────────────────────── GND
  GPIO22 ──────────────────────── RST
  GPIO5  ──────────────────────── SDA/SS
  GPIO11 (MOSI) ───────────────── MOSI
  GPIO13 (MISO) ───────────────── MISO
  GPIO12 (SCK)  ───────────────── SCK
```

> ⚠️ The MFRC522 is a **3.3 V device**.  Applying 5 V will damage it.

### 2. Solenoid Door Lock + Relay

| Relay Module Pin | ESP32-S3 Pin | Notes |
|-----------------|-------------|-------|
| IN | GPIO **4** | HIGH = unlock |
| VCC | 5 V | |
| GND | GND | |

```
ESP32-S3                    Relay Module        Solenoid Lock
  GPIO4 ──────────────────  IN
  5V    ──────────────────  VCC
  GND   ──────────────────  GND

                            COM ────────────── 12V supply
                            NO  ────────────── Solenoid +
                                               Solenoid − ── GND
```

The solenoid is energised (door unlocks) when GPIO 4 is HIGH.
The firmware keeps it energised for `LOCK_OPEN_DURATION` ms (default 3 s).

### 3. Status LED

| LED | ESP32-S3 Pin | Notes |
|-----|-------------|-------|
| Anode (+) | GPIO **2** | via 330 Ω resistor |
| Cathode (−) | GND | |

### Door Node GPIO Summary

| GPIO | Function | Direction |
|------|----------|-----------|
| 5  | RFID SS (SPI CS) | Output |
| 11 | SPI MOSI | Output |
| 12 | SPI SCK | Output |
| 13 | SPI MISO | Input |
| 22 | RFID RST | Output |
| 4  | Solenoid relay IN | Output |
| 2  | Status LED | Output |

---

## Power Supply

### Room Node Power Budget

| Component | Voltage | Current |
|-----------|---------|---------|
| ESP32-S3 | 3.3 V (via USB 5V) | ~250 mA peak |
| BME280 | 3.3 V | ~1 mA |
| TEMT6000 | 3.3 V | ~2 mA |
| Relay coil | 5 V | ~70 mA |
| Fan | 12 V | 200–400 mA |
| LED strip | 12 V | varies |

**Recommended:** USB 5 V 2 A adapter for ESP32 + relay + sensors.  Separate 12 V 2 A supply for fan and LED strip.

### Door Node Power Budget

| Component | Voltage | Current |
|-----------|---------|---------|
| ESP32-S3 | 3.3 V (via USB 5V) | ~250 mA peak |
| MFRC522 | 3.3 V | ~26 mA |
| Relay coil | 5 V | ~70 mA |
| Solenoid lock | 12 V | ~500 mA |

**Recommended:** USB 5 V 2 A adapter for ESP32.  Separate 12 V 1 A supply for solenoid.

---

## Network / WiFi

All four ESP32s connect to the **same WiFi network** as the machine running the backend.

1. Ensure all ESPs and the backend host are on the same subnet (e.g. 192.168.1.x).
2. Set the backend machine's IP in each `include/secrets.h` as `API_HOST`.
3. The backend listens on port **8000** by default.

---

## I2C Address Reference

| Device | Default Address | Alternate (SDO high) |
|--------|----------------|----------------------|
| BME280 | 0x76 | 0x77 |

If you run two I2C devices that clash, change the SDO pin and update `BME280_ADDRESS` in `config.h`.

---

## Quick Checklist Before Power-On

- [ ] All GNDs are connected (ESP32, sensors, relay, fan)
- [ ] I2C pull-up resistors (4.7 kΩ) on SDA and SCL
- [ ] 10 kΩ pull-down resistor on TEMT6000 SIG line
- [ ] `secrets.h` configured for each ESP32 (WiFi creds + API_HOST)
- [ ] `DEVICE_ROOM_ID` is unique per room node (`room-node-01` / `02` / `03`)
- [ ] 12 V supply is **not** connected to ESP32 GPIO pins
- [ ] Relay **NO** used (not NC) for fan and solenoid
- [ ] MFRC522 powered from 3.3 V (not 5 V)
