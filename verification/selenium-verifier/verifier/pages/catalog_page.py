from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class CatalogPage(BasePage):
    CATEGORY_SECTION_XPATH = (
        "//section[contains(@class,'space-y-4')]"
        "[.//button[@type='button'][normalize-space()='All']]"
    )

    def load(self) -> None:
        self.open("/products")
        self.wait_for_text("Browse the newest limited drops.")
        self.pause_checkpoint("catalog_loaded")

    def load_browse(self) -> None:
        self.open("/browse")
        self.wait_for_text("Browse the newest limited drops.")
        self.pause_checkpoint("browse_catalog_loaded")

    def product_cards(self):
        return self.wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".product-card")))

    def category_buttons(self):
        return [
            element
            for element in self.driver.find_elements(
                By.XPATH,
                f"{self.CATEGORY_SECTION_XPATH}//button[@type='button']",
            )
            if element.text.strip()
        ]

    def card_count(self) -> int:
        return len(self.product_cards())

    def search(self, query: str) -> None:
        field = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder^='Search limited items']"))
        )
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", field)
        self.driver.execute_script(
            """
            const element = arguments[0];
            const value = arguments[1];
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
            descriptor.set.call(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            """,
            field,
            query,
        )
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
        return [element.text.strip() for element in self.category_buttons()]

    def select_category(self, label: str) -> None:
        expected = label.strip()
        for button in self.category_buttons():
            if button.text.strip() == expected:
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
                self.driver.execute_script("arguments[0].click();", button)
                return
        raise AssertionError(f"Category button '{label}' was not found in the catalog filter controls.")

    def visible_category_badges(self) -> list[str]:
        return [
            element.text.strip()
            for element in self.driver.find_elements(
                By.XPATH,
                "//article[contains(@class,'product-card')]//span[contains(@class,'text-cyan') and not(contains(normalize-space(),'Stock '))]",
            )
            if element.text.strip()
        ]

    def wait_for_category_badges(self, label: str) -> list[str]:
        self.wait.until(
            lambda _driver: (
                len(self.visible_category_badges()) > 0
                and all(badge.strip().upper() == label.strip().upper() for badge in self.visible_category_badges())
            )
        )
        badges = self.visible_category_badges()
        self.pause_checkpoint("catalog_category_filtered")
        return badges

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
