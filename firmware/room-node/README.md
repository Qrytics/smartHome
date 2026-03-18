# Room Node Firmware

ESP32 firmware for the three **room nodes** in the Smart Home project.

Each room ESP32 runs this single firmware and reports sensor data + control state
to the backend via WebSocket.

---

## Hardware per room ESP32

| Component | Interface | Notes |
|-----------|-----------|-------|
| BME280 | I2C (SDA=GPIO21, SCL=GPIO22) | Temperature / humidity / pressure |
| TEMT6000 | Analog (GPIO34) | Ambient light (0–1000 lux) |
| PWM LED dimmer | GPIO25 | 0–100 % via LEDC (5 kHz, 8-bit) |
| Fan relay module | GPIO26 | HIGH = fan ON |
| Status LED | GPIO2 | Built-in LED; blinks on errors |

> **Pin summary for room ESP32:**
>
> | Signal | GPIO | Notes |
> |--------|------|-------|
> | I2C SDA (BME280) | 21 | Pull-up resistor 4.7 kΩ to 3.3 V |
> | I2C SCL (BME280) | 22 | Pull-up resistor 4.7 kΩ to 3.3 V |
> | TEMT6000 SIG | 34 | 10 kΩ resistor to GND on signal line |
> | Dimmer PWM | 25 | To dimmer module IN |
> | Fan relay IN | 26 | To relay IN |
> | Status LED | 2 | Built-in; active HIGH |

---

## Wiring Diagrams

### BME280 → ESP32

```
BME280    ESP32-S3
  VCC  →  3.3 V
  GND  →  GND
  SDA  →  GPIO 21
  SCL  →  GPIO 22
```

*Add a 4.7 kΩ pull-up resistor between SDA→3.3 V and SCL→3.3 V if the
module does not have on-board pull-ups.*

### TEMT6000 → ESP32

```
TEMT6000  ESP32-S3
  VCC  →  3.3 V
  GND  →  GND
  SIG  →  GPIO 34  (also connect 10 kΩ from SIG to GND)
```

### PWM Dimmer → ESP32

```
Dimmer Module  ESP32-S3
  IN  →  GPIO 25
  GND →  GND
  VCC →  5 V (or 3.3 V depending on module – check datasheet)
```

### Fan Relay → ESP32

```
Relay Module  ESP32-S3
  IN   →  GPIO 26
  VCC  →  5 V  (relay coil power; some modules support 3.3 V)
  GND  →  GND
```

Connect the fan to the relay's **NO** (normally-open) and **COM** terminals.

---

## Quick Start

### 1. Install PlatformIO

```bash
pip install platformio
```

Or use the **PlatformIO IDE** extension for VS Code.

### 2. Configure secrets

```bash
cd firmware/room-node
cp include/secrets.h.example include/secrets.h
# Edit secrets.h: set WIFI_SSID, WIFI_PASSWORD, API_HOST
```

### 3. Set the room ID

Open `src/config.h` and change:

```cpp
#define DEVICE_ROOM_ID    "room-node-01"   // or room-node-02 / room-node-03
#define DEVICE_ROOM_LABEL "Living Room"    // or Bedroom / Kitchen
```

| Room | DEVICE_ROOM_ID | DEVICE_ROOM_LABEL |
|------|---------------|-------------------|
| 1 | `room-node-01` | `Living Room` |
| 2 | `room-node-02` | `Bedroom` |
| 3 | `room-node-03` | `Kitchen` |

### 4. Build

```bash
pio run
```

### 5. Upload

Connect the ESP32 via USB, then:

```bash
pio run --target upload
```

### 6. Monitor serial output

```bash
pio device monitor
```

Expected output:

```
========================================
  Smart Home – Room Node  [Living Room]
  Device ID: room-node-01
========================================

[WiFi] Connected. IP: 192.168.1.101  RSSI: -52 dBm
[WS]   Connected: ws://192.168.1.100:8000/ws
────────────────────────────────────
[Living Room] Temp: 22.4 °C  Hum: 54.2 %  Pres: 1013 hPa
  Light: 41.3 % (413 lux)  Dimmer: 72%  Fan: OFF
────────────────────────────────────
Data sent via WebSocket
```

---

## Sending commands from the backend

The backend WebSocket manager sends JSON commands to this device.
You can also test manually with any WebSocket client (e.g. `wscat`):

```bash
wscat -c ws://192.168.1.100:8000/ws
```

```json
{ "command": "dimmer",           "value": 75 }
{ "command": "fan",              "value": 1  }
{ "command": "daylight_harvest", "value": 0  }
{ "command": "relay1",           "value": 1  }
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| BME280 not found | Wrong I2C address | Change `BME280_ADDRESS` to 0x77 in config.h |
| Light reads always 0 | Wrong pin | Confirm TEMT6000 SIG → GPIO34; check 10 kΩ pull-down |
| Fan relay never fires | Wrong active level | Set `FAN_RELAY_ACTIVE_HIGH false` in config.h |
| WebSocket keeps disconnecting | Wrong API_HOST | Check `secrets.h`; ensure backend is running |
| Cannot upload firmware | COM port not found | Install CH340/CP2102 USB driver; check cable |
