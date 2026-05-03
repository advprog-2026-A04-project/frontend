from __future__ import annotations

from .base_page import BasePage


class HomePage(BasePage):
    def load(self) -> None:
        self.open("/")
        self.wait_for_text("Teammate frontend, live services, full order lifecycle.")

    def start_register(self) -> None:
        self.click_xpath("//a[normalize-space()='Create account' or normalize-space()='Register']")

    def start_login(self) -> None:
        self.click_xpath("//a[normalize-space()='Log in']")
