from __future__ import annotations

import os
import re
import sys
import threading
import time
from pathlib import Path
from typing import Any


def _is_tty(stream: Any) -> bool:
    try:
        return bool(stream is not None and stream.isatty())
    except Exception:  # noqa: BLE001
        return False


class PauseController:
    def __init__(
        self,
        enabled: bool,
        *,
        capture_mode: str = "no",
        stdin=None,
        stdout=None,
        start_listener: bool = True,
        slow_mo_ms: int = 0,
        sleep_func=time.sleep,
    ) -> None:
        self._stdin = stdin or sys.stdin
        self._stdout = stdout or sys.stdout
        self._sleep = sleep_func
        self.capture_mode = capture_mode
        self.enabled_requested = enabled
        self.prompt_available = self.capture_mode == "no" and _is_tty(self._stdin) and _is_tty(self._stdout)
        self.active = bool(enabled and self.prompt_available)
        if slow_mo_ms > 0:
            self.slow_mo_ms = int(slow_mo_ms)
        elif self.active:
            self.slow_mo_ms = 600
        else:
            self.slow_mo_ms = 0

        self._pause_requested = threading.Event()
        self._resume_requested = threading.Event()
        self._paused = threading.Event()
        self._stop_requested = threading.Event()
        self._context_lock = threading.Lock()
        self._warned_messages: set[str] = set()
        self._scenario_name: str | None = None
        self._artifacts = None
        self._pause_counter = 0
        self._listener: threading.Thread | None = None

        if enabled and not self.prompt_available:
            self.warn_unavailable(
                "PAUSE_ON_ENTER was enabled but interactive pause is unavailable. "
                "Run pytest with -s or --capture=no from a real interactive terminal."
            )
        elif self.active and start_listener:
            self._listener = threading.Thread(
                target=self._listen_for_enter,
                name="verifier-pause-listener",
                daemon=True,
            )
            self._listener.start()

    @property
    def pause_requested(self) -> bool:
        return self._pause_requested.is_set()

    @property
    def is_paused(self) -> bool:
        return self._paused.is_set()

    def bind_context(self, *, scenario_name: str | None, artifacts=None) -> None:
        with self._context_lock:
            self._scenario_name = scenario_name
            self._artifacts = artifacts

    def clear_context(self) -> None:
        self.bind_context(scenario_name=None, artifacts=None)

    def request_pause(self) -> None:
        self._pause_requested.set()

    def request_resume(self) -> None:
        self._resume_requested.set()

    def slow_down(self, label: str | None = None) -> None:
        if self.slow_mo_ms <= 0:
            return
        self._sleep(self.slow_mo_ms / 1000)

    def checkpoint(self, *, driver=None, label: str, artifacts=None, test_name: str | None = None) -> bool:
        if not self.active or not self._pause_requested.is_set():
            return False

        self._pause_requested.clear()
        self._resume_requested.clear()
        self._paused.set()
        self._pause_counter += 1

        scenario_name, bound_artifacts = self._current_context()
        scenario_name = test_name or scenario_name or "<unknown>"
        effective_artifacts = artifacts or bound_artifacts

        current_url = self._safe_attr(driver, "current_url")
        page_title = self._safe_attr(driver, "title")
        screenshot_path = self._save_screenshot(driver, effective_artifacts, label)

        self._print_pause_context(
            scenario_name=scenario_name,
            label=label,
            current_url=current_url,
            page_title=page_title,
            screenshot_path=screenshot_path,
        )

        while not self._resume_requested.wait(timeout=0.1):
            if self._stop_requested.is_set():
                break

        self._resume_requested.clear()
        self._paused.clear()
        return True

    def stop(self) -> None:
        self._stop_requested.set()
        self._resume_requested.set()

    def warn_unavailable(self, message: str) -> None:
        if message in self._warned_messages:
            return
        self._warned_messages.add(message)
        self._write_line(f"[verifier] {message}")

    def _current_context(self) -> tuple[str | None, Any]:
        with self._context_lock:
            return self._scenario_name, self._artifacts

    def _listen_for_enter(self) -> None:
        if os.name == "nt":
            self._listen_for_enter_windows()
            return

        while not self._stop_requested.is_set():
            try:
                line = self._stdin.readline()
            except Exception:  # noqa: BLE001
                break
            if line == "":
                break
            self._handle_enter_press()

    def _listen_for_enter_windows(self) -> None:
        try:
            import msvcrt
        except Exception:  # noqa: BLE001
            self.warn_unavailable(
                "Windows console pause listener could not load msvcrt; interactive pause is disabled."
            )
            return

        while not self._stop_requested.is_set():
            try:
                if not msvcrt.kbhit():
                    self._sleep(0.03)
                    continue
                char = msvcrt.getwch()
            except Exception:  # noqa: BLE001
                break

            if char in {"\x00", "\xe0"}:
                try:
                    msvcrt.getwch()
                except Exception:  # noqa: BLE001
                    pass
                continue
            if char in {"\r", "\n"}:
                self._handle_enter_press()

    def _handle_enter_press(self) -> None:
        if self._paused.is_set():
            self.request_resume()
        else:
            self.request_pause()

    def _safe_attr(self, driver, attr_name: str) -> str:
        if driver is None:
            return ""
        try:
            value = getattr(driver, attr_name)
        except Exception:  # noqa: BLE001
            return ""
        return str(value) if value else ""

    def _save_screenshot(self, driver, artifacts, label: str) -> str | None:
        if driver is None or artifacts is None:
            return None
        safe_label = re.sub(r"[^a-zA-Z0-9]+", "_", label).strip("_") or "checkpoint"
        filename = f"pause_{self._pause_counter:02d}_{safe_label}.png"
        try:
            path = artifacts.save_screenshot(filename, driver)
        except Exception:  # noqa: BLE001
            return None
        return str(path) if isinstance(path, Path) else str(path)

    def _print_pause_context(
        self,
        *,
        scenario_name: str,
        label: str,
        current_url: str,
        page_title: str,
        screenshot_path: str | None,
    ) -> None:
        lines = [
            "",
            "[verifier] Interactive pause requested",
            f"  scenario: {scenario_name}",
            f"  checkpoint: {label}",
            f"  current_url: {current_url or '<unavailable>'}",
            f"  page_title: {page_title or '<unavailable>'}",
            f"  screenshot: {screenshot_path or '<not saved>'}",
            "Press Enter to continue...",
        ]
        for line in lines:
            self._write_line(line)

    def _write_line(self, message: str) -> None:
        try:
            self._stdout.write(f"{message}\n")
            self._stdout.flush()
        except Exception:  # noqa: BLE001
            sys.__stdout__.write(f"{message}\n")
            sys.__stdout__.flush()
