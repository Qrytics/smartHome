/*
 * Configuration Constants for Lighting Control System
 * 
 * This file contains all hardware pin definitions and system constants.
 * DO NOT store secrets here - use secrets.h instead!
 */

#ifndef CONFIG_H
#define CONFIG_H

// Device Identity
#define DEVICE_ID "lighting-control-01"

// WiFi Configuration (credentials in secrets.h)
#define WIFI_RECONNECT_INTERVAL 10000  // Attempt reconnection every 10 seconds

// API/WebSocket Configuration
// API_HOST defined in secrets.h
#define WS_PORT 8000                   // WebSocket port
#define WS_PATH "/ws"                  // WebSocket path

// GPIO Pin Definitions (ESP32-S3)
#define LIGHT_SENSOR_PIN 34            // GPIO 34 - TEMT6000 analog input (ADC1_CH6)
#define DIMMER_PWM_PIN 25              // GPIO 25 - PWM output for dimmer control
#define RELAY_CH1_PIN 26               // GPIO 26 - Relay Channel 1 (main lights)
#define RELAY_CH2_PIN 27               // GPIO 27 - Relay Channel 2 (secondary lights)
#define RELAY_CH3_PIN 14               // GPIO 14 - Relay Channel 3 (HVAC/fans)
#define RELAY_CH4_PIN 12               // GPIO 12 - Relay Channel 4 (spare)

// Light Sensor Configuration (TEMT6000)
#define LIGHT_READ_INTERVAL 500        // Read light sensor every 500ms
#define LIGHT_SAMPLE_COUNT 5           // Average 5 readings for stability
#define LIGHT_MIN_LUX 0.0              // Minimum light level (dark)
#define LIGHT_MAX_LUX 1000.0           // Maximum light level (bright sunlight)

// PWM Configuration for Dimmer
#define PWM_FREQ 5000                  // 5 kHz PWM frequency
#define PWM_RESOLUTION 8               // 8-bit resolution (0-255)
#define PWM_CHANNEL 0                  // LEDC channel 0

// Daylight Harvesting Configuration
#define DAYLIGHT_HARVEST_ENABLED true  // Enable automatic dimming based on ambient light
#define TARGET_LUX 300.0               // Target light level for comfort (300 lux)
#define DIMMER_MIN_PERCENT 10          // Minimum dimmer level (10%)
#define DIMMER_MAX_PERCENT 100         // Maximum dimmer level (100%)

// Relay Configuration
#define RELAY_ACTIVE_HIGH true         // Relay activates on HIGH signal

#endif // CONFIG_H
