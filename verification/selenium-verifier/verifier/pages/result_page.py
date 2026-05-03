from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class ResultPage(BasePage):
    def wait_loaded(self) -> None:
        self.wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Order detail')]")))
        self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".card--hero h1")))

    def flash_text(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".notice"))).text

    def order_id(self) -> int:
        text = self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".card--hero h1"))).text
        return int(text.strip())

    def status_text(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".status-pill"))).text

    def total_paid_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class,'summary-row')][.//span[normalize-space()='Total paid']]//strong"))
        ).text

    def voucher_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//div[contains(@class,'summary-row')][.//span[normalize-space()='Voucher']]//strong"))
        ).text

    def back_to_orders(self) -> None:
        self.click_xpath("//a[normalize-space()='Back to orders']")

    def submit_rating(self, product_rating: int, jastiper_rating: int, comment: str) -> None:
        self.fill_xpath("//label[.//span[normalize-space()='Product rating']]//input", str(product_rating))
        self.fill_xpath("//label[.//span[normalize-space()='Jastiper rating']]//input", str(jastiper_rating))
        self.fill_css("textarea", comment)
        self.click_xpath("//button[normalize-space()='Submit rating']")

    def wait_for_rating_success(self) -> str:
        element = self.wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Rating submitted.')]")))
        return element.text

    def has_refund_notice(self) -> bool:
        elements = self.driver.find_elements(By.XPATH, "//*[contains(normalize-space(), 'Refund has already been recorded')]")
        return bool(elements)
