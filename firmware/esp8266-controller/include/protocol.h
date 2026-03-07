#ifndef BINBUDDY_PROTOCOL_H
#define BINBUDDY_PROTOCOL_H

#include <Arduino.h>
#include <stdint.h>

namespace binbuddy {

enum class IndicatorZone : uint8_t {
  Off = 0,
  Left = 1,
  Middle = 2,
  Right = 3,
};

enum class ControllerCommandType : uint8_t {
  None = 0,
  SetIndicator = 1,
  RequestHealth = 2,
};

struct ControllerCommand {
  ControllerCommandType type = ControllerCommandType::None;
  IndicatorZone zone = IndicatorZone::Off;
  bool acknowledge = false;
};

struct HealthTelemetry {
  bool sensorOnline = true;
  bool indicatorOnline = true;
  uint32_t uptimeMs = 0;
  IndicatorZone activeZone = IndicatorZone::Off;
};

struct PresenceTelemetry {
  bool handPresent = false;
  IndicatorZone handZone = IndicatorZone::Off;
  bool stable = false;
  uint32_t sequence = 0;
};

const char* indicatorZoneName(IndicatorZone zone);
String encodeHealthTelemetry(const HealthTelemetry& telemetry);
String encodePresenceTelemetry(const PresenceTelemetry& telemetry);
String encodeIndicatorAcknowledgement(IndicatorZone zone);
bool decodeControllerCommand(const String& frame, ControllerCommand* outCommand);

}  // namespace binbuddy

#endif
