from __future__ import annotations

import sys

try:
    import msvcrt
except ImportError:  # pragma: no cover - Windows-only helper.
    msvcrt = None


class PauseController:
    def __init__(self, enabled: bool) -> None:
        self.requested = enabled
        self.available = bool(enabled and msvcrt and sys.stdin.isatty() and sys.stdout.isatty())
        self._warned_unavailable = False

    def checkpoint(self, *, driver=None, label: str | None = None) -> None:
        if not self.requested:
            return
        if not self.available:
            self._warn_unavailable_once()
            return
        if not self._enter_was_pressed():
            return

        current_url = ""
        if driver is not None:
            try:
                current_url = driver.current_url
            except Exception:  # noqa: BLE001
                current_url = ""

        message = "\n[verifier] Pause-on-enter triggered"
        if label:
            message += f" at {label}"
        if current_url:
            message += f". Current URL: {current_url}"
        message += "\nPress Enter to resume..."
        print(message)

        while True:
            key = msvcrt.getwch()
            if key in {"\r", "\n"}:
                break

    def _warn_unavailable_once(self) -> None:
        if self._warned_unavailable:
            return
        self._warned_unavailable = True
        print(
            "[verifier] PAUSE_ON_ENTER was requested but this run has no interactive console. "
            "The verifier will continue without pause-on-enter."
        )

    def _enter_was_pressed(self) -> bool:
        pressed = False
        try:
            while msvcrt.kbhit():
                key = msvcrt.getwch()
                if key in {"\r", "\n"}:
                    pressed = True
        except OSError:
            return False
        return pressed
