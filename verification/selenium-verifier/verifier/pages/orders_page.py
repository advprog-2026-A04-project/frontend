from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class OrdersPage(BasePage):
    def load(self) -> None:
        self.open("/orders")
        self.wait_for_text("My checkout results")

    def order_ids(self) -> list[int]:
        headings = self.wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".order-card h2")))
        return [int(item.text.strip()) for item in headings]

    def has_order(self, order_id: int) -> bool:
        return order_id in self.order_ids()

    def open_order(self, order_id: int) -> None:
        self.click_xpath(
            f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]//a[contains(normalize-space(), 'Open result')]"
        )
