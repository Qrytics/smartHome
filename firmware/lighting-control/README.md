# Lighting Control Firmware

ESP32-S3 firmware for ambient light sensing and intelligent dimming control with daylight harvesting.

## Hardware Components

- **ESP32-S3 DevKit** - Main microcontroller
- **TEMT6000 Light Sensor** - Ambient light level detection
- **MOSFET PWM Dimmer Module** - LED brightness control (IRF520/IRF540)
- **4-Channel 5V Relay Module** - High-power load switching (optional)

## Features

- **Ambient Light Sensing**: Continuous monitoring of light levels using TEMT6000
- **PWM Dimming Control**: Smooth 0-100% brightness adjustment for LED lights
- **Daylight Harvesting**: Automatic brightness adjustment based on ambient light to save energy
- **Relay Control**: Optional 4-channel relay for switching high-power loads (HVAC, main lights)
- **WebSocket Communication**: Real-time data streaming and command reception
- **WiFi Auto-Reconnection**: Automatic recovery from network interruptions

## Pin Connections

### TEMT6000 Light Sensor (Analog)

| TEMT6000 Pin | ESP32-S3 Pin | Description |
|--------------|--------------|-------------|
| VCC          | 3.3V         | Power       |
| GND          | GND          | Ground      |
| SIG          | GPIO 34      | Analog Output (ADC1_CH6) |

**Notes:**
- TEMT6000 outputs voltage proportional to light intensity (0-3.3V)
- ESP32 ADC reads 0-4095 (12-bit resolution)
- Linear response across visible spectrum (peak ~570nm)

### MOSFET PWM Dimmer Module

| Dimmer Pin | ESP32-S3 Pin | Description |
|------------|--------------|-------------|
| VCC        | 5V           | Power       |
| GND        | GND          | Ground      |
| SIG        | GPIO 25      | PWM Input   |
| V+         | 12V          | LED Supply Positive |
| V-         | LED-         | LED Supply Negative |
| OUT+       | LED+         | Dimmed LED Output |

**PWM Settings:**
- Frequency: 5 kHz (flicker-free for human vision)
- Resolution: 8-bit (0-255 duty cycle)
- 0% = LEDs off, 100% = LEDs full brightness

### 4-Channel Relay Module (Optional)

| Relay Pin | ESP32-S3 Pin | Description |
|-----------|--------------|-------------|
| VCC       | 5V           | Power       |
| GND       | GND          | Ground      |
| IN1       | GPIO 26      | Channel 1 Control |
| IN2       | GPIO 27      | Channel 2 Control |
| IN3       | GPIO 14      | Channel 3 Control |
| IN4       | GPIO 12      | Channel 4 Control |

**Relay Ratings:**
- 10A @ 250VAC / 30VDC per channel
- Ideal for switching main lights, HVAC fans, or other high-power loads

## Software Setup

### Prerequisites

- [PlatformIO](https://platformio.org/) installed
- USB cable for ESP32 programming
- Arduino framework support

### Configuration

1. **Copy secrets template:**
   ```bash
   cp include/secrets.h.example include/secrets.h
   ```

2. **Edit `include/secrets.h` with your credentials:**
   ```cpp
   #define WIFI_SSID "YourNetworkName"
   #define WIFI_PASSWORD "YourPassword"
   #define API_HOST "192.168.1.100"  // Your backend server IP
   ```

3. **Adjust configuration in `src/config.h`:**
   - `TARGET_LUX`: Desired room brightness (default: 300 lux)
   - `DIMMER_MIN_PERCENT`: Minimum dimmer level (default: 10%)
   - `DAYLIGHT_HARVEST_ENABLED`: Enable/disable automatic dimming

### Building and Uploading

```bash
# Navigate to firmware directory
cd firmware/lighting-control

# Build firmware
pio run

# Upload to ESP32
pio run --target upload

# Monitor serial output
pio device monitor
```

## Operation

### Daylight Harvesting Mode

When enabled (default), the system automatically adjusts LED brightness based on ambient light:

- **High ambient light** (bright day) → **Low LED brightness** (save energy)
- **Low ambient light** (dark/cloudy) → **High LED brightness** (maintain comfort)

Target brightness is calculated to maintain `TARGET_LUX` (300 lux default) total illumination.

### Manual Control Mode

Send WebSocket commands to override automatic dimming:

```json
{
  "command": "dimmer",
  "value": 75
}
```

This sets dimmer to 75% and disables daylight harvesting until re-enabled.

### Relay Control Commands

Switch relays on/off via WebSocket:

```json
{
  "command": "relay1",
  "value": 1
}
```

Channels 1-4 available, value: 1 = ON, 0 = OFF

### Re-enable Daylight Harvesting

```json
{
  "command": "daylight_harvest",
  "value": 1
}
```

## Data Streaming

Every 500ms, the system sends sensor data via WebSocket:

```json
{
  "device_id": "lighting-control-01",
  "timestamp": "2026-02-11T16:00:00.000Z",
  "light_level": 45.3,
  "light_lux": 453.0,
  "dimmer_brightness": 65,
  "daylight_harvest_mode": true,
  "relays": [false, false, false, false]
}
```

## Calibration

### Light Sensor Calibration

The TEMT6000 sensor provides relative light levels. For accurate lux readings:

1. Measure known light sources with a lux meter
2. Record corresponding ADC readings from sensor
3. Adjust `LIGHT_MAX_LUX` in `config.h` to match your environment

Typical values:
- Moonlight: ~1 lux
- Living room: 50-150 lux
- Office: 300-500 lux
- Daylight (indirect): 10,000+ lux

## Troubleshooting

### Light readings always 0
- Check TEMT6000 wiring (VCC, GND, SIG)
- Verify sensor has light exposure (not covered)
- Test with multimeter: should read 0-3.3V on SIG pin

### Dimmer not responding
- Verify PWM signal with oscilloscope (5 kHz, 0-3.3V)
- Check MOSFET module power supply (needs 5V + LED supply voltage)
- Ensure LED polarity correct on output terminals

### Relays not switching
- Check relay module power (needs 5V supply)
- Verify GPIO signals with multimeter (HIGH = 3.3V)
- Test relay manually by connecting IN pins to VCC

### WiFi won't connect
- Check SSID/password in `secrets.h`
- Verify ESP32 within WiFi range
- Check router supports 2.4GHz (ESP32 doesn't support 5GHz)

## License

Part of the Smart Home Model project. See main repository LICENSE file.
