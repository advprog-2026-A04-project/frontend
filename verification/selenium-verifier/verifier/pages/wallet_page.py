from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class WalletPage(BasePage):
    def load(self) -> None:
        self.open("/wallet")
        self.wait_for_text("Request balance top up")
        self.pause_checkpoint("wallet_loaded")

    def balance_text(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".card--hero h1"))).text

    def top_up(self, amount: int) -> None:
        self.fill_xpath_js("//article[.//h2[normalize-space()='Request balance top up']]//input[@type='number']", str(amount))
        self.click_xpath("//button[contains(normalize-space(), 'Top Up Wallet')]")

    def wait_for_top_up_request(self) -> tuple[int, str]:
        element = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'pending admin verification')]"))
        )
        text = element.text
        marker = "Top-up request "
        request_id = int(text.split(marker, 1)[1].split(" ", 1)[0])
        self.pause_checkpoint("wallet_topup_success")
        return request_id, text

    def wait_for_top_up_success(self) -> str:
        return self.wait_for_top_up_request()[1]

    def withdraw(self, amount: int, destination: str) -> None:
        self.fill_xpath_js("//article[.//h2[normalize-space()='Request balance withdrawal']]//input[@type='number']", str(amount))
        self.fill_xpath_js("//article[.//h2[normalize-space()='Request balance withdrawal']]//input[@type='text']", destination)
        self.click_xpath("//button[contains(normalize-space(), 'Request Withdrawal')]")

    def wait_for_withdrawal_request(self) -> tuple[int, str]:
        element = self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Withdrawal request') and contains(normalize-space(), 'pending admin verification')]"))
        )
        text = element.text
        marker = "Withdrawal request "
        request_id = int(text.split(marker, 1)[1].split(" ", 1)[0])
        self.pause_checkpoint("wallet_withdrawal_request")
        return request_id, text

    def transaction_types(self) -> list[str]:
        return [
            element.text.strip()
            for element in self.driver.find_elements(By.XPATH, "//article[.//h2[contains(normalize-space(),'Wallet transaction history')]]//h3")
            if element.text.strip()
        ]

    def has_transaction_type(self, txn_type: str) -> bool:
        return txn_type in self.transaction_types()
