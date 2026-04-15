#!/usr/bin/env python3
"""Visible Selenium flow for the milestone 25% / 50% frontend demo."""

from __future__ import annotations

import argparse
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlparse

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


DEFAULT_BASE_URL = "https://advprog-frontend-m25-m50-383620816191.us-central1.run.app"
DEFAULT_VOUCHER = "MILESTONE10"
DEFAULT_PRODUCT_NAME = "Rare Sonny Angel Winter Wonderland"
DEFAULT_PASSWORD = "Audit123!"
DEFAULT_TOP_UP = 1_000_000


@dataclass
class DemoAccount:
    email: str
    username: str
    password: str


class DemoFlow:
    def __init__(self, driver, wait: WebDriverWait, args: argparse.Namespace) -> None:
        self.driver = driver
        self.wait = wait
        self.args = args
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        self.account = DemoAccount(
            email=f"selenium-{timestamp}@json.app",
            username=f"selenium{timestamp}",
            password=args.password,
        )
        self.product_url = ""
        self.product_id = ""

    def log(self, message: str) -> None:
        print(f"[demo] {message}", flush=True)

    def pause(self, reason: str, extra_seconds: float = 0.0) -> None:
        seconds = self.args.slow_seconds + extra_seconds
        self.log(f"{reason} Waiting {seconds:.1f}s so you can read the screen.")
        time.sleep(seconds)

    def wait_for_ready(self) -> None:
        self.wait.until(lambda browser: browser.execute_script("return document.readyState") == "complete")

    def wait_for_text(self, text: str, timeout: int | None = None) -> None:
        active_wait = self.wait if timeout is None else WebDriverWait(self.driver, timeout)
        active_wait.until(
            EC.visibility_of_element_located((By.XPATH, f"//*[contains(normalize-space(), \"{text}\")]"))
        )

    def find_clickable(self, by: By, value: str):
        element = self.wait.until(EC.element_to_be_clickable((by, value)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        return element

    def click(self, by: By, value: str, label: str) -> None:
        self.log(f"Clicking {label}.")
        self.find_clickable(by, value).click()

    def fill(self, by: By, value: str, content: str, label: str) -> None:
        self.log(f"Filling {label}: {content}")
        field = self.wait.until(EC.visibility_of_element_located((by, value)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", field)
        field.click()
        field.send_keys(Keys.CONTROL, "a")
        field.send_keys(content)

    def open_home(self) -> None:
        self.log(f"Opening {self.args.base_url}")
        self.driver.get(self.args.base_url)
        self.wait_for_ready()
        self.wait_for_text("Milestone 25% and 50% with the real services.")
        self.pause("Home page is ready.")

    def register(self) -> None:
        self.click(By.XPATH, "//a[normalize-space()='Start with register']", "the register CTA")
        self.wait_for_text("Create a buyer account")
        self.pause("Register page loaded.")

        self.fill(By.NAME, "email", self.account.email, "register email")
        self.fill(By.NAME, "username", self.account.username, "register username")
        self.fill(By.NAME, "password", self.account.password, "register password")
        self.pause("Registration form is filled in.")

        self.click(By.XPATH, "//button[normalize-space()='Register']", "Register")
        self.wait_for_text("Log in to continue")
        self.pause("Registration finished and login page opened.")

    def login(self) -> None:
        self.fill(By.CSS_SELECTOR, "input[type='password']", self.account.password, "login password")
        self.pause("Login screen is ready.")
        self.click(By.XPATH, "//button[normalize-space()='Log in']", "Log in")
        self.wait_for_text("Browse demo-ready products")
        self.pause("Logged in and product catalog loaded.")

    def open_product(self) -> None:
        self.fill(
            By.CSS_SELECTOR,
            "input[placeholder*='Try sneakers']",
            self.args.product_name,
            "catalog search",
        )
        self.pause("Catalog filtered for the target product.")

        product_button = (
            "//article[contains(@class,'product-card')][.//h3[contains(normalize-space(),"
            f" \"{self.args.product_name}\")]]//a[normalize-space()='View details']"
        )
        self.click(By.XPATH, product_button, f"View details for {self.args.product_name}")
        self.wait_for_text(self.args.product_name)
        self.product_url = self.driver.current_url
        self.product_id = urlparse(self.product_url).path.rstrip("/").split("/")[-1]
        self.pause("Product detail page is visible.")

    def top_up_wallet(self) -> None:
        self.click(By.XPATH, "//a[normalize-space()='Wallet']", "the Wallet navigation item")
        self.wait_for_text("Add balance instantly")
        self.pause("Wallet page loaded.")

        self.fill(By.CSS_SELECTOR, "input[type='number']", str(self.args.top_up_amount), "top-up amount")
        self.pause("Top-up amount entered.")
        self.click(By.XPATH, "//button[normalize-space()='Top up wallet']", "Top up wallet")
        self.wait_for_text("Top-up completed.")
        self.pause("Wallet top-up completed.")

    def checkout_success(self) -> None:
        self.log("Re-opening the saved product detail page.")
        self.driver.get(self.product_url)
        self.wait_for_ready()
        self.wait_for_text(self.args.product_name)
        self.pause("Product detail page reloaded.")

        self.click(By.XPATH, "//button[normalize-space()='Buy now']", "Buy now")
        self.wait_for_text("Finish milestone 50% flow")
        self.pause("Checkout page loaded.")

        self.fill(By.CSS_SELECTOR, "input[placeholder='MILESTONE10']", self.args.voucher_code, "voucher code")
        self.pause("Voucher code entered.")

        self.click(By.XPATH, "//button[normalize-space()='Create order and pay']", "Create order and pay")
        self.wait_for_text("Checkout completed successfully")
        self.pause("Successful order result page is visible.", extra_seconds=self.args.result_extra_seconds)

    def open_orders(self) -> None:
        self.click(By.XPATH, "//a[normalize-space()='Back to orders']", "Back to orders")
        self.wait_for_text("My checkout results")
        self.pause("Orders page loaded.")

    def checkout_failure(self) -> None:
        if not self.args.show_failure_flow:
            return

        self.log("Starting the optional insufficient-wallet checkout.")
        failure_url = f"{self.args.base_url}/checkout?productId={self.product_id}&qty=1"
        self.driver.get(failure_url)
        self.wait_for_ready()
        self.wait_for_text("Finish milestone 50% flow")
        self.pause("Failure demo checkout page loaded.")

        self.fill(By.CSS_SELECTOR, "input[placeholder='MILESTONE10']", self.args.voucher_code, "voucher code")
        self.pause("Voucher code re-entered for the failure demo.")
        self.click(By.XPATH, "//button[normalize-space()='Create order and pay']", "Create order and pay")

        self.wait_for_text("Wallet balance is insufficient.")
        self.pause("Failure message is on screen.", extra_seconds=self.args.result_extra_seconds)

    def hold_open(self) -> None:
        if self.args.no_hold_open:
            return

        input("Flow finished. Press Enter to close the browser...")

    def run(self) -> None:
        self.open_home()
        self.register()
        self.login()
        self.open_product()
        self.top_up_wallet()
        self.checkout_success()
        self.open_orders()
        self.checkout_failure()
        self.hold_open()


def build_driver(browser_name: str):
    attempts = [browser_name] if browser_name != "auto" else ["edge", "chrome"]
    last_error = None

    for current_browser in attempts:
        try:
            if current_browser == "edge":
                options = webdriver.EdgeOptions()
                options.add_argument("--start-maximized")
                return webdriver.Edge(options=options)

            if current_browser == "chrome":
                options = webdriver.ChromeOptions()
                options.add_argument("--start-maximized")
                return webdriver.Chrome(options=options)
        except WebDriverException as error:
            last_error = error

    raise RuntimeError(
        "Could not start a supported browser. Install Microsoft Edge or Google Chrome, "
        "then rerun the script."
    ) from last_error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the visible milestone demo flow with Selenium.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Frontend base URL.")
    parser.add_argument("--browser", choices=["auto", "edge", "chrome"], default="auto")
    parser.add_argument("--slow-seconds", type=float, default=4.0, help="Pause after each major step.")
    parser.add_argument(
        "--result-extra-seconds",
        type=float,
        default=6.0,
        help="Additional pause on result pages so they stay visible longer.",
    )
    parser.add_argument("--voucher-code", default=DEFAULT_VOUCHER, help="Voucher code to use at checkout.")
    parser.add_argument(
        "--product-name",
        default=DEFAULT_PRODUCT_NAME,
        help="Catalog product name to search for before checkout.",
    )
    parser.add_argument("--top-up-amount", type=int, default=DEFAULT_TOP_UP, help="Wallet top-up amount.")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Password for the generated test account.")
    parser.add_argument(
        "--show-failure-flow",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="After a successful order, run a second checkout that should fail with insufficient balance.",
    )
    parser.add_argument(
        "--no-hold-open",
        action="store_true",
        help="Close the browser immediately after the scripted flow finishes.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    driver = build_driver(args.browser)
    wait = WebDriverWait(driver, 30)

    try:
        DemoFlow(driver, wait, args).run()
        return 0
    except TimeoutException as error:
        print(f"[demo] Timed out waiting for the UI: {error}", file=sys.stderr)
        if not args.no_hold_open:
            input("The script stopped on a timeout. Press Enter to close the browser...")
        return 1
    except Exception as error:  # noqa: BLE001
        print(f"[demo] Flow failed: {error}", file=sys.stderr)
        if not args.no_hold_open:
            input("The script stopped because of an error. Press Enter to close the browser...")
        return 1
    finally:
        driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())
