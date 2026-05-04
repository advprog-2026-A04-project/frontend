from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class LoginPage(BasePage):
    def load(self) -> None:
        self.open("/login")
        self.wait_for_text("Log in")

    def login(self, email: str, password: str) -> None:
        self.fill_css("input[type='email']", email)
        self.fill_css("input[type='password']", password)
        self.click_xpath("//button[contains(normalize-space(), 'Log In')]")

    def wait_for_success(self) -> None:
        self.wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Browse the newest limited drops.')]")))

    def email_value(self) -> str:
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[type='email']"))).get_attribute("value")

    def flash_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Registration successful')]"))
        ).text

    def error_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(@class,'rose-200') or contains(@class,'notice--danger')]"))
        ).text

    def wait_for_error(self) -> str:
        return self.error_text()
