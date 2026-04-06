/*
 * Smart Home – Room Node Firmware
 * ESP32 (rooms 1, 2, 3): BME280 + TEMT6000 + PWM Dimmer + Fan Relay
 *
 * Each room has ONE ESP32 running this firmware.  Change DEVICE_ROOM_ID
 * in config.h to "room-node-01", "room-node-02", or "room-node-03".
 *
 * Data reported every SENSOR_READ_INTERVAL ms via WebSocket:
 *   {
 *     "device_id": "room-node-01",
 *     "room":      "Living Room",
 *     "timestamp": "<ISO-8601>",
 *     "temperature": 22.5,
 *     "humidity":    55.0,
 *     "pressure":    1013.25,
 *     "light_level": 45.3,
 *     "light_lux":   453.0,
 *     "dimmer_brightness": 65,
 *     "daylight_harvest_mode": true,
 *     "fan_on": false,
 *     "relays": [false, false, false, false]
 *   }
 *
 * Commands accepted via WebSocket JSON:
 *   { "command": "dimmer",           "value": 0-100  }
 *   { "command": "fan",              "value": 0 | 1  }
 *   { "command": "relay1",           "value": 0 | 1  }
 *   { "command": "relay2",           "value": 0 | 1  }
 *   { "command": "relay3",           "value": 0 | 1  }
 *   { "command": "relay4",           "value": 0 | 1  }
 *   { "command": "daylight_harvest", "value": 0 | 1  }
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "secrets.h"

// ============================================================================
// Peripheral objects
// ============================================================================
Adafruit_BME280 bme;
WebSocketsClient webSocket;

// ============================================================================
// State
// ============================================================================
bool wifiConnected        = false;
bool sensorInitialized    = false;
unsigned long lastRead    = 0;
unsigned long lastReconn  = 0;

// Sensor readings
float temperature    = 0.0;
float humidity       = 0.0;
float pressure       = 0.0;
float lightLevel     = 0.0;  // 0–100 %
float lightLux       = 0.0;

// Control state
int  dimmerBrightness     = 100;
bool daylightHarvestMode  = DAYLIGHT_HARVEST_ENABLED;
bool fanOn                = false;
bool relay1               = false;
bool relay2               = false;
bool relay3               = false;
bool relay4               = false;

// ============================================================================
// Forward declarations
// ============================================================================
void setupWiFi();
void setupSensor();
void setupPins();
void setupWebSocket();
void readSensors();
void applyDaylightHarvest();
void sendData();
void processCommand(const String &cmd, int value);
void setFan(bool on);
void setDimmer(int brightness);
void setRelay(int ch, bool state);
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length);
String isoTimestamp();

// ============================================================================
// setup()
// ============================================================================
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(500);

  Serial.println("\n\n========================================");
  Serial.print(  "  Smart Home – Room Node  [");
  Serial.print(DEVICE_ROOM_LABEL);
  Serial.println("]");
  Serial.println("  Device ID: " DEVICE_ROOM_ID);
  Serial.println("========================================\n");

  Wire.begin(I2C_SDA, I2C_SCL);
  setupPins();
  setupSensor();
  setupWiFi();
  setupWebSocket();

  Serial.println("\nSystem ready – starting sensor loop.\n");
}

// ============================================================================
// loop()
// ============================================================================
void loop() {
  // ---- WiFi watchdog -------------------------------------------------------
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    if (millis() - lastReconn > WIFI_RECONNECT_INTERVAL) {
      Serial.println("[WiFi] Reconnecting...");
      setupWiFi();
      lastReconn = millis();
    }
  } else {
    wifiConnected = true;
  }

  // ---- WebSocket events ----------------------------------------------------
  webSocket.loop();

  // ---- Sensor read + transmit ----------------------------------------------
  if (millis() - lastRead >= SENSOR_READ_INTERVAL) {
    readSensors();
    if (daylightHarvestMode) {
      applyDaylightHarvest();
    }
    if (wifiConnected) {
      sendData();
    }
    lastRead = millis();
  }

  delay(10);
}

// ============================================================================
// WiFi
// ============================================================================
void setupWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.print("\n[WiFi] Connected. IP: ");
    Serial.print(WiFi.localIP());
    Serial.print("  RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    wifiConnected = false;
    Serial.println("\n[WiFi] Connection failed.");
  }
}

// ============================================================================
// GPIO / PWM initialisation
// ============================================================================
void setupPins() {
  Serial.println("[Init] Configuring GPIO...");

  // Light sensor – ADC input (input-only GPIO, no pinMode needed)
  pinMode(LIGHT_SENSOR_PIN, INPUT);

  // PWM dimmer
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(DIMMER_PWM_PIN, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 255);  // start at full brightness

  // Fan relay
  digitalWrite(FAN_RELAY_PIN, FAN_RELAY_ACTIVE_HIGH ? LOW : HIGH);  // fan off
  pinMode(FAN_RELAY_PIN, OUTPUT);

  // Status LED
  digitalWrite(STATUS_LED_PIN, LOW);
  pinMode(STATUS_LED_PIN, OUTPUT);

  Serial.println("[Init] GPIO configured.");
}

// ============================================================================
// BME280
// ============================================================================
void setupSensor() {
  Serial.println("[Init] Initialising BME280...");

  if (!bme.begin(BME280_ADDRESS)) {
    Serial.println("[ERROR] BME280 not found. Check wiring / I2C address (0x76 or 0x77).");
    sensorInitialized = false;
  } else {
    bme.setSampling(
      Adafruit_BME280::MODE_NORMAL,
      Adafruit_BME280::SAMPLING_X2,    // temperature
      Adafruit_BME280::SAMPLING_X16,   // humidity
      Adafruit_BME280::SAMPLING_X16,   // pressure
      Adafruit_BME280::FILTER_X16,
      Adafruit_BME280::STANDBY_MS_500
    );
    sensorInitialized = true;
    Serial.println("[Init] BME280 ready.");
  }
}

// ============================================================================
// WebSocket
// ============================================================================
void setupWebSocket() {
  Serial.print("[WS] Connecting to ws://");
  Serial.print(API_HOST);
  Serial.print(":");
  Serial.println(WS_PORT);

  webSocket.begin(API_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

// ============================================================================
// Sensor reads
// ============================================================================
void readSensors() {
  // ---- BME280 --------------------------------------------------------------
  if (sensorInitialized) {
    temperature = bme.readTemperature();
    humidity    = bme.readHumidity();
    pressure    = bme.readPressure() / 100.0F;
  }

  // ---- TEMT6000 (ambient light) -------------------------------------------
  long total = 0;
  for (int i = 0; i < LIGHT_SAMPLE_COUNT; i++) {
    total += analogRead(LIGHT_SENSOR_PIN);
    delay(5);
  }
  int avg  = total / LIGHT_SAMPLE_COUNT;
  lightLevel = (avg / 4095.0f) * 100.0f;
  lightLux   = (avg / 4095.0f) * LIGHT_MAX_LUX;

  // ---- Serial summary ------------------------------------------------------
  Serial.println("────────────────────────────────────");
  Serial.print("[" DEVICE_ROOM_LABEL "] Temp: ");
  Serial.print(temperature, 1); Serial.print(" °C  Hum: ");
  Serial.print(humidity, 1);    Serial.print(" %  Pres: ");
  Serial.print(pressure, 0);    Serial.println(" hPa");
  Serial.print("  Light: ");
  Serial.print(lightLevel, 1);  Serial.print(" % (");
  Serial.print(lightLux, 0);    Serial.print(" lux)  Dimmer: ");
  Serial.print(dimmerBrightness); Serial.print("%  Fan: ");
  Serial.println(fanOn ? "ON" : "OFF");
  Serial.println("────────────────────────────────────");
}

// ============================================================================
// Daylight harvesting
// ============================================================================
void applyDaylightHarvest() {
  int target = map(
    constrain((int)lightLux, 0, (int)TARGET_LUX),
    0, (int)TARGET_LUX,
    DIMMER_MAX_PERCENT, DIMMER_MIN_PERCENT
  );
  setDimmer(target);
}

// ============================================================================
// Send sensor data via WebSocket
// ============================================================================
void sendData() {
  StaticJsonDocument<512> doc;
  doc["device_id"]            = DEVICE_ROOM_ID;
  doc["room"]                 = DEVICE_ROOM_LABEL;
  doc["timestamp"]            = isoTimestamp();
  doc["temperature"]          = temperature;
  doc["humidity"]             = humidity;
  doc["pressure"]             = pressure;
  doc["light_level"]          = lightLevel;
  doc["light_lux"]            = lightLux;
  doc["dimmer_brightness"]    = dimmerBrightness;
  doc["daylight_harvest_mode"] = daylightHarvestMode;
  doc["fan_on"]               = fanOn;

  JsonArray relays = doc.createNestedArray("relays");
  relays.add(relay1);
  relays.add(relay2);
  relays.add(relay3);
  relays.add(relay4);

  String payload;
  serializeJson(doc, payload);
  webSocket.sendTXT(payload);
}

// ============================================================================
// Command processing
// ============================================================================
void processCommand(const String &cmd, int value) {
  Serial.print("[CMD] ");
  Serial.print(cmd);
  Serial.print(" = ");
  Serial.println(value);

  if (cmd == "dimmer") {
    daylightHarvestMode = false;
    setDimmer(value);
  } else if (cmd == "fan") {
    setFan(value > 0);
  } else if (cmd == "relay1") {
    setRelay(1, value > 0);
  } else if (cmd == "relay2") {
    setRelay(2, value > 0);
  } else if (cmd == "relay3") {
    setRelay(3, value > 0);
  } else if (cmd == "relay4") {
    setRelay(4, value > 0);
  } else if (cmd == "daylight_harvest") {
    daylightHarvestMode = (value > 0);
    Serial.print("[CMD] Daylight harvest ");
    Serial.println(daylightHarvestMode ? "ENABLED" : "DISABLED");
  } else {
    Serial.println("[CMD] Unknown command – ignoring.");
  }
}

// ============================================================================
// Actuators
// ============================================================================
void setFan(bool on) {
  fanOn = on;
  digitalWrite(FAN_RELAY_PIN, (FAN_RELAY_ACTIVE_HIGH == on) ? HIGH : LOW);
  Serial.print("[FAN] ");
  Serial.println(on ? "ON" : "OFF");
}

void setDimmer(int brightness) {
  brightness = constrain(brightness, 0, 100);
  if (brightness == dimmerBrightness) return;
  dimmerBrightness = brightness;
  int duty = map(brightness, 0, 100, 0, 255);
  ledcWrite(PWM_CHANNEL, duty);
  Serial.print("[DIMMER] → ");
  Serial.print(brightness);
  Serial.println("%");
}

void setRelay(int ch, bool state) {
  switch (ch) {
    case 1: relay1 = state; break;
    case 2: relay2 = state; break;
    case 3: relay3 = state; break;
    case 4: relay4 = state; break;
    default: Serial.println("[RELAY] Invalid channel"); return;
  }
  // Relay 1–4 spare outputs – wire to whatever loads you need
  // (pin mapping can be added to config.h if required)
  Serial.print("[RELAY] ch"); Serial.print(ch);
  Serial.println(state ? " ON" : " OFF");
}

// ============================================================================
// WebSocket event handler
// ============================================================================
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected.");
      break;

    case WStype_CONNECTED:
      Serial.printf("[WS] Connected: %s\n", payload);
      // Announce device ID on connect
      {
        StaticJsonDocument<128> hello;
        hello["device_id"] = DEVICE_ROOM_ID;
        hello["room"]      = DEVICE_ROOM_LABEL;
        String s;
        serializeJson(hello, s);
        webSocket.sendTXT(s);
      }
      break;

    case WStype_TEXT: {
      Serial.printf("[WS] Received: %s\n", payload);
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, payload);
      if (!err) {
        String cmd = doc["command"] | "";
        int    val = doc["value"]   | 0;
        if (cmd.length() > 0) {
          processCommand(cmd, val);
        }
      } else {
        Serial.println("[WS] JSON parse error.");
      }
      break;
    }

    case WStype_ERROR:
      Serial.println("[WS] Error.");
      break;

    default:
      break;
  }
}

// ============================================================================
// Helpers
// ============================================================================
String isoTimestamp() {
  // TODO: add NTP sync via configTime() for accurate wall-clock timestamps.
  // Uptime-based stub is used until NTP is configured.
  unsigned long ms = millis();
  unsigned long s  = ms / 1000;
  unsigned long m  = s  / 60;
  unsigned long h  = m  / 60;
  char buf[32];
  snprintf(buf, sizeof(buf), "T+%02luh%02lum%02lus", h, m % 60, s % 60);
  return String(buf);
}
