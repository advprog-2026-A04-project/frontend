from __future__ import annotations

from typing import Generator
from types import SimpleNamespace

import pytest
from selenium.webdriver.support.ui import WebDriverWait

from verifier.browser import build_driver
from verifier.config import load_settings
from verifier.evidence import ArtifactManager
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


@pytest.fixture()
def browser(settings, request) -> Generator[tuple, None, None]:
    driver = build_driver(settings)
    wait = WebDriverWait(driver, 30)
    yield driver, wait
    report = getattr(request.node, "rep_call", None)
    should_pause = settings.pause_after_scenario or (
        settings.pause_on_failure and report is not None and report.failed
    )
    if should_pause:
        reason = "failure" if report is not None and report.failed else "scenario completion"
        print(
            f"\n[verifier] Pause requested after {request.node.name} ({reason}). "
            f"Current URL: {driver.current_url}\n"
            "Press Enter to close the browser and continue..."
        )
        try:
            input()
        except EOFError:
            print("[verifier] Input stream is unavailable; continuing without an interactive pause.")
    driver.quit()


@pytest.fixture()
def pages(browser, settings):
    driver, wait = browser
    return SimpleNamespace(
        home=HomePage(driver, wait, settings.frontend_base_url),
        register=RegisterPage(driver, wait, settings.frontend_base_url),
        login=LoginPage(driver, wait, settings.frontend_base_url),
        catalog=CatalogPage(driver, wait, settings.frontend_base_url),
        product_detail=ProductDetailPage(driver, wait, settings.frontend_base_url),
        wallet=WalletPage(driver, wait, settings.frontend_base_url),
        checkout=CheckoutPage(driver, wait, settings.frontend_base_url),
        result=ResultPage(driver, wait, settings.frontend_base_url),
        orders=OrdersPage(driver, wait, settings.frontend_base_url),
        profile=ProfilePage(driver, wait, settings.frontend_base_url),
        jastiper=JastiperOrdersPage(driver, wait, settings.frontend_base_url),
        admin=AdminPage(driver, wait, settings.frontend_base_url),
        driver=driver,
        wait=wait,
    )


@pytest.fixture()
def scenario_artifacts(request, artifact_manager):
    return artifact_manager.scenario(request.node.name)
