from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class JastiperOrdersPage(BasePage):
    def load(self) -> None:
        self.open("/jastiper/orders")
        self.wait_for_text("Process active orders")

    def has_order(self, order_id: int) -> bool:
        elements = self.driver.find_elements(
            By.XPATH,
            f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]",
        )
        return bool(elements)

    def click_transition(self, order_id: int, next_status_label: str) -> None:
        self.click_xpath(
            f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]"
            f"//button[normalize-space()='Mark {next_status_label}']"
        )

    def cancel_order(self, order_id: int) -> None:
        self.click_xpath(
            f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]"
            "//button[normalize-space()='Cancel']"
        )

    def wait_for_notice(self, text: str) -> str:
        element = self.wait.until(EC.visibility_of_element_located((By.XPATH, f"//*[contains(normalize-space(), '{text}')]")))
        return element.text
