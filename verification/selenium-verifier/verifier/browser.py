from __future__ import annotations

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.edge.service import Service as EdgeService
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.microsoft import EdgeChromiumDriverManager


def _chrome_options(settings):
    options = webdriver.ChromeOptions()
    if settings.headless:
        options.add_argument("--headless=new")
    options.add_argument("--start-maximized")
    options.add_argument("--window-size=1440,1200")
    return options


def _edge_options(settings):
    options = webdriver.EdgeOptions()
    if settings.headless:
        options.add_argument("--headless=new")
    options.add_argument("--start-maximized")
    options.add_argument("--window-size=1440,1200")
    return options


def build_driver(settings):
    browser = settings.browser.strip().lower()

    if browser == "chrome":
        options = _chrome_options(settings)
        try:
            return webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)
        except Exception:  # noqa: BLE001
            return webdriver.Chrome(options=options)

    if browser == "edge":
        options = _edge_options(settings)
        try:
            return webdriver.Edge(service=EdgeService(EdgeChromiumDriverManager().install()), options=options)
        except Exception:  # noqa: BLE001
            return webdriver.Edge(options=options)

    raise RuntimeError(f"Unsupported browser {settings.browser!r}. Use 'edge' or 'chrome'.")
