from __future__ import annotations

from dataclasses import dataclass
from time import sleep
from typing import Protocol


@dataclass(slots=True, frozen=True)
class LcdScreen:
    mode: str
    line_one: str
    line_two: str


@dataclass(slots=True, frozen=True)
class LcdPinConfig:
    rs: int = 25
    e: int = 24
    data: tuple[int, int, int, int] = (23, 17, 18, 22)
    cols: int = 16
    rows: int = 2


DEFAULT_LCD_PIN_CONFIG = LcdPinConfig()


class LcdHardwareWriter(Protocol):
    def write_screen(self, screen: LcdScreen) -> None: ...

    def close(self) -> None: ...


class NullLcdHardwareWriter:
    def write_screen(self, screen: LcdScreen) -> None:
        del screen

    def close(self) -> None:
        return None


class GpioZeroLcdHardwareWriter:
    """4-bit HD44780 LCD writer using Raspberry Pi BCM GPIO pins."""

    _enable_setup_seconds = 0.00001
    _enable_pulse_seconds = 0.0005
    _command_delay_seconds = 0.0005
    _clear_delay_seconds = 0.002

    def __init__(self, pin_config: LcdPinConfig) -> None:
        from gpiozero import OutputDevice

        self._pin_config = pin_config
        self._devices: list[object] = []
        try:
            self._rs = OutputDevice(pin_config.rs, initial_value=False)
            self._devices.append(self._rs)
            self._enable = OutputDevice(pin_config.e, initial_value=False)
            self._devices.append(self._enable)
            self._data_pins = tuple(OutputDevice(pin, initial_value=False) for pin in pin_config.data)
            self._devices.extend(self._data_pins)
            self._initialize_display()
        except Exception:
            self.close()
            raise

    def write_screen(self, screen: LcdScreen) -> None:
        self._write_line(0, screen.line_one)
        self._write_line(1, screen.line_two)

    def close(self) -> None:
        while self._devices:
            device = self._devices.pop()
            device.close()

    def _initialize_display(self) -> None:
        sleep(0.05)
        self._write_command(0x33)
        self._write_command(0x32)
        self._write_command(0x28)
        self._write_command(0x0C)
        self._write_command(0x06)
        self._write_command(0x01)

    def _write_line(self, row: int, value: str) -> None:
        address = 0x80 if row == 0 else 0xC0
        self._write_command(address)
        for character in value[: self._pin_config.cols].ljust(self._pin_config.cols):
            self._write_data(ord(character))

    def _write_command(self, value: int) -> None:
        self._send_byte(value, is_data=False)

    def _write_data(self, value: int) -> None:
        self._send_byte(value, is_data=True)

    def _send_byte(self, value: int, *, is_data: bool) -> None:
        if is_data:
            self._rs.on()
        else:
            self._rs.off()
        self._write_nibble((value >> 4) & 0x0F)
        self._write_nibble(value & 0x0F)
        sleep(
            self._clear_delay_seconds
            if not is_data and value in {0x01, 0x02}
            else self._command_delay_seconds
        )

    def _write_nibble(self, nibble: int) -> None:
        for bit_index, pin in enumerate(self._data_pins):
            if nibble & (1 << bit_index):
                pin.on()
            else:
                pin.off()
        self._pulse_enable()

    def _pulse_enable(self) -> None:
        self._enable.off()
        sleep(self._enable_setup_seconds)
        self._enable.on()
        sleep(self._enable_pulse_seconds)
        self._enable.off()
        sleep(self._enable_setup_seconds)


class LcdClient:
    """Pi-local LCD adapter that keeps display formatting outside the FSM."""

    def __init__(
        self,
        *,
        pin_config: LcdPinConfig = DEFAULT_LCD_PIN_CONFIG,
        writer: LcdHardwareWriter | None = None,
    ) -> None:
        self.pin_config = pin_config
        self.last_screen: LcdScreen | None = None
        self.screen_history: list[LcdScreen] = []
        self.hardware_error: str | None = None
        self._writer = writer or self._build_default_writer()

    def render_standby(self, total_attempts: int, total_correct_sorts: int) -> LcdScreen:
        return self._render(
            mode="standby",
            line_one="Ready to sort",
            line_two=_station_totals_line(total_attempts, total_correct_sorts),
        )

    def render_guidance(
        self,
        predicted_item: str,
        disposal_method: str,
        total_attempts: int,
        total_correct_sorts: int,
    ) -> LcdScreen:
        del total_attempts
        del total_correct_sorts
        return self._render(
            mode="guidance",
            line_one=predicted_item.replace("-", " "),
            line_two=f"Use {disposal_method}",
        )

    def render_result(self, success: bool, total_attempts: int, total_correct_sorts: int) -> LcdScreen:
        return self._render(
            mode="result",
            line_one="Correct sort" if success else "Try again",
            line_two=_station_totals_line(total_attempts, total_correct_sorts),
        )

    def render_reset(self, total_attempts: int, total_correct_sorts: int) -> LcdScreen:
        return self._render(
            mode="reset",
            line_one="Resetting",
            line_two=_station_totals_line(total_attempts, total_correct_sorts),
        )

    def render_error(self, message: str) -> LcdScreen:
        return self._render(
            mode="error",
            line_one="Sync issue",
            line_two=message,
        )

    def _render(self, mode: str, line_one: str, line_two: str) -> LcdScreen:
        screen = LcdScreen(
            mode=mode,
            line_one=_fit_lcd_line(line_one),
            line_two=_fit_lcd_line(line_two),
        )
        self.last_screen = screen
        self.screen_history.append(screen)
        try:
            self._writer.write_screen(screen)
        except Exception as exc:
            self.hardware_error = str(exc)
            self._writer = NullLcdHardwareWriter()
        return screen

    def close(self) -> None:
        try:
            self._writer.close()
        except Exception as exc:
            self.hardware_error = str(exc)

    def _build_default_writer(self) -> LcdHardwareWriter:
        try:
            return GpioZeroLcdHardwareWriter(self.pin_config)
        except Exception as exc:
            self.hardware_error = str(exc)
            return NullLcdHardwareWriter()


def _fit_lcd_line(value: str) -> str:
    return value[:16].ljust(16)


def _station_totals_line(total_attempts: int, total_correct_sorts: int) -> str:
    return f"C:{total_correct_sorts} A:{total_attempts}"