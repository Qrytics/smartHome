/*
 * Smart Home - Lighting Control System
 * ESP32 #3: Ambient Light Sensing and Dimming Control
 * 
 * This firmware handles:
 * - TEMT6000 ambient light sensor reading
 * - PWM-based LED dimming (0-100%)
 * - Daylight harvesting (automatic brightness adjustment)
 * - 4-channel relay control for high-power loads
 * - Real-time data streaming via WebSocket
 * - WiFi connectivity with auto-reconnection
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "secrets.h"

// WebSocket Client
WebSocketsClient webSocket;

// State variables
bool wifiConnected = false;
unsigned long lastLightRead = 0;
unsigned long lastConnectionAttempt = 0;

// Sensor readings
float ambientLightLevel = 0.0;      // Current light level (0-100%)
float ambientLightLux = 0.0;        // Calculated lux value
int dimmerBrightness = 100;         // Current dimmer setting (0-100%)
bool daylightHarvestMode = DAYLIGHT_HARVEST_ENABLED;

// Relay states
bool relay1State = false;
bool relay2State = false;
bool relay3State = false;
bool relay4State = false;

// Function declarations
void setupWiFi();
void setupPins();
void setupWebSocket();
void readLightSensor();
void updateDimmer(int brightness);
void setRelay(int channel, bool state);
void sendSensorData();
void processCommand(String command, int value);
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
String getISOTimestamp();

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n====================================");
  Serial.println("Smart Home - Lighting Control System");
  Serial.println("====================================\n");

  // Initialize components
  setupPins();
  setupWiFi();
  setupWebSocket();

  Serial.println("\nSystem Ready!");
  Serial.println("Starting light sensor readings...\n");
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

  // Read light sensor at specified interval
  if (millis() - lastLightRead >= LIGHT_READ_INTERVAL) {
    readLightSensor();
    
    // Apply daylight harvesting if enabled
    if (daylightHarvestMode) {
      // Calculate dimmer brightness based on ambient light
      // More ambient light = lower dimmer brightness needed
      int targetBrightness = map(constrain(ambientLightLux, 0, TARGET_LUX), 
                                   0, TARGET_LUX, 
                                   DIMMER_MAX_PERCENT, DIMMER_MIN_PERCENT);
      updateDimmer(targetBrightness);
    }
    
    if (wifiConnected) {
      sendSensorData();
    }
    
    lastLightRead = millis();
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

void setupPins() {
  Serial.println("Initializing GPIO pins...");
  
  // Configure light sensor pin (analog input)
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  
  // Configure PWM for dimmer
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(DIMMER_PWM_PIN, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 255); // Start at full brightness
  
  // Configure relay pins
  pinMode(RELAY_CH1_PIN, OUTPUT);
  pinMode(RELAY_CH2_PIN, OUTPUT);
  pinMode(RELAY_CH3_PIN, OUTPUT);
  pinMode(RELAY_CH4_PIN, OUTPUT);
  
  // Initialize relays to OFF
  digitalWrite(RELAY_CH1_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  digitalWrite(RELAY_CH2_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  digitalWrite(RELAY_CH3_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  digitalWrite(RELAY_CH4_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  
  Serial.println("GPIO pins initialized.");
}

void setupWebSocket() {
  Serial.print("Configuring WebSocket to: ");
  Serial.print(API_HOST);
  Serial.print(":");
  Serial.println(WS_PORT);
  
  webSocket.begin(API_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void readLightSensor() {
  // Read multiple samples and average for stability
  long totalReading = 0;
  for (int i = 0; i < LIGHT_SAMPLE_COUNT; i++) {
    totalReading += analogRead(LIGHT_SENSOR_PIN);
    delay(10);
  }
  int avgReading = totalReading / LIGHT_SAMPLE_COUNT;
  
  // Convert ADC reading (0-4095 for ESP32) to percentage (0-100%)
  ambientLightLevel = (avgReading / 4095.0) * 100.0;
  
  // Convert to approximate lux (TEMT6000 typical: 0-1000 lux range)
  // This is a simplified linear mapping; real conversion requires calibration
  ambientLightLux = (avgReading / 4095.0) * LIGHT_MAX_LUX;
  
  // Print to serial
  Serial.println("─────────────────────────────");
  Serial.print("Ambient Light: ");
  Serial.print(ambientLightLevel, 1);
  Serial.print("% (");
  Serial.print(ambientLightLux, 1);
  Serial.println(" lux)");
  Serial.print("Dimmer: ");
  Serial.print(dimmerBrightness);
  Serial.println("%");
  Serial.println("─────────────────────────────");
}

void updateDimmer(int brightness) {
  // Constrain brightness to valid range
  brightness = constrain(brightness, 0, 100);
  
  // Only update if value changed
  if (brightness != dimmerBrightness) {
    dimmerBrightness = brightness;
    
    // Convert percentage to PWM duty cycle (0-255)
    int pwmValue = map(brightness, 0, 100, 0, 255);
    ledcWrite(PWM_CHANNEL, pwmValue);
    
    Serial.print("Dimmer updated to: ");
    Serial.print(brightness);
    Serial.println("%");
  }
}

void setRelay(int channel, bool state) {
  int pin = -1;
  bool* stateVar = nullptr;
  
  switch (channel) {
    case 1:
      pin = RELAY_CH1_PIN;
      stateVar = &relay1State;
      break;
    case 2:
      pin = RELAY_CH2_PIN;
      stateVar = &relay2State;
      break;
    case 3:
      pin = RELAY_CH3_PIN;
      stateVar = &relay3State;
      break;
    case 4:
      pin = RELAY_CH4_PIN;
      stateVar = &relay4State;
      break;
    default:
      Serial.println("Invalid relay channel!");
      return;
  }
  
  *stateVar = state;
  digitalWrite(pin, (RELAY_ACTIVE_HIGH && state) ? HIGH : LOW);
  
  Serial.print("Relay ");
  Serial.print(channel);
  Serial.print(" set to: ");
  Serial.println(state ? "ON" : "OFF");
}

void sendSensorData() {
  // Build JSON payload
  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();
  doc["light_level"] = ambientLightLevel;
  doc["light_lux"] = ambientLightLux;
  doc["dimmer_brightness"] = dimmerBrightness;
  doc["daylight_harvest_mode"] = daylightHarvestMode;
  
  JsonArray relays = doc.createNestedArray("relays");
  relays.add(relay1State);
  relays.add(relay2State);
  relays.add(relay3State);
  relays.add(relay4State);
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send via WebSocket
  webSocket.sendTXT(jsonPayload);
  
  Serial.println("Data sent via WebSocket");
}

void processCommand(String command, int value) {
  Serial.print("Processing command: ");
  Serial.print(command);
  Serial.print(" = ");
  Serial.println(value);
  
  if (command == "dimmer") {
    // Manual dimmer control
    daylightHarvestMode = false;  // Disable auto mode when manual command received
    updateDimmer(value);
  } else if (command == "relay1") {
    setRelay(1, value > 0);
  } else if (command == "relay2") {
    setRelay(2, value > 0);
  } else if (command == "relay3") {
    setRelay(3, value > 0);
  } else if (command == "relay4") {
    setRelay(4, value > 0);
  } else if (command == "daylight_harvest") {
    daylightHarvestMode = (value > 0);
    Serial.print("Daylight harvesting: ");
    Serial.println(daylightHarvestMode ? "ENABLED" : "DISABLED");
  } else {
    Serial.println("Unknown command!");
  }
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
      
      // Parse incoming JSON command
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        String cmd = doc["command"] | "";
        int val = doc["value"] | 0;
        if (cmd.length() > 0) {
          processCommand(cmd, val);
        }
      } else {
        Serial.println("[WS] JSON parse error!");
      }
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
  return "2026-02-11T16:00:00.000Z";
}
