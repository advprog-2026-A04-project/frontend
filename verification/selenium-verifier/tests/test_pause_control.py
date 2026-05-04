from __future__ import annotations

import io
import threading
import time
from pathlib import Path

from verifier.pause_control import PauseController


class _TTYBuffer(io.StringIO):
    def isatty(self) -> bool:  # pragma: no cover - trivial
        return True


class _NonTTYBuffer(io.StringIO):
    def isatty(self) -> bool:  # pragma: no cover - trivial
        return False


class _FakeDriver:
    current_url = "http://localhost:5173/products"
    title = "JSON Catalog"

    def save_screenshot(self, target: str) -> bool:
        Path(target).write_text("fake-image", encoding="utf-8")
        return True


class _BrokenDriver:
    @property
    def current_url(self):
        raise RuntimeError("driver already closed")

    @property
    def title(self):
        raise RuntimeError("driver already closed")


class _FakeArtifacts:
    def __init__(self) -> None:
        self.saved: list[str] = []

    def save_screenshot(self, filename: str, driver) -> Path:
        self.saved.append(filename)
        return Path("verification-artifacts") / filename


def _resume_later(controller: PauseController, delay: float = 0.05) -> None:
    def _worker():
        time.sleep(delay)
        controller.request_resume()

    threading.Thread(target=_worker, daemon=True).start()


def test_pause_controller_disabled_by_default_returns_immediately():
    stdout = _TTYBuffer()
    controller = PauseController(
        False,
        capture_mode="no",
        stdin=_TTYBuffer(),
        stdout=stdout,
        start_listener=False,
    )

    assert controller.active is False
    assert controller.checkpoint(driver=None, label="catalog_loaded") is False
    assert stdout.getvalue() == ""


def test_pause_controller_disables_without_interactive_terminal():
    stdout = _TTYBuffer()
    controller = PauseController(
        True,
        capture_mode="no",
        stdin=_NonTTYBuffer(),
        stdout=stdout,
        start_listener=False,
    )

    assert controller.active is False
    assert "interactive pause is unavailable" in stdout.getvalue().lower()
    assert controller.checkpoint(driver=None, label="catalog_loaded") is False


def test_pause_controller_disables_when_pytest_capture_is_enabled():
    stdout = _TTYBuffer()
    controller = PauseController(
        True,
        capture_mode="fd",
        stdin=_TTYBuffer(),
        stdout=stdout,
        start_listener=False,
    )

    assert controller.active is False
    assert "run pytest with -s or --capture=no" in stdout.getvalue().lower()
    assert controller.checkpoint(driver=None, label="catalog_loaded") is False


def test_pause_controller_checkpoint_honors_pause_request_and_clears_it():
    stdout = _TTYBuffer()
    artifacts = _FakeArtifacts()
    controller = PauseController(
        True,
        capture_mode="no",
        stdin=_TTYBuffer(),
        stdout=stdout,
        start_listener=False,
    )
    controller.bind_context(scenario_name="tests/test_live_verification.py::test_example", artifacts=artifacts)
    controller.request_pause()
    _resume_later(controller)

    paused = controller.checkpoint(driver=_FakeDriver(), label="catalog_loaded")

    output = stdout.getvalue()
    assert paused is True
    assert controller.pause_requested is False
    assert controller.is_paused is False
    assert "scenario: tests/test_live_verification.py::test_example" in output
    assert "checkpoint: catalog_loaded" in output
    assert "current_url: http://localhost:5173/products" in output
    assert "page_title: JSON Catalog" in output
    assert "pause_01_catalog_loaded.png" in output
    assert artifacts.saved == ["pause_01_catalog_loaded.png"]


def test_pause_controller_checkpoint_tolerates_driver_and_screenshot_failures():
    class _BrokenArtifacts:
        def save_screenshot(self, filename: str, driver) -> Path:
            raise RuntimeError("disk full")

    stdout = _TTYBuffer()
    controller = PauseController(
        True,
        capture_mode="no",
        stdin=_TTYBuffer(),
        stdout=stdout,
        start_listener=False,
    )
    controller.bind_context(scenario_name="tests/test_live_verification.py::test_broken", artifacts=_BrokenArtifacts())
    controller.request_pause()
    _resume_later(controller)

    paused = controller.checkpoint(driver=_BrokenDriver(), label="result_loaded")

    output = stdout.getvalue()
    assert paused is True
    assert "current_url: <unavailable>" in output
    assert "page_title: <unavailable>" in output
    assert "screenshot: <not saved>" in output
