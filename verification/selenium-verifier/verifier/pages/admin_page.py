from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class AdminPage(BasePage):
    def load(self) -> None:
        self.open("/admin")
        self.wait_for_text("Voucher management and order monitoring")

    def set_admin_token(self, token: str) -> None:
        self.fill_xpath_js("//label[.//span[normalize-space()='Voucher admin token']]//input", token)

    def refresh(self) -> None:
        self.click_xpath("//button[normalize-space()='Refresh admin data']")

    def fill_voucher_form(
        self,
        *,
        code: str | None = None,
        discount_value: int | None = None,
        quota_total: int | None = None,
        end_at: str | None = None,
    ) -> None:
        if code is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='Code']]//input", code)
        if discount_value is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='Discount value']]//input", str(discount_value))
        if quota_total is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='Quota total']]//input", str(quota_total))
        if end_at is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='End at']]//input", end_at)

    def submit_form(self, editing: bool = False) -> None:
        label = "Update voucher" if editing else "Create voucher"
        self.click_xpath(f"//button[normalize-space()='{label}']")
        if editing:
            self.wait.until(EC.visibility_of_element_located((By.XPATH, "//button[normalize-space()='Create voucher']")))

    def start_edit_voucher(self, code: str) -> None:
        self.click_xpath(
            f"//div[contains(@class,'service-panel')][.//strong[normalize-space()='{code}']]"
            "//button[normalize-space()='Edit']"
        )
        self.wait.until(EC.visibility_of_element_located((By.XPATH, "//button[normalize-space()='Update voucher']")))
        self.wait.until(
            lambda _driver: (
                self.driver.find_element(By.XPATH, "//label[.//span[normalize-space()='Code']]//input").get_attribute("value")
                == code
            )
        )

    def disable_voucher(self, code: str) -> None:
        self.click_xpath(
            f"//div[contains(@class,'service-panel')][.//strong[normalize-space()='{code}']]"
            "//button[normalize-space()='Disable']"
        )

    def has_voucher(self, code: str) -> bool:
        elements = self.driver.find_elements(
            By.XPATH,
            f"//div[contains(@class,'service-panel')][.//strong[normalize-space()='{code}']]",
        )
        return bool(elements)

    def wait_for_voucher(self, code: str) -> None:
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, f"//div[contains(@class,'service-panel')][.//strong[normalize-space()='{code}']]")
            )
        )

    def voucher_status_text(self, code: str) -> str:
        return self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    f"//div[contains(@class,'service-panel')][.//strong[normalize-space()='{code}']]"
                    "//span[contains(@class,'status-pill')]",
                )
            )
        ).text

    def wait_for_voucher_status(self, code: str, status: str) -> str:
        return self.wait.until(
            EC.text_to_be_present_in_element(
                (
                    By.XPATH,
                    f"//div[contains(@class,'service-panel')][.//strong[normalize-space()='{code}']]"
                    "//span[contains(@class,'status-pill')]",
                ),
                status,
            )
        )

    def wait_for_notice(self, text: str) -> str:
        element = self.wait.until(EC.visibility_of_element_located((By.XPATH, f"//*[contains(normalize-space(), '{text}')]")))
        return element.text
