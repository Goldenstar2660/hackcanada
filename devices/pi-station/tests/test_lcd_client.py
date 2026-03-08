from binsight_station.lcd_client import DEFAULT_LCD_PIN_CONFIG, LcdClient


class RecordingWriter:
    def __init__(self) -> None:
        self.screens = []
        self.closed = False

    def write_screen(self, screen: object) -> None:
        self.screens.append(screen)

    def close(self) -> None:
        self.closed = True


def test_lcd_client_uses_expected_default_gpio_pin_mapping() -> None:
    client = LcdClient(writer=RecordingWriter())

    assert client.pin_config == DEFAULT_LCD_PIN_CONFIG
    assert client.pin_config.rs == 25
    assert client.pin_config.e == 24
    assert client.pin_config.data == (23, 17, 18, 22)


def test_lcd_client_writes_formatted_screens_to_hardware_writer() -> None:
    writer = RecordingWriter()
    client = LcdClient(writer=writer)

    screen = client.render_guidance(
        predicted_item="aluminum-can",
        disposal_method="recycle",
        total_attempts=1,
        total_correct_sorts=1,
    )

    assert writer.screens == [screen]
    assert screen.line_one.strip() == "aluminum can"
    assert screen.line_two.strip() == "Use recycle"
    assert len(screen.line_one) == 16
    assert len(screen.line_two) == 16

    client.close()

    assert writer.closed is True