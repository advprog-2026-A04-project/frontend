from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class RegisterPage(BasePage):
    def load(self) -> None:
        self.open("/register")
        self.wait_for_text("Create a buyer account")
        self.pause_checkpoint("register_loaded")

    def register(self, email: str, username: str, password: str) -> None:
        self.fill_css("input[name='email']", email)
        self.fill_css("input[name='username']", username)
        self.fill_css("input[name='password']", password)
        self.click_css_js("button[type='submit']")

    def error_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(@class,'rose-200') or contains(@class,'notice--danger')]")
            )
        ).text
