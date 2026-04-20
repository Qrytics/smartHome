/*
 * Configuration Constants for Room Node
 *
 * Each of the three room ESPs runs this same firmware.
 * The only value you change per room is DEVICE_ROOM_ID.
 *
 * Hardware connected to each room ESP32:
 *   - BME280          : I2C  (temperature, humidity, pressure)
 *   - TEMT6000        : ADC  (ambient light sensor)
 *   - PWM LED dimmer  : GPIO (0-100 % brightness via LEDC)
 *   - Fan relay       : GPIO (on/off via relay module)
 *
 * DO NOT store WiFi credentials or API host here – use secrets.h instead.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// Device Identity  –  change this for each room
// ============================================================================
// Allowed values: "room-node-01", "room-node-02", "room-node-03"
#define DEVICE_ROOM_ID "room-node-01"

// Human-readable location label (used in serial output)
#define DEVICE_ROOM_LABEL "Living Room"

// ============================================================================
// WiFi / Connection
// ============================================================================
#define WIFI_RECONNECT_INTERVAL 10000   // ms between reconnection attempts

// ============================================================================
// API / WebSocket
// ============================================================================
// API_HOST is defined in secrets.h
#define WS_PORT 8000
#define WS_PATH "/ws"
#define WS_AUTH_ROLE "device"
#define WS_AUTH_SECRET "demo-device-secret-change-me"

// ============================================================================
// I2C Pins  (BME280)
// ============================================================================
#define I2C_SDA 21
#define I2C_SCL 22

// ============================================================================
// BME280 Sensor
// ============================================================================
#define BME280_ADDRESS    0x76   // Use 0x77 if SDO pin is HIGH
#define SENSOR_READ_INTERVAL 2000  // ms between sensor reads

// ============================================================================
// TEMT6000 Ambient Light Sensor  (analog)
// ============================================================================
#define LIGHT_SENSOR_PIN  34     // GPIO 34 – ADC1_CH6 (input-only pin)
#define LIGHT_SAMPLE_COUNT 5     // average N samples per reading
#define LIGHT_MAX_LUX 1000.0     // full-scale lux for TEMT6000 @ 3.3 V

// ============================================================================
// PWM Dimmer  (LEDC)
// ============================================================================
#define DIMMER_PWM_PIN   25      // GPIO 25 – PWM output
#define PWM_CHANNEL       0      // LEDC channel
#define PWM_FREQ       5000      // Hz
#define PWM_RESOLUTION    8      // bits  (0–255 duty cycle)

// Daylight-harvesting defaults
#define DAYLIGHT_HARVEST_ENABLED  true
#define TARGET_LUX               300.0
#define DIMMER_MIN_PERCENT        10
#define DIMMER_MAX_PERCENT       100

// ============================================================================
// Fan Relay
// ============================================================================
#define FAN_RELAY_PIN    26      // GPIO 26 – relay IN pin
#define FAN_RELAY_ACTIVE_HIGH true   // HIGH = fan ON for most relay modules

// ============================================================================
// Status LED
// ============================================================================
#define STATUS_LED_PIN    2      // Built-in LED on most ESP32 dev boards

// ============================================================================
// Debug
// ============================================================================
#define DEBUG_MODE   true
#define SERIAL_BAUD  115200

#endif // CONFIG_H
