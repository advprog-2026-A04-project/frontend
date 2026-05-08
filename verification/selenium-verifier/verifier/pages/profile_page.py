from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class ProfilePage(BasePage):
    def load(self) -> None:
        self.open("/profile")
        self.wait_for_text("Profile")
        self.pause_checkpoint("profile_loaded")

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

    def identity_text(self) -> str:
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//article[.//p[normalize-space()='Profile']]//p[contains(normalize-space(), '@')]"))
        ).text

    def set_username(self, username: str) -> None:
        self.fill_xpath("//label[.//span[normalize-space()='Username']]//input", username)

    def set_full_name(self, full_name: str) -> None:
        self.fill_xpath("//label[.//span[normalize-space()='Full name']]//input", full_name)

    def save_profile(self) -> None:
        self.pause_checkpoint("profile_ready_to_save")
        self.click_xpath("//button[contains(normalize-space(), 'Save Profile')]")

    def wait_for_notice(self, text: str) -> str:
        notice = self.wait.until(EC.visibility_of_element_located((By.XPATH, f"//*[contains(normalize-space(), \"{text}\")]")))
        self.pause_checkpoint("profile_notice_visible")
        return notice.text

    def update_profile(self, username: str, full_name: str) -> None:
        self.set_username(username)
        self.set_full_name(full_name)
        self.save_profile()

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
