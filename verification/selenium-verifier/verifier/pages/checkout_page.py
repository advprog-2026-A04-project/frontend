from __future__ import annotations

from selenium.common.exceptions import StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class CheckoutPage(BasePage):
    SUBMIT_XPATH = "//button[contains(normalize-space(), 'Checkout')]"

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

    def submit_button(self):
        return self.wait.until(EC.visibility_of_element_located((By.XPATH, self.SUBMIT_XPATH)))

    def _submit_button_if_present(self):
        buttons = self.driver.find_elements(By.XPATH, self.SUBMIT_XPATH)
        return buttons[0] if buttons else None

    def submit_button_text(self) -> str:
        button = self._submit_button_if_present()
        if button is None:
            return ""
        try:
            return button.text
        except StaleElementReferenceException:
            return ""

    def is_submit_disabled(self) -> bool:
        button = self._submit_button_if_present()
        if button is None:
            return False
        try:
            return button.get_attribute("disabled") is not None
        except StaleElementReferenceException:
            return False

    def wait_for_submit_busy(self) -> dict[str, str | bool]:
        state = {"disabled": False, "text": ""}

        def is_busy_or_navigated(_driver) -> bool:
            if self.current_path() != "/checkout":
                return True
            button = self._submit_button_if_present()
            if button is None:
                return True
            try:
                state["text"] = button.text
                state["disabled"] = button.get_attribute("disabled") is not None
                return bool(state["disabled"]) or "Processing" in state["text"]
            except StaleElementReferenceException:
                return self.current_path() != "/checkout"

        self.wait.until(is_busy_or_navigated)
        return {
            "disabled": bool(state["disabled"]),
            "text": str(state["text"]),
        }

    def submit_twice_quickly(self) -> dict[str, str | bool]:
        button = self.submit_button()
        initial_text = button.text
        self.driver.execute_script("arguments[0].click();", button)
        busy = self.wait_for_submit_busy()
        second_click_attempted = False
        second_click_blocked_reason = ""
        if self.current_path() == "/checkout":
            follow_up_button = self._submit_button_if_present()
            if follow_up_button is None:
                second_click_blocked_reason = "button_missing"
            else:
                try:
                    follow_up_text = follow_up_button.text
                    follow_up_disabled = follow_up_button.get_attribute("disabled") is not None
                    if follow_up_disabled or "Processing" in follow_up_text:
                        second_click_blocked_reason = "button_busy"
                    else:
                        second_click_attempted = True
                        self.driver.execute_script("arguments[0].click();", follow_up_button)
                except StaleElementReferenceException:
                    second_click_blocked_reason = "button_stale"
        return {
            "initial_text": initial_text,
            "busy_text": busy["text"],
            "disabled_after_click": bool(busy["disabled"]),
            "second_click_attempted": second_click_attempted,
            "second_click_blocked_reason": second_click_blocked_reason,
        }

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
