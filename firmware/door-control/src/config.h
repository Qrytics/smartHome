/*
 * Configuration Constants for Door Control System
 * 
 * This file contains all hardware pin definitions and system constants.
 * DO NOT store secrets here - use secrets.h instead!
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// Device Identity
// ============================================================================
#define DEVICE_ID "door-control-01"

// ============================================================================
// WiFi Configuration (credentials in secrets.h)
// ============================================================================
#define WIFI_RECONNECT_INTERVAL 10000  // Attempt reconnection every 10 seconds

// ============================================================================
// API Configuration
// ============================================================================
// API_HOST and API_PORT defined in secrets.h
#define HTTP_TIMEOUT 5000              // 5 second timeout for HTTP requests
#define USE_TLS false                  // Enable/disable HTTPS (requires certificates)

// ============================================================================
// Hardware Pin Definitions (ESP32-S3)
// ============================================================================

// RFID RC522 Module (SPI Interface)
#define RFID_SS_PIN   5    // Chip Select
#define RFID_RST_PIN  22   // Reset pin

// Note: SPI pins are fixed on ESP32-S3
// MOSI = GPIO 11
// MISO = GPIO 13
// SCK  = GPIO 12

// Relay Module (for solenoid lock control)
#define RELAY_PIN     4    // GPIO 4 - Relay control

// Status LED
#define LED_PIN       2    // GPIO 2 - Built-in LED

// ============================================================================
// Lock Control Settings
// ============================================================================
#define LOCK_OPEN_DURATION 3000        // Keep lock open for 3 seconds
#define LOCK_ENERGIZE_DELAY 100        // Delay before energizing (ms)

// ============================================================================
// RFID Settings
// ============================================================================
#define RFID_SCAN_INTERVAL 100         // Check for cards every 100ms
#define CARD_DEBOUNCE_TIME 3000        // Ignore same card for 3 seconds

// ============================================================================
// Performance Targets
// ============================================================================
#define TARGET_LATENCY 500             // Target authorization latency (ms)
#define MAX_ACCEPTABLE_LATENCY 1000    // Maximum acceptable latency (ms)

// ============================================================================
// Debug Settings
// ============================================================================
#define DEBUG_MODE true                // Enable verbose serial output
#define SERIAL_BAUD 115200             // Serial monitor baud rate

// ============================================================================
// TLS/HTTPS Settings (if USE_TLS = true)
// ============================================================================
// Certificate paths will be defined here
// #define CA_CERT_PATH "/certs/ca.crt"
// #define CLIENT_CERT_PATH "/certs/client.crt"
// #define CLIENT_KEY_PATH "/certs/client.key"

// ============================================================================
// Failsafe Behavior
// ============================================================================
#define OFFLINE_LOCK_STATE false       // Keep locked when offline (fail-secure)
#define OFFLINE_TIMEOUT 5000           // Consider offline after 5s no response

#endif // CONFIG_H
