from __future__ import annotations

from typing import Generator
from types import SimpleNamespace

import pytest
from selenium.webdriver.support.ui import WebDriverWait

from verifier.browser import build_driver
from verifier.config import load_settings
from verifier.evidence import ArtifactManager
from verifier.pause import PauseController
from verifier.pages import (
    AdminPage,
    CatalogPage,
    CheckoutPage,
    HomePage,
    JastiperOrdersPage,
    LoginPage,
    OrdersPage,
    ProfilePage,
    ProductDetailPage,
    RegisterPage,
    ResultPage,
    WalletPage,
)
from verifier.services import build_services
from verifier.setup_helpers import SetupHelper


def pytest_addoption(parser):
    parser.addoption(
        "--pause-on-enter",
        action="store_true",
        default=False,
        help="Pause the Selenium run at the next safe checkpoint after you press Enter in an interactive terminal.",
    )


@pytest.hookimpl(hookwrapper=True, tryfirst=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    setattr(item, f"rep_{report.when}", report)


@pytest.fixture(scope="session")
def settings():
    return load_settings()


@pytest.fixture(scope="session")
def artifact_manager(settings):
    manager = ArtifactManager(settings.artifacts_root)
    yield manager
    summary_path = manager.finalize()
    print(f"\n[verifier] Summary written to {summary_path}")


@pytest.fixture(scope="session")
def services(settings):
    return build_services(settings)


@pytest.fixture(scope="session")
def setup_helper(settings, services):
    return SetupHelper(settings, services)


@pytest.fixture(scope="session")
def pause_controller(settings, pytestconfig):
    controller = PauseController(
        settings.pause_on_enter or pytestconfig.getoption("--pause-on-enter"),
        capture_mode=pytestconfig.getoption("capture"),
    )
    yield controller
    controller.stop()


@pytest.fixture(autouse=True)
def bind_pause_context(request, pause_controller, scenario_artifacts):
    pause_controller.bind_context(
        scenario_name=request.node.nodeid,
        artifacts=scenario_artifacts,
    )
    yield pause_controller
    pause_controller.clear_context()


def _safe_browser_state(driver) -> tuple[str, str]:
    current_url = "<unavailable>"
    page_title = "<unavailable>"
    try:
        current_url = driver.current_url or "<unavailable>"
    except Exception:  # noqa: BLE001
        pass
    try:
        page_title = driver.title or "<unavailable>"
    except Exception:  # noqa: BLE001
        pass
    return current_url, page_title


@pytest.fixture()
def browser(settings, request, pause_controller) -> Generator[tuple, None, None]:
    driver = build_driver(settings)
    wait = WebDriverWait(driver, 30)
    yield driver, wait
    report = getattr(request.node, "rep_call", None)
    should_pause = settings.pause_after_scenario or (
        settings.pause_on_failure and report is not None and report.failed
    )
    if should_pause:
        reason = "failure" if report is not None and report.failed else "scenario completion"
        current_url, page_title = _safe_browser_state(driver)
        if pause_controller.prompt_available:
            print(
                f"\n[verifier] Pause requested after {request.node.name} ({reason}).\n"
                f"  current_url: {current_url}\n"
                f"  page_title: {page_title}\n"
                "Press Enter to close the browser and continue..."
            )
            try:
                input()
            except EOFError:
                pause_controller.warn_unavailable(
                    "Interactive browser pause could not read stdin; continuing without waiting."
                )
        else:
            pause_controller.warn_unavailable(
                "PAUSE_AFTER_SCENARIO or PAUSE_ON_FAILURE was requested but interactive terminal input is unavailable. "
                "Run pytest with -s or --capture=no from a real interactive terminal."
            )
    driver.quit()


@pytest.fixture()
def pages(browser, settings, pause_controller, request, scenario_artifacts):
    driver, wait = browser
    return SimpleNamespace(
        home=HomePage(driver, wait, settings.frontend_base_url, pause_controller),
        register=RegisterPage(driver, wait, settings.frontend_base_url, pause_controller),
        login=LoginPage(driver, wait, settings.frontend_base_url, pause_controller),
        catalog=CatalogPage(driver, wait, settings.frontend_base_url, pause_controller),
        product_detail=ProductDetailPage(driver, wait, settings.frontend_base_url, pause_controller),
        wallet=WalletPage(driver, wait, settings.frontend_base_url, pause_controller),
        checkout=CheckoutPage(driver, wait, settings.frontend_base_url, pause_controller),
        result=ResultPage(driver, wait, settings.frontend_base_url, pause_controller),
        orders=OrdersPage(driver, wait, settings.frontend_base_url, pause_controller),
        profile=ProfilePage(driver, wait, settings.frontend_base_url, pause_controller),
        jastiper=JastiperOrdersPage(driver, wait, settings.frontend_base_url, pause_controller),
        admin=AdminPage(driver, wait, settings.frontend_base_url, pause_controller),
        driver=driver,
        wait=wait,
        pause_checkpoint=lambda label: pause_controller.checkpoint(
            driver=driver,
            label=label,
            artifacts=scenario_artifacts,
            test_name=request.node.nodeid,
        ),
    )


@pytest.fixture()
def scenario_artifacts(request, artifact_manager):
    return artifact_manager.scenario(request.node.name)
