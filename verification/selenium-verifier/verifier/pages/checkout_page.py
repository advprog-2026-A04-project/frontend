from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class CheckoutPage(BasePage):
    def wait_loaded(self) -> None:
        self.wait_for_text("Finish milestone 50% flow")

    def set_shipping_address(self, address: str) -> None:
        self.fill_css("textarea", address)

    def set_quantity(self, quantity: int) -> None:
        self.fill_xpath("//label[.//span[normalize-space()='Quantity']]//input", str(quantity))

    def set_voucher_code(self, code: str) -> None:
        self.fill_css("input[placeholder='MILESTONE10']", code)

    def submit(self) -> None:
        self.click_xpath("//button[normalize-space()='Create order and pay']")

    def wallet_balance_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class,'summary-row')][.//span[normalize-space()='Wallet balance']]//strong"))
        ).text

    def estimated_total_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class,'summary-row')][.//span[normalize-space()='Estimated total']]//strong"))
        ).text

    def error_text(self) -> str:
        element = self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".notice--danger")))
        return element.text
