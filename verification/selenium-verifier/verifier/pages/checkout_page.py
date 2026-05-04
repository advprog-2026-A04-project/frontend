from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class CheckoutPage(BasePage):
    def wait_loaded(self) -> None:
        self.wait_for_text("Complete your order.")

    def set_shipping_address(self, address: str) -> None:
        self.fill_css("textarea", address)

    def set_quantity(self, quantity: int) -> None:
        self.fill_xpath("//label[.//span[normalize-space()='Quantity']]//input", str(quantity))

    def set_voucher_code(self, code: str) -> None:
        self.fill_css("input[placeholder='MILESTONE10']", code)

    def submit(self) -> None:
        self.click_xpath("//button[contains(normalize-space(), 'Checkout Now')]")

    def wallet_balance_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[normalize-space()='Wallet balance']/following-sibling::*[1]"))
        ).text

    def estimated_total_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[normalize-space()='Estimated total']/following-sibling::*[1]"))
        ).text

    def error_text(self) -> str:
        element = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(@class,'bg-rose-500/10') or contains(normalize-space(),'Order will reject invalid vouchers')]"))
        )
        return element.text

    def voucher_banner_text(self) -> str:
        element = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//article[.//h2[normalize-space()='Apply a code']]"
                    "//*[contains(normalize-space(),'Final validation') or contains(normalize-space(),'Order will reject invalid vouchers.')]",
                )
            )
        )
        return element.text

    def public_voucher_codes(self) -> list[str]:
        return [
            element.text.strip()
            for element in self.driver.find_elements(
                By.XPATH,
                "//article[.//h2[normalize-space()='Apply a code']]//strong",
            )
            if element.text.strip()
        ]

    def has_public_voucher(self, code: str) -> bool:
        return any(item.upper() == code.upper() for item in self.public_voucher_codes())
