from __future__ import annotations

from selenium.webdriver.common.by import By

from .base_page import BasePage


class HomePage(BasePage):
    def load(self) -> None:
        self.open("/")
        self.wait_for_text("Secure hype drops through the newer JSON storefront.")
        self.pause_checkpoint("home_loaded")

    def start_register(self) -> None:
        self.click_xpath("//a[normalize-space()='Create Account' or normalize-space()='Register']")

    def start_login(self) -> None:
        self.click_xpath("//a[normalize-space()='Log In']")

    def featured_card_count(self) -> int:
        elements = self.wait.until(
            lambda driver: driver.find_elements(By.CSS_SELECTOR, ".product-card")
            or driver.find_elements(
                By.XPATH,
                "//*[contains(normalize-space(),'No products were returned by Inventory.')]",
            )
            or False
        )
        return len(
            [
                element
                for element in elements
                if "product-card" in (element.get_attribute("class") or "")
            ]
        )

    def service_health_count(self) -> int:
        xpath = "//h2[contains(normalize-space(),'Deployed integration snapshot')]/ancestor::section[1]//article"
        cards = self.wait.until(lambda driver: driver.find_elements(By.XPATH, xpath) or False)
        return len(cards)

    def open_featured_catalog(self) -> None:
        self.click_xpath("//a[normalize-space()='View all']")
