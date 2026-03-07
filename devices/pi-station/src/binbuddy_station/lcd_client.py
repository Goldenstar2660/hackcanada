from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class LcdScreen:
    mode: str
    line_one: str
    line_two: str


class LcdClient:
    """Pi-local LCD adapter that keeps display formatting outside the FSM."""

    def __init__(self) -> None:
        self.last_screen: LcdScreen | None = None
        self.screen_history: list[LcdScreen] = []

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
        return screen


def _fit_lcd_line(value: str) -> str:
    return value[:16].ljust(16)


def _station_totals_line(total_attempts: int, total_correct_sorts: int) -> str:
    return f"C:{total_correct_sorts} A:{total_attempts}"