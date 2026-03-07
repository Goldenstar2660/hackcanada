#include <Arduino.h>

#include "protocol.h"

namespace {

constexpr uint32_t kHealthPublishIntervalMs = 5000;
constexpr uint8_t kIndicatorPin = LED_BUILTIN;

binbuddy::IndicatorZone activeZone = binbuddy::IndicatorZone::Off;
String inboundFrame;
uint32_t lastHealthPublishMs = 0;

void applyIndicator(const binbuddy::IndicatorZone zone) {
  activeZone = zone;

  const bool ledEnabled = zone != binbuddy::IndicatorZone::Off;
  digitalWrite(kIndicatorPin, ledEnabled ? LOW : HIGH);
}

void publishHealthTelemetry() {
  const binbuddy::HealthTelemetry telemetry{
      true,
      true,
      millis(),
      activeZone,
  };

  Serial.println(binbuddy::encodeHealthTelemetry(telemetry));
}

void handleCommand(const binbuddy::ControllerCommand& command) {
  switch (command.type) {
    case binbuddy::ControllerCommandType::SetIndicator:
      applyIndicator(command.zone);
      if (command.acknowledge) {
        Serial.print("ack indicator:");
        Serial.println(binbuddy::indicatorZoneName(command.zone));
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

  Serial.begin(115200);
  Serial.println("binbuddy firmware boot");
  publishHealthTelemetry();
  lastHealthPublishMs = millis();
}

void loop() {
  pollSerialProtocol();

  const uint32_t now = millis();
  if (now - lastHealthPublishMs >= kHealthPublishIntervalMs) {
    lastHealthPublishMs = now;
    publishHealthTelemetry();
  }

  delay(10);
}
