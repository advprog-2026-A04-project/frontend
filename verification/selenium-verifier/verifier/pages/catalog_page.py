from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class CatalogPage(BasePage):
    def load(self) -> None:
        self.open("/products")
        self.wait_for_text("Browse the newest limited drops.")

    def load_browse(self) -> None:
        self.open("/browse")
        self.wait_for_text("Browse the newest limited drops.")

    def product_cards(self):
        return self.wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".product-card")))

    def card_count(self) -> int:
        return len(self.product_cards())

    def search(self, query: str) -> None:
        self.fill_css("input[placeholder^='Search limited items']", query)
        self.wait.until(
            lambda _driver: self.driver.find_element(By.CSS_SELECTOR, "input[placeholder^='Search limited items']").get_attribute("value")
            == query
        )

    def visible_product_names(self) -> list[str]:
        return [
            element.text.strip()
            for element in self.wait.until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".product-card h3"))
            )
            if element.text.strip()
        ]

    def category_labels(self) -> list[str]:
        return [
            element.text.strip()
            for element in self.driver.find_elements(By.XPATH, "//button[@type='button']")
            if element.text.strip()
        ]

    def select_category(self, label: str) -> None:
        self.click_xpath_js(f"//button[@type='button'][normalize-space()='{label}']")

    def open_product_by_name(self, name: str) -> None:
        link = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//article[contains(@class,'product-card')]"
                    f"[.//h3[contains(normalize-space(), \"{name}\")]]//a[contains(normalize-space(), 'View details')]",
                )
            )
        )
        self.driver.get(link.get_attribute("href"))

    def open_first_product(self) -> None:
        link = self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "(//article[contains(@class,'product-card')]//a[contains(normalize-space(), 'View details')])[1]")
            )
        )
        self.driver.get(link.get_attribute("href"))
