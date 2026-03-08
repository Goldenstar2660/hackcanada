#include <Arduino.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>

#include "protocol.h"

namespace {

constexpr uint32_t kWifiReconnectIntervalMs = 5000;
constexpr uint8_t kRedIndicatorPin = D5;
constexpr uint8_t kGreenIndicatorPin = D6;
constexpr uint8_t kBlueIndicatorPin = D7;
constexpr char kWifiHostname[] = "handwashled";
constexpr bool kPresenceSensorOnline = false;
constexpr bool kHandPresent = false;
constexpr bool kStablePresenceDetected = false;
constexpr uint32_t kPresenceSequence = 0;

#ifdef BINSIGHT_WIFI_SSID
constexpr char kWifiSsid[] = BINSIGHT_WIFI_SSID;
#else
constexpr char kWifiSsid[] = "Golden’s iPhone";
#endif

#ifdef BINSIGHT_WIFI_PASS
constexpr char kWifiPass[] = BINSIGHT_WIFI_PASS;
#else
constexpr char kWifiPass[] = "winners!";
#endif

binsight::IndicatorZone activeZone = binsight::IndicatorZone::Off;
ESP8266WebServer server(80);
uint32_t lastWifiReconnectAttemptMs = 0;
bool wifiConnectionLogged = false;

void applyIndicator(const binsight::IndicatorZone zone) {
  activeZone = zone;

  digitalWrite(kRedIndicatorPin, zone == binsight::IndicatorZone::Left ? HIGH : LOW);
  digitalWrite(kGreenIndicatorPin,
               zone == binsight::IndicatorZone::Middle ? HIGH : LOW);
  digitalWrite(kBlueIndicatorPin, zone == binsight::IndicatorZone::Right ? HIGH : LOW);
}

String boolJson(const bool value) {
  return value ? "true" : "false";
}

String healthPayloadJson() {
  const binsight::IndicatorZone handZone = binsight::IndicatorZone::Off;

  String payload = "{";
  payload += "\"transport\":\"http\",";
  payload += "\"sensorOnline\":" + boolJson(kPresenceSensorOnline) + ",";
  payload += "\"indicatorOnline\":true,";
  payload += "\"uptimeMs\":" + String(millis()) + ",";
  payload += "\"activeZone\":\"" + String(binsight::indicatorZoneName(activeZone)) + "\",";
  payload += "\"presence\":{";
  payload += "\"handPresent\":" + boolJson(kHandPresent) + ",";
  payload += "\"handZone\":\"" + String(binsight::indicatorZoneName(handZone)) + "\",";
  payload += "\"stable\":" + boolJson(kStablePresenceDetected) + ",";
  payload += "\"sequence\":" + String(kPresenceSequence);
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

bool resolveSignalZone(const String& body, binsight::IndicatorZone* outZone) {
  if (outZone == nullptr) {
    return false;
  }

  String zoneToken;
  if (extractJsonStringField(body, "indicatorZone", &zoneToken) ||
      extractJsonStringField(body, "zone", &zoneToken)) {
    return binsight::parseIndicatorZone(zoneToken, outZone);
  }

  int step = 0;
  if (!extractJsonIntField(body, "step", &step)) {
    return false;
  }

  switch (step) {
    case 1:
      *outZone = binsight::IndicatorZone::Left;
      return true;
    case 2:
      *outZone = binsight::IndicatorZone::Middle;
      return true;
    case 3:
      *outZone = binsight::IndicatorZone::Right;
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
  applyIndicator(binsight::IndicatorZone::Off);
}

void handleHealth() {
  server.send(200, "application/json", healthPayloadJson());
}

void handleSignal() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json",
                "{\"error\":\"signal body is required\"}");
    return;
  }

  const String body = server.arg("plain");
  binsight::IndicatorZone nextZone = binsight::IndicatorZone::Off;
  if (!resolveSignalZone(body, &nextZone)) {
    server.send(400, "application/json",
                "{\"error\":\"unsupported signal payload\"}");
    return;
  }

  applyIndicator(nextZone);
  server.send(200, "application/json",
              acknowledgementJson("indicator", binsight::indicatorZoneName(nextZone)));
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
  WiFi.hostname(kWifiHostname);
  WiFi.begin(kWifiSsid, kWifiPass);
  Serial.println("binsight wifi reconnect attempt");
}

void logWifiConnectionIfNeeded() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnectionLogged = false;
    return;
  }

  if (wifiConnectionLogged) {
    return;
  }

  wifiConnectionLogged = true;
  Serial.print("binsight wifi connected ip=");
  Serial.println(WiFi.localIP());
}

void configureHttpServer() {
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/signal", HTTP_POST, handleSignal);
  server.on("/reset", HTTP_POST, handleReset);
  server.onNotFound(handleNotFound);
  server.begin();
}

}  // namespace

void setup() {
  pinMode(kRedIndicatorPin, OUTPUT);
  pinMode(kGreenIndicatorPin, OUTPUT);
  pinMode(kBlueIndicatorPin, OUTPUT);
  applyIndicator(binsight::IndicatorZone::Off);

  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.hostname(kWifiHostname);
  WiFi.begin(kWifiSsid, kWifiPass);
  configureHttpServer();
  lastWifiReconnectAttemptMs = millis();
  Serial.println("binsight firmware boot http-server-ready");
}

void loop() {
  ensureWifiConnected();
  logWifiConnectionIfNeeded();
  server.handleClient();
  delay(10);
}
