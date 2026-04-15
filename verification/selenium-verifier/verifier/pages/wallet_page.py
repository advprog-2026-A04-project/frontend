from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class WalletPage(BasePage):
    def load(self) -> None:
        self.open("/wallet")
        self.wait_for_text("Add balance instantly")

    def balance_text(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".card--hero h1"))).text

    def top_up(self, amount: int) -> None:
        self.fill_css("input[type='number']", str(amount))
        self.click_xpath("//button[normalize-space()='Top up wallet']")

    def wait_for_top_up_success(self) -> str:
        element = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Top-up completed.')]"))
        )
        return element.text
