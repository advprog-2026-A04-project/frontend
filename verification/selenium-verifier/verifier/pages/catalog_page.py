from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class CatalogPage(BasePage):
    def load(self) -> None:
        self.open("/products")
        self.wait_for_text("Browse demo-ready products")

    def product_cards(self):
        return self.wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".product-card")))

    def card_count(self) -> int:
        return len(self.product_cards())

    def open_product_by_name(self, name: str) -> None:
        self.click_xpath(
            "//article[contains(@class,'product-card')]"
            f"[.//h3[contains(normalize-space(), \"{name}\")]]//a[normalize-space()='View details']"
        )

    def open_first_product(self) -> None:
        self.click_xpath("(//article[contains(@class,'product-card')]//a[normalize-space()='View details'])[1]")
