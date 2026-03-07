import json
import time
import logging
from datetime import datetime
from typing import Callable, Optional
import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StationMQTTClient:
    def __init__(
        self,
        station_id: str,
        broker_host: str = "localhost",
        broker_port: int = 1883,
        led_ack_timeout_ms: int = 500,
        max_retries: int = 3
    ):
        self.station_id = station_id
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.led_ack_timeout_ms = led_ack_timeout_ms
        self.max_retries = max_retries

        self.client = mqtt.Client(client_id=f"pi_{station_id}")
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect

        self._pending_acks: dict[int, dict] = {}
        self._tx_id = 0

        self.pir_callback: Optional[Callable[[dict], None]] = None
        self.status_callback: Optional[Callable[[dict], None]] = None
        self.led_ack_callback: Optional[Callable[[int, bool], None]] = None

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"Connected to MQTT broker at {self.broker_host}:{self.broker_port}")
            topics = [
                (f"station/{self.station_id}/pir", 1),
                (f"station/{self.station_id}/status", 1),
                (f"station/{self.station_id}/led/ack", 1),
            ]
            client.subscribe(topics)
            logger.info(f"Subscribed to topics: {topics}")
        else:
            logger.error(f"Failed to connect to MQTT broker, return code: {rc}")

    def _on_disconnect(self, client, userdata, rc):
        logger.warning(f"Disconnected from MQTT broker, return code: {rc}")
        if rc != 0:
            logger.info("Attempting to reconnect...")
            self._reconnect()

    def _reconnect(self):
        while not self.client.is_connected():
            try:
                self.client.reconnect()
                time.sleep(1)
            except Exception as e:
                logger.error(f"Reconnection failed: {e}")
                time.sleep(5)

    def _on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())

            if f"station/{self.station_id}/pir" in topic:
                logger.info(f"PIR event received: {payload}")
                if self.pir_callback:
                    self.pir_callback(payload)

            elif f"station/{self.station_id}/status" in topic:
                logger.info(f"Status update: {payload}")
                if self.status_callback:
                    self.status_callback(payload)

            elif f"station/{self.station_id}/led/ack" in topic:
                tx_id = payload.get("tx_id")
                success = payload.get("success", False)
                logger.info(f"LED ack received: tx_id={tx_id}, success={success}")
                if tx_id in self._pending_acks:
                    self._pending_acks[tx_id]["success"] = success
                    self._pending_acks[tx_id]["received"] = True
                if self.led_ack_callback:
                    self.led_ack_callback(tx_id, success)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse MQTT message: {e}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def connect(self) -> bool:
        try:
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
            time.sleep(1)
            return self.client.is_connected()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            return False

    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()

    def set_leds(self, left: bool = False, middle: bool = False, right: bool = False) -> bool:
        self._tx_id += 1
        tx_id = self._tx_id

        payload = {
            "left": left,
            "middle": middle,
            "right": right,
            "tx_id": tx_id
        }

        topic = f"station/{self.station_id}/led/set"

        for attempt in range(self.max_retries):
            self._pending_acks[tx_id] = {"success": None, "received": False}
            result = self.client.publish(topic, json.dumps(payload), qos=1)

            if result.rc != mqtt.MQTT_ERR_SUCCESS:
                logger.error(f"Failed to publish LED command: {result.rc}")
                continue

            start_time = time.time() * 1000
            while not self._pending_acks[tx_id]["received"]:
                if time.time() * 1000 - start_time > self.led_ack_timeout_ms:
                    logger.warning(f"LED ack timeout for tx_id={tx_id}, attempt {attempt + 1}/{self.max_retries}")
                    del self._pending_acks[tx_id]
                    break
                time.sleep(0.01)
            else:
                success = self._pending_acks[tx_id]["success"]
                del self._pending_acks[tx_id]
                return success

        logger.error(f"LED command failed after {self.max_retries} attempts")
        return False

    def publish_meta(self, meta: dict):
        topic = f"station/{self.station_id}/meta"
        self.client.publish(topic, json.dumps(meta), retain=True)
        logger.info(f"Published station meta: {meta}")

    def publish_event(self, event: dict):
        topic = f"station/{self.station_id}/event"
        result = self.client.publish(topic, json.dumps(event), qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"Published event: {event}")
        else:
            logger.error(f"Failed to publish event: {result.rc}")


def main():
    station_id = "station_001"
    mqtt_client = StationMQTTClient(station_id, broker_host="localhost")

    def on_pir(payload):
        print(f"PIR Triggered at {payload.get('ts')}")

    def on_status(payload):
        print(f"Status: {payload}")

    def on_led_ack(tx_id, success):
        print(f"LED ack: tx_id={tx_id}, success={success}")

    mqtt_client.pir_callback = on_pir
    mqtt_client.status_callback = on_status
    mqtt_client.led_ack_callback = on_led_ack

    if mqtt_client.connect():
        print(f"Connected to MQTT broker for {station_id}")

        mqtt_client.publish_meta({
            "station_id": station_id,
            "firmware_version": "1.0.0",
            "zone_mapping": {"left": "recycle", "middle": "compost", "right": "garbage"},
            "created_at": datetime.now().isoformat()
        })

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Shutting down...")
    else:
        print("Failed to connect to MQTT broker")

    mqtt_client.disconnect()


if __name__ == "__main__":
    main()
