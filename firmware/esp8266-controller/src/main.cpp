#include <Arduino.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>

#include "protocol.h"

namespace {

constexpr uint32_t kPresenceSampleIntervalMs = 300;
constexpr uint32_t kWifiReconnectIntervalMs = 5000;
constexpr uint8_t kIndicatorPin = LED_BUILTIN;
constexpr uint8_t kUltrasonicTriggerPin = D5;
constexpr uint8_t kUltrasonicEchoPin = D6;
constexpr uint32_t kUltrasonicPulseTimeoutUs = 30000;
constexpr uint16_t kPresenceDistanceThresholdCm = 75;
constexpr uint8_t kPresenceStableSampleCount = 2;

#ifdef BINBUDDY_WIFI_SSID
constexpr char kWifiSsid[] = BINBUDDY_WIFI_SSID;
#else
constexpr char kWifiSsid[] = "Golden's iPhone";
#endif

#ifdef BINBUDDY_WIFI_PASS
constexpr char kWifiPass[] = BINBUDDY_WIFI_PASS;
#else
constexpr char kWifiPass[] = "";
#endif

binbuddy::IndicatorZone activeZone = binbuddy::IndicatorZone::Off;
ESP8266WebServer server(80);
uint32_t lastPresenceSampleMs = 0;
uint32_t lastWifiReconnectAttemptMs = 0;
uint32_t presenceSequence = 0;
bool sensorOnline = true;
bool rawPresenceDetected = false;
bool stablePresenceDetected = false;
uint8_t consecutivePresenceSamples = 0;
uint8_t consecutiveAbsenceSamples = 0;

long readUltrasonicDistanceCm() {
  digitalWrite(kUltrasonicTriggerPin, LOW);
  delayMicroseconds(2);
  digitalWrite(kUltrasonicTriggerPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(kUltrasonicTriggerPin, LOW);

  const unsigned long echoDurationUs =
      pulseIn(kUltrasonicEchoPin, HIGH, kUltrasonicPulseTimeoutUs);
  if (echoDurationUs == 0) {
    sensorOnline = false;
    return -1;
  }

  sensorOnline = true;
  return static_cast<long>(echoDurationUs / 58UL);
}

void samplePresenceSensor() {
  const long distanceCm = readUltrasonicDistanceCm();
  if (distanceCm < 0) {
    rawPresenceDetected = false;
    stablePresenceDetected = false;
    consecutivePresenceSamples = 0;
    consecutiveAbsenceSamples = 0;
    ++presenceSequence;
    return;
  }

  rawPresenceDetected = distanceCm > 0 && distanceCm <= kPresenceDistanceThresholdCm;
  if (rawPresenceDetected) {
    consecutivePresenceSamples = min<uint8_t>(
        static_cast<uint8_t>(consecutivePresenceSamples + 1),
        kPresenceStableSampleCount);
    consecutiveAbsenceSamples = 0;
    if (consecutivePresenceSamples >= kPresenceStableSampleCount) {
      stablePresenceDetected = true;
    }
    ++presenceSequence;
    return;
  }

  consecutiveAbsenceSamples = min<uint8_t>(
      static_cast<uint8_t>(consecutiveAbsenceSamples + 1),
      kPresenceStableSampleCount);
  consecutivePresenceSamples = 0;
  if (consecutiveAbsenceSamples >= kPresenceStableSampleCount) {
    stablePresenceDetected = false;
  }
  ++presenceSequence;
}

void applyIndicator(const binbuddy::IndicatorZone zone) {
  activeZone = zone;

  const bool ledEnabled = zone != binbuddy::IndicatorZone::Off;
  digitalWrite(kIndicatorPin, ledEnabled ? LOW : HIGH);
}

String boolJson(const bool value) {
  return value ? "true" : "false";
}

String healthPayloadJson() {
  const bool handPresent = rawPresenceDetected;
  const binbuddy::IndicatorZone handZone =
      handPresent ? activeZone : binbuddy::IndicatorZone::Off;

  String payload = "{";
  payload += "\"transport\":\"http\",";
  payload += "\"sensorOnline\":" + boolJson(sensorOnline) + ",";
  payload += "\"indicatorOnline\":true,";
  payload += "\"uptimeMs\":" + String(millis()) + ",";
  payload += "\"activeZone\":\"" + String(binbuddy::indicatorZoneName(activeZone)) + "\",";
  payload += "\"presence\":{";
  payload += "\"handPresent\":" + boolJson(handPresent) + ",";
  payload += "\"handZone\":\"" + String(binbuddy::indicatorZoneName(handZone)) + "\",";
  payload += "\"stable\":" + boolJson(handPresent && stablePresenceDetected) + ",";
  payload += "\"sequence\":" + String(presenceSequence);
  payload += "},";
  payload += "\"failurePolicy\":{";
  payload += "\"guidanceCommand\":\"best-effort\",";
  payload += "\"healthPolling\":\"authoritative\",";
  payload += "\"sessionImpact\":\"degraded-device-health-only\"";
  payload += "}";
  payload += "}";
  return payload;
}

bool extractJsonStringField(const String& body, const char* fieldName, String* outValue) {
  if (outValue == nullptr) {
    return false;
  }

  const String key = "\"" + String(fieldName) + "\"";
  const int keyIndex = body.indexOf(key);
  if (keyIndex < 0) {
    return false;
  }

  const int colonIndex = body.indexOf(':', keyIndex + key.length());
  if (colonIndex < 0) {
    return false;
  }

  const int firstQuoteIndex = body.indexOf('"', colonIndex + 1);
  if (firstQuoteIndex < 0) {
    return false;
  }

  const int secondQuoteIndex = body.indexOf('"', firstQuoteIndex + 1);
  if (secondQuoteIndex < 0) {
    return false;
  }

  *outValue = body.substring(firstQuoteIndex + 1, secondQuoteIndex);
  return true;
}

bool extractJsonIntField(const String& body, const char* fieldName, int* outValue) {
  if (outValue == nullptr) {
    return false;
  }

  const String key = "\"" + String(fieldName) + "\"";
  const int keyIndex = body.indexOf(key);
  if (keyIndex < 0) {
    return false;
  }

  const int colonIndex = body.indexOf(':', keyIndex + key.length());
  if (colonIndex < 0) {
    return false;
  }

  size_t valueStart = static_cast<size_t>(colonIndex + 1);
  while (valueStart < body.length() && isspace(body[valueStart])) {
    ++valueStart;
  }

  size_t valueEnd = valueStart;
  while (valueEnd < body.length() && isdigit(body[valueEnd])) {
    ++valueEnd;
  }

  if (valueStart == valueEnd) {
    return false;
  }

  *outValue = body.substring(static_cast<unsigned int>(valueStart),
                             static_cast<unsigned int>(valueEnd))
                  .toInt();
  return true;
}

bool resolveSignalZone(const String& body, binbuddy::IndicatorZone* outZone) {
  if (outZone == nullptr) {
    return false;
  }

  String zoneToken;
  if (extractJsonStringField(body, "indicatorZone", &zoneToken) ||
      extractJsonStringField(body, "zone", &zoneToken)) {
    return binbuddy::parseIndicatorZone(zoneToken, outZone);
  }

  int step = 0;
  if (!extractJsonIntField(body, "step", &step)) {
    return false;
  }

  switch (step) {
    case 1:
      *outZone = binbuddy::IndicatorZone::Left;
      return true;
    case 2:
      *outZone = binbuddy::IndicatorZone::Middle;
      return true;
    case 3:
      *outZone = binbuddy::IndicatorZone::Right;
      return true;
    default:
      return false;
  }
}

String acknowledgementJson(const char* command, const char* value = nullptr) {
  String payload = "{\"ack\":{\"command\":\"" + String(command) + "\"";
  if (value != nullptr) {
    payload += ",\"value\":\"" + String(value) + "\"";
  }
  payload += "}}";
  return payload;
}

void resetControllerState() {
  applyIndicator(binbuddy::IndicatorZone::Off);
}

void handleHealth() {
  samplePresenceSensor();
  server.send(200, "application/json", healthPayloadJson());
}

void handleSignal() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json",
                "{\"error\":\"signal body is required\"}");
    return;
  }

  const String body = server.arg("plain");
  binbuddy::IndicatorZone nextZone = binbuddy::IndicatorZone::Off;
  if (!resolveSignalZone(body, &nextZone)) {
    server.send(400, "application/json",
                "{\"error\":\"unsupported signal payload\"}");
    return;
  }

  applyIndicator(nextZone);
  server.send(200, "application/json",
              acknowledgementJson("indicator", binbuddy::indicatorZoneName(nextZone)));
}

void handleReset() {
  resetControllerState();
  server.send(200, "application/json", acknowledgementJson("reset"));
}

void handleNotFound() {
  server.send(404, "application/json", "{\"error\":\"not found\"}");
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  const uint32_t now = millis();
  if (now - lastWifiReconnectAttemptMs < kWifiReconnectIntervalMs) {
    return;
  }

  lastWifiReconnectAttemptMs = now;
  WiFi.disconnect();
  WiFi.begin(kWifiSsid, kWifiPass);
  Serial.println("binbuddy wifi reconnect attempt");
}

void configureHttpServer() {
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/signal", HTTP_POST, handleSignal);
  server.on("/reset", HTTP_POST, handleReset);
  server.onNotFound(handleNotFound);
  server.begin();
}

void maybeSamplePresence() {
  const uint32_t now = millis();
  if (now - lastPresenceSampleMs < kPresenceSampleIntervalMs) {
    return;
  }

  lastPresenceSampleMs = now;
  samplePresenceSensor();
}

}  // namespace

void setup() {
  pinMode(kIndicatorPin, OUTPUT);
  digitalWrite(kIndicatorPin, HIGH);
  pinMode(kUltrasonicTriggerPin, OUTPUT);
  digitalWrite(kUltrasonicTriggerPin, LOW);
  pinMode(kUltrasonicEchoPin, INPUT);

  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(kWifiSsid, kWifiPass);
  configureHttpServer();
  samplePresenceSensor();
  lastPresenceSampleMs = millis();
  lastWifiReconnectAttemptMs = millis();
  Serial.println("binbuddy firmware boot http-server-ready");
}

void loop() {
  ensureWifiConnected();
  maybeSamplePresence();
  server.handleClient();
  delay(10);
}
