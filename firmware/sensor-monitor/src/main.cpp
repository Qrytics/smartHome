/*
 * Smart Home - Sensor Monitor System
 * ESP32 #2: Environmental Monitoring with OLED Display
 * 
 * This firmware handles:
 * - BME280 sensor reading (temperature, humidity, pressure)
 * - OLED display updates (SSD1306)
 * - Real-time data streaming via WebSocket
 * - WiFi connectivity with auto-reconnection
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "secrets.h"

// BME280 Sensor
Adafruit_BME280 bme;

// OLED Display
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// WebSocket Client
WebSocketsClient webSocket;

// State variables
bool wifiConnected = false;
bool sensorInitialized = false;
bool displayInitialized = false;
unsigned long lastSensorRead = 0;
unsigned long lastConnectionAttempt = 0;

// Sensor readings
float temperature = 0.0;
float humidity = 0.0;
float pressure = 0.0;

// Function declarations
void setupWiFi();
void setupSensor();
void setupDisplay();
void setupWebSocket();
void readSensorData();
void updateDisplay();
void sendSensorData();
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
String getISOTimestamp();

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n====================================");
  Serial.println("Smart Home - Sensor Monitor System");
  Serial.println("====================================\n");

  // Initialize I2C
  Wire.begin(I2C_SDA, I2C_SCL);

  // Initialize components
  setupDisplay();
  setupSensor();
  setupWiFi();
  setupWebSocket();

  Serial.println("\nSystem Ready!");
  Serial.println("Starting sensor readings...\n");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    if (millis() - lastConnectionAttempt > WIFI_RECONNECT_INTERVAL) {
      Serial.println("WiFi disconnected. Attempting reconnection...");
      setupWiFi();
      lastConnectionAttempt = millis();
    }
  } else {
    wifiConnected = true;
  }

  // Process WebSocket events
  webSocket.loop();

  // Read sensor data at specified interval
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensorData();
    updateDisplay();
    
    if (wifiConnected) {
      sendSensorData();
    }
    
    lastSensorRead = millis();
  }

  delay(10);
}

void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    wifiConnected = true;
  } else {
    Serial.println("\nWiFi connection failed!");
    wifiConnected = false;
  }
}

void setupSensor() {
  Serial.println("Initializing BME280 sensor...");
  
  if (!bme.begin(BME280_ADDRESS)) {
    Serial.println("ERROR: Could not find BME280 sensor!");
    Serial.println("Check wiring and I2C address (0x76 or 0x77)");
    sensorInitialized = false;
  } else {
    Serial.println("BME280 sensor initialized.");
    
    // Configure sensor settings
    bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                    Adafruit_BME280::SAMPLING_X2,   // Temperature oversampling
                    Adafruit_BME280::SAMPLING_X16,  // Humidity oversampling
                    Adafruit_BME280::SAMPLING_X16,  // Pressure oversampling
                    Adafruit_BME280::FILTER_X16,    // Filtering
                    Adafruit_BME280::STANDBY_MS_500); // Standby time
    
    sensorInitialized = true;
  }
}

void setupDisplay() {
  Serial.println("Initializing OLED display...");
  
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("ERROR: Could not find SSD1306 display!");
    displayInitialized = false;
  } else {
    Serial.println("OLED display initialized.");
    displayInitialized = true;
    
    // Show startup screen
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Smart Home");
    display.println("Sensor Monitor");
    display.println();
    display.println("Initializing...");
    display.display();
    delay(2000);
  }
}

void setupWebSocket() {
  Serial.print("Configuring WebSocket to: ");
  Serial.print(API_HOST);
  Serial.print(":");
  Serial.println(WS_PORT);
  
  webSocket.begin(API_HOST, WS_PORT, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void readSensorData() {
  if (!sensorInitialized) {
    return;
  }

  // Read sensor values
  temperature = bme.readTemperature();
  humidity = bme.readHumidity();
  pressure = bme.readPressure() / 100.0F;  // Convert Pa to hPa

  // Print to serial
  Serial.println("─────────────────────────────");
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  
  Serial.print("Humidity:    ");
  Serial.print(humidity);
  Serial.println(" %");
  
  Serial.print("Pressure:    ");
  Serial.print(pressure);
  Serial.println(" hPa");
  Serial.println("─────────────────────────────");
}

void updateDisplay() {
  if (!displayInitialized) {
    return;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  // Title
  display.setCursor(0, 0);
  display.println("Smart Home Monitor");
  display.drawLine(0, 10, SCREEN_WIDTH, 10, SSD1306_WHITE);
  
  // Temperature
  display.setCursor(0, 16);
  display.print("Temp: ");
  display.setTextSize(2);
  display.print(temperature, 1);
  display.setTextSize(1);
  display.println(" C");
  
  // Humidity
  display.setCursor(0, 36);
  display.print("Humid: ");
  display.setTextSize(2);
  display.print(humidity, 1);
  display.setTextSize(1);
  display.println(" %");
  
  // Pressure
  display.setCursor(0, 56);
  display.print("Press: ");
  display.print(pressure, 0);
  display.println(" hPa");
  
  // WiFi status indicator
  if (wifiConnected) {
    display.fillCircle(SCREEN_WIDTH - 6, 6, 3, SSD1306_WHITE);
  } else {
    display.drawCircle(SCREEN_WIDTH - 6, 6, 3, SSD1306_WHITE);
  }
  
  display.display();
}

void sendSensorData() {
  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["pressure"] = pressure;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send via WebSocket
  webSocket.sendTXT(jsonPayload);
  
  Serial.println("Data sent via WebSocket");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      break;
      
    case WStype_CONNECTED:
      Serial.println("[WS] Connected!");
      Serial.printf("[WS] URL: %s\n", payload);
      break;
      
    case WStype_TEXT:
      Serial.printf("[WS] Received: %s\n", payload);
      break;
      
    case WStype_ERROR:
      Serial.println("[WS] Error!");
      break;
      
    default:
      break;
  }
}

String getISOTimestamp() {
  // TODO: Implement NTP time sync for accurate timestamps
  // For now, return a placeholder
  return "2026-02-09T19:59:04.032Z";
}
