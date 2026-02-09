# Sensor Monitor Firmware

ESP32-S3 firmware for environmental monitoring with real-time OLED display.

## Hardware Components

- **ESP32-S3 DevKit** - Main microcontroller
- **BME280 Sensor** - Temperature, humidity, and pressure sensor
- **SSD1306 OLED Display** - 128x64 monochrome display
- **I2C Bus** - Shared communication for sensor and display

## Pin Connections

### BME280 Sensor (I2C)

| BME280 Pin | ESP32-S3 Pin | Description |
|------------|--------------|-------------|
| VCC        | 3.3V         | Power       |
| GND        | GND          | Ground      |
| SCL        | GPIO 22      | I2C Clock   |
| SDA        | GPIO 21      | I2C Data    |

**I2C Address**: 0x76 (default) or 0x77 (if SDO pin HIGH)

### SSD1306 OLED Display (I2C)

| OLED Pin | ESP32-S3 Pin | Description |
|----------|--------------|-------------|
| VCC      | 3.3V         | Power       |
| GND      | GND          | Ground      |
| SCL      | GPIO 22      | I2C Clock   |
| SDA      | GPIO 21      | I2C Data    |

**I2C Address**: 0x3C (default) or 0x3D

**Note:** BME280 and OLED share the same I2C bus (same SCL/SDA pins).

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

3. **Adjust I2C addresses if needed** in `src/config.h`:
   ```cpp
   #define BME280_ADDRESS 0x76  // Or 0x77
   #define OLED_ADDRESS 0x3C    // Or 0x3D
   ```

### Building

```bash
# Build firmware
pio run

# Build with verbose output
pio run -v
```

### Uploading

```bash
# Upload to connected ESP32
pio run --target upload

# Specify port explicitly
pio run --target upload --upload-port /dev/ttyUSB0
```

### Monitoring

```bash
# Open serial monitor
pio device monitor

# Monitor with auto-upload
pio run --target upload && pio device monitor
```

## Firmware Behavior

### Startup Sequence

1. Initialize serial communication (115200 baud)
2. Initialize I2C bus (GPIO 21/22)
3. Initialize OLED display (show splash screen)
4. Initialize BME280 sensor
5. Connect to WiFi network
6. Establish WebSocket connection to backend
7. Enter main loop

### Main Loop

1. Check WiFi connection status (reconnect if needed)
2. Process WebSocket events
3. Every 1 second:
   - Read sensor data (temperature, humidity, pressure)
   - Update OLED display
   - Send data to backend via WebSocket
4. Repeat

### Display Layout

```
┌────────────────────────┐
│ Smart Home Monitor    ●│ ← WiFi indicator
├────────────────────────┤
│ Temp:  23.5 C         │
│                        │
│ Humid: 45.2 %         │
│                        │
│ Press: 1013 hPa       │
└────────────────────────┘
```

**WiFi Indicator:**
- ● (Filled circle) = Connected
- ○ (Empty circle) = Disconnected

### Data Flow

```
┌──────────┐
│ BME280   │
│ Sensor   │
└────┬─────┘
     │ I2C (8ms)
     ▼
┌──────────┐    Update (50ms)    ┌──────────┐
│ ESP32-S3 │──────────────────▶  │  OLED    │
│          │                      │ Display  │
└────┬─────┘                      └──────────┘
     │
     │ WebSocket (100ms)
     ▼
┌──────────┐
│ Backend  │
│   API    │
└──────────┘
```

### Error Handling

- **Sensor Not Found**: Displays error message, continues attempting reads
- **Display Not Found**: Logs to serial, continues operation without display
- **WiFi Disconnected**: Shows on display, attempts reconnection
- **WebSocket Disconnected**: Automatically reconnects every 5 seconds

### Performance Characteristics

- **Sensor Read Time**: ~8ms (I2C transaction)
- **Display Update**: ~50ms (full screen refresh)
- **Data Send Interval**: 1 second
- **WebSocket Latency**: <100ms typically
- **Dashboard Update**: <1 second total

## Testing

### Unit Tests

```bash
# Run unit tests
pio test
```

### Manual Testing Procedure

1. **Power On Test**
   - Upload firmware
   - Check OLED shows splash screen
   - Verify WiFi connection in serial monitor
   - Confirm sensor readings on display

2. **Sensor Accuracy Test**
   - Compare readings with reference thermometer
   - Temperature should be ±0.5°C
   - Humidity should be ±3%
   - Pressure should be ±1 hPa

3. **Display Test**
   - Verify all text is readable
   - Check WiFi indicator changes with connection
   - Confirm updates every second

4. **WebSocket Test**
   - Check serial monitor for "Data sent via WebSocket"
   - Verify backend receives data
   - Confirm dashboard updates in real-time

5. **Stress Test**
   - Run continuously for 24 hours
   - Monitor for memory leaks
   - Check for display artifacts
   - Verify consistent data transmission

## Troubleshooting

### Sensor Not Detected

- Check I2C wiring (especially SDA/SCL)
- Verify 3.3V power supply
- Try alternate I2C address (0x77):
  ```cpp
  #define BME280_ADDRESS 0x77
  ```
- Scan I2C bus to find device:
  ```bash
  pio test -f test_i2c_scan
  ```

### Display Not Working

- Verify OLED connections
- Check I2C address (0x3C or 0x3D)
- Test with different display library
- Ensure sufficient power supply (display draws ~10mA)

### Incorrect Readings

**Temperature too high:**
- Sensor near heat source (move away from ESP32)
- Poor ventilation (add airflow)
- Apply calibration offset in config.h

**Humidity incorrect:**
- Sensor needs conditioning (run 24h)
- Ambient humidity too high/low
- Check for condensation

**Pressure wrong:**
- Adjust for altitude:
  ```cpp
  float altitude = bme.readAltitude(PRESSURE_SEA_LEVEL);
  ```

### WiFi Connection Issues

- Double-check credentials in `secrets.h`
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Move closer to router
- Check for WiFi interference

### WebSocket Not Connecting

- Verify backend is running
- Check firewall allows WebSocket connections
- Confirm correct port in config.h
- Test WebSocket endpoint with browser

### Display Flickering

- Reduce update frequency in config.h
- Check power supply stability
- Verify I2C pull-up resistors (4.7kΩ)

## Calibration

### Temperature Calibration

1. Measure with reference thermometer
2. Calculate offset: `offset = reference - measured`
3. Apply in config.h:
   ```cpp
   #define TEMP_OFFSET -1.5  // If sensor reads 1.5°C too high
   ```

### Humidity Calibration

Use salt test method:
1. Place sensor in sealed container with saturated salt solution (75.3% RH)
2. Wait 24 hours for equilibrium
3. Calculate offset: `offset = 75.3 - measured`
4. Apply in config.h

## Power Consumption

| Component | Current | Notes |
|-----------|---------|-------|
| ESP32-S3 | ~80mA | Active WiFi |
| BME280 | <1mA | Continuous reading |
| OLED | ~10mA | Full white display |
| **Total** | **~91mA** | At 3.3V = 0.3W |

**Battery Life Estimates:**
- 1000mAh battery: ~11 hours
- 2500mAh battery: ~27 hours
- 10000mAh power bank: ~110 hours

## Advanced Features

### Deep Sleep Mode (Optional)

Reduce power consumption by sleeping between reads:

```cpp
#define ENABLE_DEEP_SLEEP true
#define DEEP_SLEEP_DURATION 60  // Wake every 60 seconds
```

**Trade-offs:**
- Greatly reduced power (~10mA average)
- No real-time updates
- WebSocket reconnection overhead

### Data Buffering

Buffer readings locally and send in batches:

```cpp
#define BUFFER_SIZE 10        // Store 10 readings
#define SEND_INTERVAL 10000   // Send every 10 seconds
```

**Benefits:**
- Reduced network traffic
- Better WiFi power efficiency
- Batch processing in backend

## Security Considerations

- **Never commit `secrets.h`** to version control
- Use secure WebSocket (WSS) in production
- Implement device authentication
- Encrypt sensor data if sensitive
- Monitor for unusual data patterns

## Future Enhancements

- [ ] NTP time synchronization
- [ ] Local data logging to SD card
- [ ] Additional sensors (CO2, VOC, light)
- [ ] Alerts for threshold violations
- [ ] OTA (Over-The-Air) firmware updates
- [ ] Web configuration interface
- [ ] Battery monitoring
- [ ] Historical graph on OLED

## References

- [BME280 Datasheet](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf)
- [SSD1306 Datasheet](https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf)
- [Adafruit BME280 Library](https://github.com/adafruit/Adafruit_BME280_Library)
- [Adafruit SSD1306 Library](https://github.com/adafruit/Adafruit_SSD1306)

---

Last updated: 2026-02-09
