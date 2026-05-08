from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class OrdersPage(BasePage):
    def load(self) -> None:
        self.open("/orders")
        self.wait_for_text("Track your active and completed orders.")
        self.pause_checkpoint("orders_loaded")

    def order_ids(self) -> list[int]:
        cards = self.wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".order-card")))
        order_ids = []
        for card in cards:
            text = card.text
            for line in text.splitlines():
                if "Order #" in line:
                    order_ids.append(int(line.split("#", 1)[1].strip()))
                    break
        return order_ids

    def has_order(self, order_id: int) -> bool:
        return order_id in self.order_ids()

    def open_order(self, order_id: int) -> None:
        self.click_xpath(
            f"//article[contains(@class,'order-card')][contains(normalize-space(), 'Order #{order_id}')]//a[contains(normalize-space(), 'Open Detail')]"
        )
