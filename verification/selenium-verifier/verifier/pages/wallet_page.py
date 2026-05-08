from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class WalletPage(BasePage):
    def load(self) -> None:
        self.open("/wallet")
        self.wait_for_text("Add balance instantly")
        self.pause_checkpoint("wallet_loaded")

    def balance_text(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".card--hero h1"))).text

    def top_up(self, amount: int) -> None:
        self.fill_css("input[type='number']", str(amount))
        self.click_xpath("//button[contains(normalize-space(), 'Top Up Wallet')]")

    def wait_for_top_up_success(self) -> str:
        element = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'was marked successful.')]"))
        )
        self.pause_checkpoint("wallet_topup_success")
        return element.text

    def transaction_types(self) -> list[str]:
        return [
            element.text.strip()
            for element in self.driver.find_elements(By.XPATH, "//article[.//h2[contains(normalize-space(),'Wallet transaction history')]]//h3")
            if element.text.strip()
        ]

    def has_transaction_type(self, txn_type: str) -> bool:
        return txn_type in self.transaction_types()
