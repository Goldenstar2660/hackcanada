#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100";
const int mqtt_port = 1883;
const char* station_id = "station_001";

#define PIR_PIN D1
#define LED_LEFT D2
#define LED_MIDDLE D3
#define LED_RIGHT D4
#define LED_STATUS D5

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000;
int tx_id = 0;

void setup_wifi() {
  delay(10);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  char message[length + 1];
  for (unsigned int i = 0; i < length; i++) {
    message[i] = payload[i];
  }
  message[length] = '\0';

  if (String(topic).startsWith("station/" + String(station_id) + "/led/set")) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (!error) {
      bool left = doc["left"] | false;
      bool middle = doc["middle"] | false;
      bool right = doc["right"] | false;
      int ack_tx_id = doc["tx_id"] | 0;

      digitalWrite(LED_LEFT, left ? LOW : HIGH);
      digitalWrite(LED_MIDDLE, middle ? LOW : HIGH);
      digitalWrite(LED_RIGHT, right ? LOW : HIGH);

      char ackTopic[64];
      sprintf(ackTopic, "station/%s/led/ack", station_id);
      char ackMsg[64];
      sprintf(ackMsg, "{\"tx_id\":%d,\"success\":true}", ack_tx_id);
      client.publish(ackTopic, ackMsg, true);
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect(station_id)) {
      char pirTopic[64];
      sprintf(pirTopic, "station/%s/pir", station_id);
      client.subscribe(pirTopic);

      char ledSetTopic[64];
      sprintf(ledSetTopic, "station/%s/led/set", station_id);
      client.subscribe(ledSetTopic);
    } else {
      delay(5000);
    }
  }
}

void send_pir_event() {
  char topic[64];
  sprintf(topic, "station/%s/pir", station_id);

  StaticJsonDocument<256> doc;
  time_t now = time(nullptr);
  char timestamp[32];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
  doc["ts"] = timestamp;
  doc["event"] = "motion";

  char payload[256];
  serializeJson(doc, payload);
  client.publish(topic, payload, 0);
}

void send_heartbeat() {
  char topic[64];
  sprintf(topic, "station/%s/status", station_id);

  StaticJsonDocument<128> doc;
  doc["firmware_version"] = "1.0.0";
  doc["uptime_ms"] = millis();

  char payload[128];
  serializeJson(doc, payload);
  client.publish(topic, payload, 0, true);
}

void setup() {
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_LEFT, OUTPUT);
  pinMode(LED_MIDDLE, OUTPUT);
  pinMode(LED_RIGHT, OUTPUT);
  pinMode(LED_STATUS, OUTPUT);

  digitalWrite(LED_LEFT, HIGH);
  digitalWrite(LED_MIDDLE, HIGH);
  digitalWrite(LED_RIGHT, HIGH);
  digitalWrite(LED_STATUS, LOW);

  Serial.begin(115200);
  setup_wifi();
  
  configTime(0, 0, "pool.ntp.org");
  
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  static bool pir_state = false;
  bool current_pir = digitalRead(PIR_PIN);
  if (current_pir && !pir_state) {
    send_pir_event();
  }
  pir_state = current_pir;

  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    send_heartbeat();
    lastHeartbeat = millis();
  }
}
