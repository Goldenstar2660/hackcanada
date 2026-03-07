#include <Arduino.h>

#include "protocol.h"

namespace {

constexpr uint32_t kHealthPublishIntervalMs = 5000;
constexpr uint32_t kPresencePublishIntervalMs = 300;
constexpr uint8_t kIndicatorPin = LED_BUILTIN;
constexpr uint8_t kUltrasonicTriggerPin = D5;
constexpr uint8_t kUltrasonicEchoPin = D6;
constexpr uint32_t kUltrasonicPulseTimeoutUs = 30000;
constexpr uint16_t kPresenceDistanceThresholdCm = 75;
constexpr uint8_t kPresenceStableSampleCount = 2;

binbuddy::IndicatorZone activeZone = binbuddy::IndicatorZone::Off;
String inboundFrame;
uint32_t lastHealthPublishMs = 0;
uint32_t lastPresencePublishMs = 0;
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
    return;
  }

  consecutiveAbsenceSamples = min<uint8_t>(
      static_cast<uint8_t>(consecutiveAbsenceSamples + 1),
      kPresenceStableSampleCount);
  consecutivePresenceSamples = 0;
  if (consecutiveAbsenceSamples >= kPresenceStableSampleCount) {
    stablePresenceDetected = false;
  }
}

void applyIndicator(const binbuddy::IndicatorZone zone) {
  activeZone = zone;

  const bool ledEnabled = zone != binbuddy::IndicatorZone::Off;
  digitalWrite(kIndicatorPin, ledEnabled ? LOW : HIGH);
}

void publishHealthTelemetry() {
  const binbuddy::HealthTelemetry telemetry{
      sensorOnline,
      true,
      millis(),
      activeZone,
  };

  Serial.println(binbuddy::encodeHealthTelemetry(telemetry));
}

void publishPresenceTelemetry() {
  samplePresenceSensor();
  const bool handPresent = rawPresenceDetected;
  const binbuddy::PresenceTelemetry telemetry{
      handPresent,
      handPresent ? activeZone : binbuddy::IndicatorZone::Off,
      handPresent && stablePresenceDetected,
      presenceSequence++,
  };

  Serial.println(binbuddy::encodePresenceTelemetry(telemetry));
}

void handleCommand(const binbuddy::ControllerCommand& command) {
  switch (command.type) {
    case binbuddy::ControllerCommandType::SetIndicator:
      applyIndicator(command.zone);
      if (command.acknowledge) {
        Serial.println(binbuddy::encodeIndicatorAcknowledgement(command.zone));
      }
      break;
    case binbuddy::ControllerCommandType::RequestHealth:
      publishHealthTelemetry();
      break;
    case binbuddy::ControllerCommandType::None:
    default:
      break;
  }
}

void pollSerialProtocol() {
  while (Serial.available() > 0) {
    const char nextByte = static_cast<char>(Serial.read());

    if (nextByte == '\n' || nextByte == '\r') {
      if (inboundFrame.length() == 0) {
        continue;
      }

      binbuddy::ControllerCommand command;
      if (binbuddy::decodeControllerCommand(inboundFrame, &command)) {
        handleCommand(command);
      } else {
        Serial.print("nack ");
        Serial.println(inboundFrame);
      }

      inboundFrame = "";
      continue;
    }

    inboundFrame += nextByte;
  }
}

}  // namespace

void setup() {
  pinMode(kIndicatorPin, OUTPUT);
  digitalWrite(kIndicatorPin, HIGH);
  pinMode(kUltrasonicTriggerPin, OUTPUT);
  digitalWrite(kUltrasonicTriggerPin, LOW);
  pinMode(kUltrasonicEchoPin, INPUT);

  Serial.begin(115200);
  Serial.println("binbuddy firmware boot");
  publishHealthTelemetry();
  publishPresenceTelemetry();
  lastHealthPublishMs = millis();
  lastPresencePublishMs = millis();
}

void loop() {
  pollSerialProtocol();

  const uint32_t now = millis();
  if (now - lastHealthPublishMs >= kHealthPublishIntervalMs) {
    lastHealthPublishMs = now;
    publishHealthTelemetry();
  }
  if (now - lastPresencePublishMs >= kPresencePublishIntervalMs) {
    lastPresencePublishMs = now;
    publishPresenceTelemetry();
  }

  delay(10);
}
