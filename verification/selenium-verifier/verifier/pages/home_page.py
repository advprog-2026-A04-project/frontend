from __future__ import annotations

from .base_page import BasePage


class HomePage(BasePage):
    def load(self) -> None:
        self.open("/")
        self.wait_for_text("Secure hype drops through the newer JSON storefront.")

    def start_register(self) -> None:
        self.click_xpath("//a[normalize-space()='Create Account' or normalize-space()='Register']")

    def start_login(self) -> None:
        self.click_xpath("//a[normalize-space()='Log In']")
