from __future__ import annotations

from urllib.parse import urlparse

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class ProductDetailPage(BasePage):
    def wait_loaded(self) -> None:
        self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".detail-layout")))
        self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".detail-copy h1")))

    def product_name(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".detail-copy h1"))).text

    def price_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[normalize-space()='Price']/following-sibling::*[1]"))
        ).text

    def stock_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//span[contains(normalize-space(), 'Stock ')]"))
        ).text

    def product_id(self) -> str:
        return urlparse(self.driver.current_url).path.rstrip("/").split("/")[-1]

    def set_quantity(self, quantity: int) -> None:
        self.fill_css("input[type='number']", str(quantity))

    def click_buy_now(self) -> None:
        self.click_xpath("//button[contains(normalize-space(), 'Checkout Now')]")
