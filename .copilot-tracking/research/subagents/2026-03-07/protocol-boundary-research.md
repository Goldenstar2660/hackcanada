# Protocol Boundary Research

## Status

Complete.

## Scope

- Device boundary between the Raspberry Pi station runtime and the ESP8266 controller for Binsight.
- Source of truth: [spec/binsight-spec.md#L20-L45](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L20), [spec/binsight-spec.md#L134-L144](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L134)
- Firmware seam: [firmware/esp8266-controller/include/protocol.h#L9-L37](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L9), [firmware/esp8266-controller/src/protocol.cpp#L7-L79](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L7), [firmware/esp8266-controller/src/main.cpp#L7-L97](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L7)
- Pi runtime seam: [devices/pi-station/src/binsight_station/esp_client.py#L6-L20](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/esp_client.py#L6), [devices/pi-station/src/binsight_station/main.py#L39-L82](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py#L39), [devices/pi-station/src/binsight_station/session.py#L15-L72](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/session.py#L15)
- Boundary docs: [devices/pi-station/README.md#L8-L17](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L8), [devices/pi-station/README.md#L57-L59](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L57), [devices/README.md#L8-L16](/home/handwash/Projects/hackcanada/devices/README.md#L8), [firmware/esp8266-controller/README.md#L8-L24](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md#L8), [firmware/README.md#L8-L16](/home/handwash/Projects/hackcanada/firmware/README.md#L8)

## Findings

### 1. Existing Pi ↔ ESP8266 Commands And Messages

Verified inbound commands handled by the firmware:

- `health?` decodes to `RequestHealth`. Evidence: [firmware/esp8266-controller/include/protocol.h#L16-L25](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L16), [firmware/esp8266-controller/src/protocol.cpp#L37-L49](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L37)
- `indicator:left`, `indicator:middle`, `indicator:right`, and `indicator:off` decode to `SetIndicator`. Evidence: [firmware/esp8266-controller/include/protocol.h#L16-L25](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L16), [firmware/esp8266-controller/src/protocol.cpp#L7-L8](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L7), [firmware/esp8266-controller/src/protocol.cpp#L51-L77](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L51)

Verified outbound messages emitted by the firmware:

- Health telemetry text is encoded as `health uptime_ms=<value> sensor=<0|1> indicator=<0|1> active_zone=<zone>`. Evidence: [firmware/esp8266-controller/include/protocol.h#L28-L37](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L28), [firmware/esp8266-controller/src/protocol.cpp#L25-L34](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L25), [firmware/esp8266-controller/src/main.cpp#L21-L30](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L21)
- A successful indicator command emits `ack indicator:<zone>`. Evidence: [firmware/esp8266-controller/src/main.cpp#L32-L40](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L32)
- An invalid frame emits `nack <frame>`. Evidence: [firmware/esp8266-controller/src/main.cpp#L50-L65](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L50)
- Boot emits `binsight firmware boot`. Evidence: [firmware/esp8266-controller/src/main.cpp#L77-L84](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L77)

Verified transport and framing in the current implementation:

- The current implementation is newline-delimited text over `Serial` at `115200`, not a Wi-Fi transport. Evidence: [spec/binsight-spec.md#L136-L139](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L136), [firmware/esp8266-controller/src/main.cpp#L50-L71](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L50), [firmware/esp8266-controller/src/main.cpp#L81-L83](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L81)
- The Pi runtime scaffold does not yet speak this protocol. The ESP client only stores the last guidance command in memory, while the Pi runtime default endpoint is `udp://127.0.0.1:4210`. Evidence: [devices/pi-station/src/binsight_station/esp_client.py#L12-L20](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/esp_client.py#L12), [devices/pi-station/src/binsight_station/main.py#L26-L35](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py#L26), [devices/pi-station/README.md#L57-L59](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L57)

Conclusion:

- The implemented protocol surface is currently limited to indicator control and health reporting.
- No reviewed source defines a presence event, sensor snapshot, zone report, LCD command, or structured error frame beyond plain-text `nack`.

Supporting evidence for the absence claim:

- The command enum contains only `None`, `SetIndicator`, and `RequestHealth`. Evidence: [firmware/esp8266-controller/include/protocol.h#L16-L20](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L16)
- The command struct contains only command type, indicator zone, and acknowledgement flag. Evidence: [firmware/esp8266-controller/include/protocol.h#L22-L25](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L22)
- The telemetry struct contains only `sensorOnline`, `indicatorOnline`, `uptimeMs`, and `activeZone`. Evidence: [firmware/esp8266-controller/include/protocol.h#L28-L33](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L28)

### 2. Presence Detection Model

The spec separates two different concepts that should not be collapsed into one signal:

- Detection start uses an ultrasonic sensor to detect a nearby person. Evidence: [spec/binsight-spec.md#L20-L23](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L20)
- Disposal detection requires continuous hand-zone tracking and hand-presence tracking, and it defines the drop event as a hand disappearance after prior presence. Evidence: [spec/binsight-spec.md#L37-L41](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L37)

The reviewed ownership documents align with a mixed model:

- The ESP8266 owns ultrasonic sensing. Evidence: [spec/binsight-spec.md#L136-L137](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L136), [firmware/esp8266-controller/README.md#L8-L16](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md#L8), [firmware/README.md#L8-L16](/home/handwash/Projects/hackcanada/firmware/README.md#L8)
- The Pi owns the live control loop, disposal detection, session state, and translation between firmware messages and cloud-facing contracts. Evidence: [devices/pi-station/README.md#L8-L17](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L8), [devices/README.md#L8-L16](/home/handwash/Projects/hackcanada/devices/README.md#L8)
- The Pi session state machine already models `latest_hand_zone`, `hand_present`, and `actual_disposal_zone`, and the Pi runtime currently drives disposal completion by toggling hand presence inside the state machine. Evidence: [devices/pi-station/src/binsight_station/session.py#L15-L24](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/session.py#L15), [devices/pi-station/src/binsight_station/session.py#L56-L72](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/session.py#L56), [devices/pi-station/src/binsight_station/main.py#L71-L82](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py#L71)

Recommendation on modeling:

- Use a mixed model.
- ESP-originated presence should cover coarse approach detection from the ultrasonic sensor because that sensor is physically assigned to the ESP boundary.
- Pi-originated presence should cover disposal-time hand presence and zone tracking because the spec defines those behaviors as part of the live control loop, and the Pi runtime already owns that state machine.

What the current code does not support yet:

- The firmware does not currently read an ultrasonic sensor or emit any presence-related message. Evidence: [firmware/esp8266-controller/src/main.cpp#L7-L30](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L7), [firmware/esp8266-controller/src/main.cpp#L50-L97](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L50)

### 3. Division Of Guidance Commands For LEDs And LCD

The spec and docs support a narrow command split:

- The user guidance outputs are an LED selection and LCD text. Evidence: [spec/binsight-spec.md#L32-L35](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L32)
- The ESP hardware unit owns poster LEDs. Evidence: [spec/binsight-spec.md#L136-L137](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L136)
- The Pi hardware unit owns the `16x2 LCD`. Evidence: [spec/binsight-spec.md#L136-L137](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L136)
- The firmware boundary explicitly assigns LED output to the controller and excludes higher-level contracts and event creation. Evidence: [firmware/esp8266-controller/README.md#L8-L16](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md#L8)
- The Pi boundary explicitly assigns session logic, classification, disposal guidance, disposal detection, and protocol translation to the Pi runtime. Evidence: [devices/pi-station/README.md#L8-L17](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L8)
- The current Pi runtime computes the disposal method locally and then issues an ESP guidance call after classification. Evidence: [devices/pi-station/src/binsight_station/main.py#L48-L69](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py#L48)

Recommended split:

- Pi decides the meaning of guidance because it owns classification, rules evaluation, and disposal-session logic.
- Pi sends only a narrow LED-target command to the ESP, equivalent to `indicator:<zone>`.
- Pi drives the LCD directly with `predicted_item` and `disposal_method` instead of routing LCD text through the ESP.

Rationale from the reviewed sources:

- There is no reviewed evidence that the ESP should own LCD behavior.
- There is direct reviewed evidence that the ESP should stay narrow and local-facing while the Pi acts as the translator and live control owner. Evidence: [devices/pi-station/README.md#L10-L17](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L10), [firmware/esp8266-controller/README.md#L10-L16](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md#L10)

### 4. Constraints And Failure Modes That Affect Runtime Design

- Transport mismatch: the spec says Pi and ESP communicate over Wi-Fi, but the reviewed firmware implementation is serial text and the Pi runtime placeholder defaults to a UDP endpoint without an implementation. Evidence: [spec/binsight-spec.md#L139-L139](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L139), [firmware/esp8266-controller/src/main.cpp#L50-L71](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L50), [firmware/esp8266-controller/src/main.cpp#L81-L83](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L81), [devices/pi-station/src/binsight_station/main.py#L30-L35](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py#L30), [devices/pi-station/src/binsight_station/esp_client.py#L12-L20](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/esp_client.py#L12)
- The indicator implementation is not zone-specific in hardware yet. The firmware stores `activeZone`, but it only drives `LED_BUILTIN` high or low, so left, middle, and right are not differentiated electrically in the reviewed code. Evidence: [firmware/esp8266-controller/src/main.cpp#L7-L19](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L7)
- Health telemetry is scaffold-grade rather than measured diagnostics. `sensorOnline` and `indicatorOnline` are hard-coded to `true`, so the Pi cannot treat health telemetry as a verified hardware truth source yet. Evidence: [firmware/esp8266-controller/src/main.cpp#L21-L27](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L21), [firmware/esp8266-controller/include/protocol.h#L28-L33](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L28)
- There is no implemented firmware-originated presence or zone message, so the current interface cannot trigger session start from ESP sensing or feed disposal tracking back into the Pi. Evidence: [firmware/esp8266-controller/include/protocol.h#L16-L37](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L16), [firmware/esp8266-controller/src/protocol.cpp#L37-L79](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L37)
- The current Pi runtime seam is still a placeholder and therefore provides no real transport, retry, timeout, or parsing behavior. Evidence: [devices/pi-station/src/binsight_station/esp_client.py#L12-L20](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/esp_client.py#L12), [devices/pi-station/README.md#L57-L59](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L57)
- The command protocol has acknowledgements only for indicator writes and a generic plain-text `nack` for parse failures. There are no message IDs, no explicit retry contract, and no structured error payload in the reviewed code. Evidence: [firmware/esp8266-controller/include/protocol.h#L22-L25](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h#L22), [firmware/esp8266-controller/src/protocol.cpp#L55-L57](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L55), [firmware/esp8266-controller/src/main.cpp#L32-L40](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L32), [firmware/esp8266-controller/src/main.cpp#L62-L65](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L62)
- Health is pushed every 5 seconds, so a Pi runtime that depends only on unsolicited telemetry would accept up to a 5-second stale view during disconnects or startup. Evidence: [firmware/esp8266-controller/src/main.cpp#L7-L7](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L7), [firmware/esp8266-controller/src/main.cpp#L87-L96](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L87)
- Both sides are explicitly described as scaffold or minimal seams, so runtime design should assume interface evolution is still expected. Evidence: [firmware/esp8266-controller/README.md#L20-L24](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md#L20), [devices/pi-station/README.md#L57-L59](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L57)

## Concrete Recommendation For The Pi Runtime / ESP Interface

Use a mixed boundary with the Pi as the authoritative session controller and the ESP as the narrow hardware coprocessor.

- Pi responsibilities:
	- Own session start and state progression.
	- Own classification, rules evaluation, disposal guidance semantics, disposal-time hand-zone tracking, drop detection, event creation, and LCD output.
	- Translate between cloud-facing payloads and the local ESP protocol.
	- Evidence: [devices/pi-station/README.md#L8-L17](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L8), [devices/README.md#L8-L16](/home/handwash/Projects/hackcanada/devices/README.md#L8), [devices/pi-station/src/binsight_station/main.py#L48-L82](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py#L48), [devices/pi-station/src/binsight_station/session.py#L39-L72](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/session.py#L39)
- ESP responsibilities:
	- Own ultrasonic sensing, LED actuation, acknowledgement of actuator commands, and health publication.
	- Do not own classification outputs, LCD rendering, disposal correctness logic, event creation, or cloud contracts.
	- Evidence: [spec/binsight-spec.md#L20-L23](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L20), [spec/binsight-spec.md#L136-L139](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L136), [firmware/esp8266-controller/README.md#L8-L16](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md#L8), [firmware/README.md#L8-L16](/home/handwash/Projects/hackcanada/firmware/README.md#L8)

For the interface itself:

- Keep `indicator:<zone>` as the Pi-to-ESP actuator command shape because it matches the existing narrow firmware seam. Evidence: [firmware/esp8266-controller/src/protocol.cpp#L51-L77](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L51)
- Preserve `health?` plus periodic health telemetry as a recovery and liveness mechanism, but do not rely on current `sensorOnline` or `indicatorOnline` values as definitive until they are measured instead of hard-coded. Evidence: [firmware/esp8266-controller/src/protocol.cpp#L46-L49](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp#L46), [firmware/esp8266-controller/src/main.cpp#L21-L30](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L21), [firmware/esp8266-controller/src/main.cpp#L87-L96](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp#L87)
- Add an ESP-originated presence signal for ultrasonic approach detection rather than having the Pi infer that from polling unrelated state, because the ultrasonic sensor belongs to the ESP boundary. Evidence: [spec/binsight-spec.md#L20-L23](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L20), [firmware/esp8266-controller/README.md#L10-L16](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md#L10)
- Keep disposal-time hand presence and zone tracking on the Pi side rather than moving it into the ESP, because the spec defines it as live disposal logic and the Pi runtime already models it. Evidence: [spec/binsight-spec.md#L37-L41](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L37), [devices/pi-station/README.md#L10-L17](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L10), [devices/pi-station/src/binsight_station/session.py#L56-L72](/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/session.py#L56)
- Keep LCD commands out of the ESP interface and let the Pi write the LCD directly, because the LCD belongs to the Pi hardware unit and there is no reviewed evidence for an LCD proxy requirement. Evidence: [spec/binsight-spec.md#L33-L34](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L33), [spec/binsight-spec.md#L136-L137](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L136)
- Align the transport to the spec by moving the eventual protocol implementation to Wi-Fi, but keep the logical message boundary narrow enough that the current serial-text prototype can still guide the message vocabulary. Evidence: [spec/binsight-spec.md#L139-L144](/home/handwash/Projects/hackcanada/spec/binsight-spec.md#L139), [devices/pi-station/README.md#L16-L17](/home/handwash/Projects/hackcanada/devices/pi-station/README.md#L16), [firmware/esp8266-controller/README.md#L15-L16](/home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md#L15)