from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class ResultPage(BasePage):
    def wait_loaded(self) -> None:
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(normalize-space(), 'Order Created') or contains(normalize-space(), 'Order Detail')]")
            )
        )
        self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".card--hero h1")))

    def flash_text(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".notice"))).text

    def order_id(self) -> int:
        parsed = urlparse(self.driver.current_url)
        if parsed.path.rstrip("/").split("/")[-1].isdigit():
            return int(parsed.path.rstrip("/").split("/")[-1])
        query_value = parse_qs(parsed.query).get("orderId", [])
        if query_value:
            return int(query_value[0])
        raise AssertionError("Order id was not found in URL.")

    def status_text(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".status-pill"))).text

    def total_paid_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[normalize-space()='Total paid']/following-sibling::*[1]"))
        ).text

    def voucher_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[normalize-space()='Voucher']/following-sibling::*[1]"))
        ).text

    def back_to_orders(self) -> None:
        self.click_xpath("//a[contains(normalize-space(), 'Back to Orders')]")

    def submit_rating(self, product_rating: int, jastiper_rating: int, comment: str) -> None:
        self.fill_xpath("//label[.//span[normalize-space()='Product rating']]//input", str(product_rating))
        self.fill_xpath("//label[.//span[normalize-space()='Jastiper rating']]//input", str(jastiper_rating))
        self.fill_css("textarea", comment)
        self.click_xpath("//button[contains(normalize-space(), 'Submit Rating')]")

    def wait_for_rating_success(self) -> str:
        element = self.wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Rating submitted.')]")))
        return element.text

    def has_refund_notice(self) -> bool:
        elements = self.driver.find_elements(By.XPATH, "//*[contains(normalize-space(), 'Refund has already been recorded')]")
        return bool(elements)
