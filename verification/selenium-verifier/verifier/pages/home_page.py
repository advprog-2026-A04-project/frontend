from __future__ import annotations

from .base_page import BasePage


class HomePage(BasePage):
    def load(self) -> None:
        self.open("/")
        self.wait_for_text("Milestone 25% and 50% with the real services.")

    def start_register(self) -> None:
        self.click_xpath("//a[normalize-space()='Start with register']")

    def start_login(self) -> None:
        self.click_xpath("//a[normalize-space()='Sign in' or normalize-space()='Log in']")
