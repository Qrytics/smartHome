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

> **Important:** All boards are **ESP32-S3 DevKitC-1**.  The pin assignments
> in this guide are specific to the ESP32-S3.  On the ESP32-S3-WROOM-1 module,
> GPIOs 22–34 are used internally (flash / PSRAM) and are **not** broken out to
> header pins — only use GPIOs in the ranges **0–21** and **35–48**.  If you
> update any GPIO number here, update the matching `#define` in the firmware
> `config.h` as well.

---

## Room Node Wiring (ESP32 #1, #2, #3)

### Board: ESP32-S3 DevKitC-1

> **Tip:** The ESP32-S3 uses 3.3 V logic.  Do **not** connect 5 V signals
> directly to GPIO pins.

### 1. BME280 (Temperature / Humidity / Pressure) — I2C

| BME280 Pin | ESP32-S3 Pin | Notes |
|------------|-------------|-------|
| VCC | 3.3 V | |
| GND | GND | |
| SDA | GPIO **21** | 4.7 kΩ pull-up to 3.3 V (see note) |
| SCL | GPIO **10** | 4.7 kΩ pull-up to 3.3 V (see note) |
| SDO | GND | Sets I2C address = 0x76 (connect to 3.3 V for 0x77) |
| CSB | 3.3 V | Selects I2C mode |

> **Pull-up note:** Many BME280 breakout boards already include 4.7 kΩ pull-up
> resistors on SDA and SCL.  Check your module before adding external resistors;
> doubling up is harmless but marginally reduces bus speed.

```
ESP32-S3                    BME280
  3.3V ──────────────────── VCC
  GND  ──────────────────── GND
  GPIO21 (SDA) ──[4.7k]─── SDA ──[4.7k]── 3.3V
  GPIO10 (SCL) ──[4.7k]─── SCL ──[4.7k]── 3.3V
                             SDO ──────────── GND   (addr = 0x76)
                             CSB ──────────── 3.3V
```

`config.h` values to match: `I2C_SDA 21`, `I2C_SCL 10`

### 2. TEMT6000 Ambient Light Sensor — Analog

The TEMT6000 is an analog phototransistor that outputs a voltage proportional to
ambient light, read by the ESP32-S3 ADC.

| TEMT6000 Pin | ESP32-S3 Pin | Notes |
|-------------|-------------|-------|
| VCC | 3.3 V | |
| GND | GND | |
| SIG | GPIO **4** (ADC1_CH3) | + 10 kΩ pull-down resistor from SIG to GND |

> **Why GPIO 4?**  GPIO 4 is on ADC1, which remains usable while WiFi is
> active.  ADC2 pins (GPIOs 11–20) are blocked by the WiFi driver.

```
ESP32-S3                    TEMT6000
  3.3V ──────────────────── VCC
  GND  ──────────────────── GND
  GPIO4 (ADC) ──────────── SIG
              └──[10kΩ]─── GND
```

`config.h` value to match: `LIGHT_SENSOR_PIN 4`

### 3. PWM LED Dimmer Module — PWM

The dimmer module accepts a 0–3.3 V PWM signal and uses it to drive a 12 V LED
strip through an internal MOSFET.  The 12 V supply connects to the module
directly, never to the ESP32.

| Dimmer Module Pin | ESP32-S3 Pin | Notes |
|-------------------|-------------|-------|
| IN | GPIO **38** | PWM signal (0–3.3 V) |
| GND | GND | Common ground |
| VCC | 5 V | Module logic power |

```
ESP32-S3                    Dimmer Module
  GPIO38 ─────────────────  IN
  GND    ─────────────────  GND
  5V     ─────────────────  VCC

  [12V PSU +] ─────────────  12V IN+
  [12V PSU −] ─────────────  12V IN−

                             OUT+ ─── LED Strip +
                             OUT− ─── LED Strip −
```

`config.h` value to match: `DIMMER_PWM_PIN 38`

### 4. Fan Relay Module — Digital

Use a **5 V, 1-channel relay module** (e.g. SRD-05VDC-SL-C).  A 12 V relay
module will not energise correctly from the 5 V supply.

A **1N4007 flyback diode** placed across the fan motor terminals is required to
suppress back-EMF voltage spikes when the fan is switched off; these spikes can
damage relay contacts over time.

> **Pull-down resistor (safety):** Place a **10 kΩ resistor between GPIO 39
> and GND**.  Without it, GPIO 39 floats during ESP32 boot and can briefly
> energise the relay, causing an unexpected fan spin on every power-on or reset.

| Relay Module Pin | ESP32-S3 Pin | Notes |
|-----------------|-------------|-------|
| IN | GPIO **39** | HIGH = relay ON |
| VCC | 5 V | Relay coil power |
| GND | GND | |

Connect the fan to the **NO** (Normally Open) and **COM** terminals of the relay.

```
ESP32-S3                    Relay Module             Fan (DC motor)
  GPIO39 ──[10kΩ]── GND
  GPIO39 ─────────────────  IN
  5V     ─────────────────  VCC
  GND    ─────────────────  GND

                            COM ─────── 12V supply +
                            NO  ─────── Fan +  ──────────────┐
                                        Fan −  ─── GND       │
                                        [1N4007] ────────────┘
                                   (cathode → Fan +, anode → Fan −)
```

> The 1N4007 cathode (banded end) connects to the **positive** terminal of the
> fan; the anode connects to the **negative** terminal.

`config.h` value to match: `FAN_RELAY_PIN 39`

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

| GPIO | Function | Direction | config.h Define |
|------|----------|-----------|-----------------|
| 21 | I2C SDA (BME280) | Bidirectional | `I2C_SDA` |
| 10 | I2C SCL (BME280) | Output | `I2C_SCL` |
| 4  | TEMT6000 analog signal | Input (ADC1_CH3) | `LIGHT_SENSOR_PIN` |
| 38 | PWM dimmer signal | Output (LEDC) | `DIMMER_PWM_PIN` |
| 39 | Fan relay IN | Output | `FAN_RELAY_PIN` |
| 2  | Status LED | Output | `STATUS_LED_PIN` |

---

## Door Node Wiring (ESP32 #4)

### Board: ESP32-S3 DevKitC-1

### 1. MFRC522 RFID Reader — SPI

The MFRC522 uses the ESP32-S3 FSPI bus (SPI2).  The MOSI/MISO/SCK pins are
fixed to the hardware FSPI signals; only SS and RST are freely assignable.

| MFRC522 Pin | ESP32-S3 Pin | Notes |
|------------|-------------|-------|
| VCC (3.3 V) | 3.3 V | **3.3 V only** – not 5 V! |
| GND | GND | |
| RST | GPIO **16** | Reset |
| SDA (SS/CS) | GPIO **5** | Chip Select |
| MOSI | GPIO **11** (FSPI_MOSI) | SPI data out |
| MISO | GPIO **13** (FSPI_MISO) | SPI data in |
| SCK | GPIO **12** (FSPI_CLK) | SPI clock |
| IRQ | Not connected | Optional interrupt – leave floating |

> ⚠️ The MFRC522 is a **3.3 V device**.  Applying 5 V will permanently damage it.

> **RST pull-up (recommended):** Add a 10 kΩ resistor from GPIO 16 to 3.3 V.
> The MFRC522 library drives RST actively, but an external pull-up prevents the
> module from entering an undefined state if the ESP32 resets unexpectedly.

```
ESP32-S3                         MFRC522
  3.3V  ──────────────────────── VCC
  GND   ──────────────────────── GND
  GPIO16 ──────────────────────── RST  ──[10kΩ]── 3.3V  (optional pull-up)
  GPIO5  ──────────────────────── SDA/SS
  GPIO11 (FSPI_MOSI) ──────────── MOSI
  GPIO13 (FSPI_MISO) ──────────── MISO
  GPIO12 (FSPI_CLK)  ──────────── SCK
```

`config.h` values to match: `RFID_SS_PIN 5`, `RFID_RST_PIN 16`

> **Firmware note:** `SPI.begin()` is called without explicit pin arguments.
> On ESP32-S3 the FSPI bus defaults to SCK=12, MOSI=11, MISO=13, which matches
> the table above.  If you port to a different board, change the call to
> `SPI.begin(12, 13, 11, RFID_SS_PIN)` to make the pins explicit.

### 2. Solenoid Door Lock + Relay

Use a **5 V, 1-channel relay module** (e.g. SRD-05VDC-SL-C).

A **1N4007 flyback diode** placed across the solenoid coil terminals is
required.  When the solenoid de-energises (door re-locks), the coil produces a
large inductive voltage spike.  Without the diode, this spike can weld relay
contacts or destroy the relay module.

> **Pull-down resistor (security):** Place a **10 kΩ resistor between GPIO 4
> and GND**.  Without it, GPIO 4 floats during ESP32 boot and can briefly
> activate the relay, momentarily unlocking the door on every reboot or reset.
> This is a security vulnerability.

| Relay Module Pin | ESP32-S3 Pin | Notes |
|-----------------|-------------|-------|
| IN | GPIO **4** | HIGH = unlock |
| VCC | 5 V | Relay coil power |
| GND | GND | |

```
ESP32-S3                    Relay Module             Solenoid Lock
  GPIO4 ──[10kΩ]── GND
  GPIO4 ──────────────────  IN
  5V    ──────────────────  VCC
  GND   ──────────────────  GND

                            COM ─────── 12V supply +
                            NO  ─────── Solenoid +  ────────────┐
                                        Solenoid −  ─── GND     │
                                        [1N4007] ───────────────┘
                                  (cathode → Solenoid +, anode → Solenoid −)
```

> The 1N4007 cathode (banded end) connects to the **positive** terminal of the
> solenoid; the anode connects to the **negative** terminal.

The solenoid is energised (door unlocks) when GPIO 4 is HIGH.
The firmware keeps it energised for `LOCK_OPEN_DURATION` ms (default 3 s),
then drives GPIO 4 LOW to re-lock.

`config.h` value to match: `RELAY_PIN 4`

### 3. Status LED

| LED | ESP32-S3 Pin | Notes |
|-----|-------------|-------|
| Anode (+) | GPIO **2** | via 330 Ω resistor |
| Cathode (−) | GND | |

```
ESP32-S3
  GPIO2 ──[330Ω]──[LED+]──[LED−]── GND
```

### Door Node GPIO Summary

| GPIO | Function | Direction | config.h Define |
|------|----------|-----------|-----------------|
| 5  | RFID SS (SPI CS) | Output | `RFID_SS_PIN` |
| 11 | SPI MOSI (FSPI) | Output | — (hardware fixed) |
| 12 | SPI SCK (FSPI) | Output | — (hardware fixed) |
| 13 | SPI MISO (FSPI) | Input | — (hardware fixed) |
| 16 | RFID RST | Output | `RFID_RST_PIN` |
| 4  | Solenoid relay IN | Output | `RELAY_PIN` |
| 2  | Status LED | Output | `LED_PIN` |

---

## Power Supply

### Room Node Power Budget (per ESP32)

| Component | Rail | Current |
|-----------|------|---------|
| ESP32-S3 | 5 V (USB) | ~250 mA peak |
| BME280 | 3.3 V | ~1 mA |
| TEMT6000 | 3.3 V | ~2 mA |
| Relay coil | 5 V | ~70 mA |
| **5 V total** | | **~323 mA** |
| Fan | 12 V | 200–400 mA |
| LED strip | 12 V | ~500–1000 mA/m |

**5 V supply:** USB 5 V 2 A adapter per room node — ample margin.

**12 V supply:** With 3 room nodes sharing one 12 V rail, worst-case draw is
1.2 A (fans at full speed) plus up to ~3 A (LED strips).  Use a **12 V 5 A
PSU** for a shared rail, or a dedicated **12 V 2 A PSU per room**.  A single
12 V 2 A shared supply is insufficient at full load.

> **Fuse protection:** Add an inline blade fuse on each 12 V feed:
> **2 A per room** (fan + LED strip) or **5 A** on the shared bus.  This
> prevents wiring damage in the event of a short circuit.

### Door Node Power Budget

| Component | Rail | Current |
|-----------|------|---------|
| ESP32-S3 | 5 V (USB) | ~250 mA peak |
| MFRC522 | 3.3 V | ~26 mA |
| Relay coil | 5 V | ~70 mA |
| **5 V total** | | **~346 mA** |
| Solenoid (inrush) | 12 V | ~500 mA |
| Solenoid (holding) | 12 V | ~200 mA |

**5 V supply:** USB 5 V 2 A adapter — ample.

**12 V supply:** 12 V 1 A adapter is sufficient for the solenoid.
Add an inline **1 A fuse** on the 12 V feed.

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

Only the BME280 is on the room-node I2C bus.  If you add a second I2C device
(e.g. an OLED display), check its address for conflicts.  Change the SDO wiring
and update `BME280_ADDRESS` in `config.h` if there is a clash.

---

## Ambient Light Sensor Note

The firmware uses the **TEMT6000** analog phototransistor (read via
`analogRead()`).  Some older project documents mention a BH1750 I2C digital
sensor — those references are incorrect.  Connect only the TEMT6000 as shown
in §2 of the room-node section above.

---

## Quick Checklist Before Power-On

- [ ] All GNDs connected together (ESP32, sensors, relay module, 12 V supply −)
- [ ] I2C pull-up resistors (4.7 kΩ) on SDA (GPIO 21) and SCL (GPIO 10) — or confirm the BME280 breakout includes them
- [ ] **10 kΩ pull-down on GPIO 4** (room node TEMT6000 SIG line)
- [ ] **10 kΩ pull-down on GPIO 39** (room node fan relay IN) — prevents fan spin at boot
- [ ] **10 kΩ pull-down on GPIO 4** (door node solenoid relay IN) — prevents door unlock at boot
- [ ] **1N4007 flyback diode** across each fan motor (cathode to Fan +)
- [ ] **1N4007 flyback diode** across solenoid coil (cathode to Solenoid +)
- [ ] **5 V relay modules** used (SRD-05VDC-SL-C or equivalent) — not 12 V relay modules
- [ ] Relay **NO** terminal used (not NC) for fan and solenoid
- [ ] 12 V supply connected only to relay COM and dimmer module 12V input — **not** to any ESP32 GPIO pin
- [ ] MFRC522 powered from 3.3 V (not 5 V)
- [ ] 12 V PSU rated ≥ 5 A for shared 3-room rail (or ≥ 2 A per room if separate supplies)
- [ ] Inline fuses installed on all 12 V wiring (2 A per room node, 1 A for door node)
- [ ] `secrets.h` configured for each ESP32 (WiFi credentials + `API_HOST`)
- [ ] `DEVICE_ROOM_ID` is unique per room node (`room-node-01` / `02` / `03`)
- [ ] GPIO assignments in each `config.h` match this wiring guide
