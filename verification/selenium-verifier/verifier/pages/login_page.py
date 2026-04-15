from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class LoginPage(BasePage):
    def load(self) -> None:
        self.open("/login")
        self.wait_for_text("Log in to continue")

    def login(self, email: str, password: str) -> None:
        self.fill_css("input[type='email']", email)
        self.fill_css("input[type='password']", password)
        self.click_xpath("//button[normalize-space()='Log in']")

    def wait_for_success(self) -> None:
        self.wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(normalize-space(), 'Browse demo-ready products')]")))
