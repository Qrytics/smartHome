/*
 * Smart Home - Door Control System
 * ESP32 #1: RFID Access Control with Electromagnetic Lock
 * 
 * This firmware handles:
 * - RFID card reading (RC522 module)
 * - Access authorization via backend API
 * - Solenoid lock actuation
 * - WiFi connectivity with TLS
 * - Offline failsafe behavior
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include "config.h"
#include "secrets.h"

// RFID Reader
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

// WiFi and HTTP clients
WiFiClientSecure wifiClient;
HTTPClient http;

// State variables
bool wifiConnected = false;
unsigned long lastConnectionAttempt = 0;
unsigned long lastCardRead = 0;
String lastCardUID = "";

// Function declarations
void setupWiFi();
void setupRFID();
void setupLock();
bool readRFIDCard(String &uid);
bool checkAccessAuthorization(const String &cardUID);
void actuateLock(bool unlock);
void blinkLED(int times, int delayMs);
String getISOTimestamp();

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("Smart Home - Door Control System");
  Serial.println("=================================\n");

  // Initialize components
  setupLock();
  setupWiFi();
  setupRFID();

  Serial.println("\nSystem Ready!");
  Serial.println("Waiting for RFID cards...\n");
}

void loop() {
  // Check WiFi connection status
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

  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent()) {
    delay(50);
    return;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Read card UID
  String cardUID;
  if (readRFIDCard(cardUID)) {
    // Debounce - ignore same card within 3 seconds
    if (cardUID == lastCardUID && (millis() - lastCardRead) < 3000) {
      Serial.println("Same card read too quickly, ignoring...");
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      return;
    }

    lastCardUID = cardUID;
    lastCardRead = millis();

    Serial.print("\nCard detected: ");
    Serial.println(cardUID);

    // Check authorization
    if (wifiConnected) {
      unsigned long startTime = millis();
      bool authorized = checkAccessAuthorization(cardUID);
      unsigned long latency = millis() - startTime;

      Serial.print("Authorization: ");
      Serial.print(authorized ? "GRANTED" : "DENIED");
      Serial.print(" (latency: ");
      Serial.print(latency);
      Serial.println("ms)");

      if (authorized) {
        // Unlock door
        actuateLock(true);
        delay(LOCK_OPEN_DURATION);
        actuateLock(false);
      } else {
        // Blink error LED
        blinkLED(3, 200);
      }
    } else {
      Serial.println("ERROR: No WiFi connection - cannot authorize");
      blinkLED(5, 100);  // Fast blinks = error
    }
  }

  // Halt PICC and stop encryption
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
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

    // Configure TLS (if enabled)
    #ifdef USE_TLS
    // TODO: Load CA certificate for TLS verification
    wifiClient.setInsecure();  // For development only!
    #endif
  } else {
    Serial.println("\nWiFi connection failed!");
    wifiConnected = false;
  }
}

void setupRFID() {
  Serial.println("Initializing RFID reader...");
  SPI.begin();
  rfid.PCD_Init();
  
  // Show RFID reader details
  rfid.PCD_DumpVersionToSerial();
  Serial.println("RFID reader initialized.");
}

void setupLock() {
  Serial.println("Initializing lock control...");
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Ensure lock starts in locked position
  actuateLock(false);
  Serial.println("Lock initialized (LOCKED).");
}

bool readRFIDCard(String &uid) {
  uid = "";
  
  // Build UID string
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i > 0) uid += ":";
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  
  uid.toUpperCase();
  return uid.length() > 0;
}

bool checkAccessAuthorization(const String &cardUID) {
  // Build API endpoint URL
  String url = String("http://") + API_HOST + ":" + String(API_PORT) + "/api/access/check";
  
  // Prepare JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["card_uid"] = cardUID;
  doc["timestamp"] = getISOTimestamp();
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Make HTTP POST request
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT);

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      
      // Parse JSON response
      StaticJsonDocument<512> response;
      DeserializationError error = deserializeJson(response, payload);
      
      if (!error) {
        bool granted = response["granted"];
        http.end();
        return granted;
      } else {
        Serial.print("JSON parse error: ");
        Serial.println(error.c_str());
      }
    } else {
      Serial.print("HTTP error code: ");
      Serial.println(httpCode);
    }
  } else {
    Serial.print("HTTP request failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return false;  // Fail-secure: deny access on error
}

void actuateLock(bool unlock) {
  if (unlock) {
    Serial.println(">>> UNLOCKING DOOR <<<");
    digitalWrite(RELAY_PIN, HIGH);  // Energize solenoid
    digitalWrite(LED_PIN, HIGH);    // Turn on LED
  } else {
    Serial.println(">>> LOCKING DOOR <<<");
    digitalWrite(RELAY_PIN, LOW);   // De-energize solenoid
    digitalWrite(LED_PIN, LOW);     // Turn off LED
  }
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

String getISOTimestamp() {
  // TODO: Implement NTP time sync for accurate timestamps
  // For now, return a placeholder
  return "2026-02-09T19:59:04.032Z";
}
