# Door Control Firmware

ESP32-S3 firmware for RFID-based access control with electromagnetic lock.

## Hardware Components

- **ESP32-S3 DevKit** - Main microcontroller
- **RC522 RFID Reader** - 13.56 MHz card reader
- **12V Solenoid Lock** - Electromagnetic door lock
- **5V Relay Module** - Controls solenoid power
- **Status LED** - Visual feedback

## Pin Connections

### RFID RC522 Module (SPI)

| RC522 Pin | ESP32-S3 Pin | Description |
|-----------|--------------|-------------|
| SDA (SS)  | GPIO 5       | Chip Select |
| SCK       | GPIO 12      | SPI Clock   |
| MOSI      | GPIO 11      | Master Out  |
| MISO      | GPIO 13      | Master In   |
| IRQ       | Not connected| Interrupt   |
| GND       | GND          | Ground      |
| RST       | GPIO 22      | Reset       |
| 3.3V      | 3.3V         | Power       |

### Relay Module

| Relay Pin | ESP32-S3 Pin | Description |
|-----------|--------------|-------------|
| IN        | GPIO 4       | Control     |
| VCC       | 5V           | Power       |
| GND       | GND          | Ground      |

### Solenoid Lock

Connected to relay output:
- **COM** (Common) → 12V Power Supply (+)
- **NO** (Normally Open) → Solenoid (+)
- **Solenoid (-)** → 12V Power Supply (-)

### Status LED

| LED Pin | ESP32-S3 Pin | Description |
|---------|--------------|-------------|
| Anode (+) | GPIO 2     | Built-in LED|
| Cathode (-) | GND      | Ground      |

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
   #define API_PORT 8000
   ```

3. **Adjust hardware pins if needed** in `src/config.h`

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
2. Configure lock in secure state (locked)
3. Connect to WiFi network
4. Initialize RFID reader
5. Enter main loop

### Main Loop

1. Check WiFi connection status (reconnect if needed)
2. Poll RFID reader for new cards
3. When card detected:
   - Read card UID
   - Send authorization request to backend API
   - If authorized: unlock for 3 seconds, then lock
   - If denied: blink LED to indicate error
4. Repeat

### Authorization Flow

```
┌──────────────┐
│ Card Present │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Read UID    │
└──────┬───────┘
       │
       ▼
┌────────────────────┐     ┌─────────────┐
│ POST /api/access/  │────▶│  Backend    │
│ check {uid,device} │     │  API        │
└────────┬───────────┘     └─────────────┘
         │
         ▼
    ┌─────────┐
    │Response?│
    └────┬────┘
         │
    ┌────┴────────┐
    │             │
 GRANTED       DENIED
    │             │
    ▼             ▼
┌───────┐    ┌────────┐
│Unlock │    │Blink   │
│3 sec  │    │LED     │
└───┬───┘    └────────┘
    │
    ▼
┌───────┐
│ Lock  │
└───────┘
```

### Error Handling

- **WiFi Disconnected**: Attempts reconnection every 10 seconds, denies all access
- **HTTP Timeout**: Fails secure (denies access)
- **Malformed Response**: Fails secure (denies access)
- **Card Read Error**: Retries next loop iteration

### Performance Characteristics

- **Target Latency**: <500ms (card to lock actuation)
- **Card Debounce**: 3 seconds (ignores duplicate reads)
- **HTTP Timeout**: 5 seconds
- **WiFi Reconnect**: 10 seconds between attempts

## Testing

### Unit Tests

```bash
# Run unit tests (requires PlatformIO test framework)
pio test
```

### Manual Testing Procedure

1. **Power On Test**
   - Upload firmware
   - Check serial output shows initialization
   - Verify LED blinks briefly on startup
   - Confirm WiFi connection success

2. **RFID Read Test**
   - Place any RFID card on reader
   - Serial monitor should show card UID
   - Verify format: `04:A3:2B:F2:1C:80`

3. **Authorization Test**
   - Add card to backend whitelist
   - Swipe card on reader
   - Verify:
     - Serial shows "GRANTED"
     - Relay clicks (lock actuates)
     - Lock opens for ~3 seconds
     - Lock automatically closes

4. **Denial Test**
   - Swipe unknown card
   - Verify:
     - Serial shows "DENIED"
     - LED blinks 3 times
     - Lock remains closed

5. **Performance Test**
   - Swipe authorized card
   - Check latency in serial output
   - Should be <500ms consistently

## Troubleshooting

### Card Not Detected

- Verify RC522 connections (especially SDA/SS pin)
- Check 3.3V power supply to RC522
- Try different card (some cards use incompatible protocols)
- Reduce distance between card and reader (<3cm)

### WiFi Connection Fails

- Double-check SSID and password in `secrets.h`
- Ensure ESP32 is within WiFi range
- Verify 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Check router allows new devices

### Lock Doesn't Actuate

- Verify relay connections
- Check 12V power supply to solenoid
- Measure voltage at relay output (should be 12V when unlocked)
- Listen for relay click (should be audible)
- Test relay manually with jumper wire

### High Latency (>500ms)

- Check WiFi signal strength (should be >-70 dBm)
- Verify backend server is reachable: `ping <API_HOST>`
- Check backend response time
- Reduce network traffic
- Move ESP32 closer to router

### Compilation Errors

- Ensure PlatformIO is up to date: `pio upgrade`
- Clean build: `pio run --target clean`
- Delete `.pio` directory and rebuild
- Check library versions in `platformio.ini`

## Security Considerations

- **Never commit `secrets.h`** to version control
- Use HTTPS (TLS) in production (set `USE_TLS = true`)
- Implement certificate pinning for production
- Rotate device credentials regularly
- Monitor access logs for suspicious activity
- Use strong WiFi encryption (WPA2/WPA3)

## Future Enhancements

- [ ] NTP time synchronization for accurate timestamps
- [ ] TLS certificate validation
- [ ] Local whitelist caching for offline operation
- [ ] Battery backup detection
- [ ] Tamper detection (magnetic sensor)
- [ ] Acoustic feedback (buzzer)
- [ ] Multi-factor authentication support

## References

- [MFRC522 Library Documentation](https://github.com/miguelbalboa/rfid)
- [ESP32-S3 Technical Reference](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [PlatformIO Documentation](https://docs.platformio.org/)

---

Last updated: 2026-02-09
