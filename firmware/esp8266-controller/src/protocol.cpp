#include "protocol.h"

namespace binbuddy {

namespace {

constexpr char kIndicatorPrefix[] = "indicator:";

}  // namespace

const char* indicatorZoneName(const IndicatorZone zone) {
  switch (zone) {
    case IndicatorZone::Left:
      return "left";
    case IndicatorZone::Middle:
      return "middle";
    case IndicatorZone::Right:
      return "right";
    case IndicatorZone::Off:
    default:
      return "off";
  }
}

String encodeHealthTelemetry(const HealthTelemetry& telemetry) {
  String payload = "health uptime_ms=";
  payload += String(telemetry.uptimeMs);
  payload += " sensor=";
  payload += telemetry.sensorOnline ? "1" : "0";
  payload += " indicator=";
  payload += telemetry.indicatorOnline ? "1" : "0";
  payload += " active_zone=";
  payload += indicatorZoneName(telemetry.activeZone);
  return payload;
}

bool decodeControllerCommand(const String& frame, ControllerCommand* outCommand) {
  if (outCommand == nullptr) {
    return false;
  }

  *outCommand = ControllerCommand{};
  String trimmedFrame = frame;
  trimmedFrame.trim();

  if (trimmedFrame == "health?") {
    outCommand->type = ControllerCommandType::RequestHealth;
    return true;
  }

  if (!trimmedFrame.startsWith(kIndicatorPrefix)) {
    return false;
  }

  const String zoneToken = trimmedFrame.substring(sizeof(kIndicatorPrefix) - 1);
  outCommand->type = ControllerCommandType::SetIndicator;
  outCommand->acknowledge = true;

  if (zoneToken == "left") {
    outCommand->zone = IndicatorZone::Left;
    return true;
  }

  if (zoneToken == "middle") {
    outCommand->zone = IndicatorZone::Middle;
    return true;
  }

  if (zoneToken == "right") {
    outCommand->zone = IndicatorZone::Right;
    return true;
  }

  if (zoneToken == "off") {
    outCommand->zone = IndicatorZone::Off;
    return true;
  }

  return false;
}

}  // namespace binbuddy
