from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class AdminPage(BasePage):
    def load(self) -> None:
        self.open("/admin")
        self.wait_for_text("Voucher management and order monitoring")
        self.pause_checkpoint("admin_loaded")

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
        start_at: str | None = None,
        end_at: str | None = None,
    ) -> None:
        if code is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='Code']]//input", code)
        if discount_value is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='Discount value']]//input", str(discount_value))
        if quota_total is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='Quota total']]//input", str(quota_total))
        if start_at is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='Start at']]//input", start_at)
        if end_at is not None:
            self.fill_xpath_js("//label[.//span[normalize-space()='End at']]//input", end_at)

    def clear_admin_token(self) -> None:
        self.fill_xpath_js("//label[.//span[normalize-space()='Voucher admin token']]//input", "")

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
        self.pause_checkpoint("admin_voucher_visible")

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
        self.pause_checkpoint("admin_notice_visible")
        return element.text

    def error_notice_text(self) -> str:
        text = self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(@class,'notice--danger') or contains(@class,'rose-200')]")
            )
        ).text
        self.pause_checkpoint("admin_error_visible")
        return text

    def order_card_count(self) -> int:
        return len(self.driver.find_elements(By.CSS_SELECTOR, ".order-card"))

    def has_order(self, order_id: int) -> bool:
        elements = self.driver.find_elements(
            By.XPATH,
            f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]",
        )
        return bool(elements)

    def open_order(self, order_id: int) -> None:
        self.click_xpath(
            f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]"
            "//a[contains(normalize-space(),'Open detail')]"
        )

    def wait_for_order(self, order_id: int) -> None:
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]")
            )
        )
        self.pause_checkpoint("admin_order_visible")

    def order_status_text(self, order_id: int) -> str:
        return self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]"
                    "//span[contains(@class,'status-pill')]",
                )
            )
        ).text

    def wait_for_order_status(self, order_id: int, expected: str) -> str:
        self.wait.until(lambda _driver: expected in self.order_status_text(order_id))
        self.pause_checkpoint("admin_order_status")
        return self.order_status_text(order_id)

    def click_transition(self, order_id: int, next_status_label: str) -> None:
        self.click_xpath(
            f"//article[contains(@class,'order-card')][.//h2[normalize-space()='{order_id}']]"
            f"//button[normalize-space()='Mark {next_status_label}']"
        )

    def logout_via_ui(self) -> None:
        self.click_xpath("//article[.//p[normalize-space()='Admin Console']]//button[normalize-space()='Logout']")

    def wait_for_user(self, email: str) -> None:
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, f"//article[contains(@class,'service-panel')][.//p[contains(normalize-space(), '{email}')]]")
            )
        )
        self.pause_checkpoint("admin_user_visible")

    def user_status_text(self, email: str) -> str:
        return self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    f"//article[contains(@class,'service-panel')][.//p[contains(normalize-space(), '{email}')]]"
                    "//span[contains(@class,'status-pill')]",
                )
            )
        ).text

    def click_user_action(self, email: str, label: str) -> None:
        self.click_xpath(
            f"//article[contains(@class,'service-panel')][.//p[contains(normalize-space(), '{email}')]]"
            f"//button[normalize-space()='{label}']"
        )

    def user_has_banned_notice(self, email: str) -> bool:
        elements = self.driver.find_elements(
            By.XPATH,
            f"//article[contains(@class,'service-panel')][.//p[contains(normalize-space(), '{email}')]]"
            "//*[contains(normalize-space(), 'User is banned.')]",
        )
        return bool(elements)

    def wait_for_user_status(self, email: str, expected: str) -> str:
        self.wait.until(lambda _driver: expected in self.user_status_text(email))
        self.pause_checkpoint("admin_user_status")
        return self.user_status_text(email)

    def wait_for_user_banned(self, email: str) -> None:
        self.wait.until(lambda _driver: self.user_has_banned_notice(email))
        self.pause_checkpoint("admin_user_banned")

    def wait_for_user_unbanned(self, email: str) -> None:
        self.wait.until(lambda _driver: not self.user_has_banned_notice(email))
        self.pause_checkpoint("admin_user_unbanned")

    def wait_for_topup_request(self, request_id: int, status: str | None = None) -> None:
        self._wait_for_wallet_request("Top-up", request_id, status)

    def wait_for_withdrawal_request(self, request_id: int, status: str | None = None) -> None:
        self._wait_for_wallet_request("Withdrawal", request_id, status)

    def mark_topup_success(self, request_id: int) -> None:
        self._click_wallet_request_action("Top-up", request_id, "Mark success")

    def mark_topup_failed(self, request_id: int) -> None:
        self._click_wallet_request_action("Top-up", request_id, "Mark failed")

    def mark_withdrawal_success(self, request_id: int) -> None:
        self._click_wallet_request_action("Withdrawal", request_id, "Mark success")

    def mark_withdrawal_failed(self, request_id: int) -> None:
        self._click_wallet_request_action("Withdrawal", request_id, "Mark failed")

    def _wait_for_wallet_request(self, kind: str, request_id: int, status: str | None) -> None:
        xpath = f"//article[contains(@class,'service-panel')][.//strong[normalize-space()='{kind} #{request_id}']]"
        self.wait.until(EC.visibility_of_element_located((By.XPATH, xpath)))
        if status is not None:
            self.wait.until(
                EC.text_to_be_present_in_element(
                    (By.XPATH, f"{xpath}//span[contains(@class,'status-pill')]"),
                    status,
                )
            )
        self.pause_checkpoint("admin_wallet_request_visible")

    def _click_wallet_request_action(self, kind: str, request_id: int, label: str) -> None:
        self.click_xpath(
            f"//article[contains(@class,'service-panel')][.//strong[normalize-space()='{kind} #{request_id}']]"
            f"//button[normalize-space()='{label}']"
        )
