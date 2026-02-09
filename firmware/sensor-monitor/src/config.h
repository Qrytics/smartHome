/*
 * Configuration Constants for Sensor Monitor System
 * 
 * This file contains all hardware pin definitions and system constants.
 * DO NOT store secrets here - use secrets.h instead!
 */

#ifndef CONFIG_H
#define CONFIG_H

// Device Identity
#define DEVICE_ID "sensor-monitor-01"

// WiFi Configuration (credentials in secrets.h)
#define WIFI_RECONNECT_INTERVAL 10000  // Attempt reconnection every 10 seconds

// API/WebSocket Configuration
// API_HOST defined in secrets.h
#define WS_PORT 8000                   // WebSocket port
#define WS_PATH "/ws"                  // WebSocket path

// I2C Pin Definitions (ESP32-S3)
#define I2C_SDA 21                     // GPIO 21 - I2C Data
#define I2C_SCL 22                     // GPIO 22 - I2C Clock

// BME280 Sensor Configuration
#define BME280_ADDRESS 0x76            // I2C address (0x76 or 0x77)
#define SENSOR_READ_INTERVAL 1000      // Read sensor every 1 second

// OLED Display Configuration (SSD1306)
#define OLED_ADDRESS 0x3C              // I2C address
#define SCREEN_WIDTH 128               // OLED display width in pixels
#define SCREEN_HEIGHT 64               // OLED display height in pixels
#define OLED_RESET -1                  // Reset pin (or -1 if sharing Arduino reset)

#endif // CONFIG_H
