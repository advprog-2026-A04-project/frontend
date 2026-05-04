from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class ProfilePage(BasePage):
    def load(self) -> None:
        self.open("/profile")
        self.wait_for_text("Profile")

    def heading_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//article[.//p[normalize-space()='Profile']]//h1"))
        ).text

    def role_badge_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//article[.//p[normalize-space()='Profile']]"
                    "//span[contains(@class,'text-cyan') and not(contains(normalize-space(),'Milestone'))][1]",
                )
            )
        ).text

    def has_card(self, title: str) -> bool:
        elements = self.driver.find_elements(
            By.XPATH,
            f"//*[self::a or self::button][.//h2[normalize-space()='{title}']]",
        )
        return bool(elements)

    def open_card(self, title: str) -> None:
        self.click_xpath(f"//*[self::a or self::button][.//h2[normalize-space()='{title}']]")

    def logout_via_ui(self) -> None:
        self.click_xpath("//button[.//h2[normalize-space()='Logout']]")
