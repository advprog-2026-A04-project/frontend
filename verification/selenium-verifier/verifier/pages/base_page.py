from __future__ import annotations

from urllib.parse import urljoin, urlparse

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC


class BasePage:
    def __init__(self, driver, wait, base_url: str) -> None:
        self.driver = driver
        self.wait = wait
        self.base_url = base_url.rstrip("/")

    def open(self, path: str) -> None:
        self.driver.get(urljoin(f"{self.base_url}/", path.lstrip("/")))
        self.wait_for_ready()

    def wait_for_ready(self) -> None:
        self.wait.until(lambda browser: browser.execute_script("return document.readyState") == "complete")

    def wait_for_text(self, text: str):
        return self.wait.until(
            EC.visibility_of_element_located((By.XPATH, f"//*[contains(normalize-space(), \"{text}\")]"))
        )

    def wait_for_path(self, expected_path: str):
        return self.wait.until(lambda _driver: self.current_path() == expected_path)

    def click_xpath(self, xpath: str):
        element = self.wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        element.click()
        return element

    def click_css(self, css: str):
        element = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, css)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        element.click()
        return element

    def click_xpath_js(self, xpath: str):
        element = self.wait.until(EC.visibility_of_element_located((By.XPATH, xpath)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        self.driver.execute_script("arguments[0].click();", element)
        return element

    def click_css_js(self, css: str):
        element = self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, css)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        self.driver.execute_script("arguments[0].click();", element)
        return element

    def fill_css(self, css: str, value: str):
        field = self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, css)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", field)
        field.click()
        field.send_keys(Keys.CONTROL, "a")
        field.send_keys(value)
        return field

    def fill_xpath(self, xpath: str, value: str):
        field = self.wait.until(EC.visibility_of_element_located((By.XPATH, xpath)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", field)
        field.click()
        field.send_keys(Keys.CONTROL, "a")
        field.send_keys(value)
        return field

    def fill_xpath_js(self, xpath: str, value: str):
        field = self.wait.until(EC.visibility_of_element_located((By.XPATH, xpath)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", field)
        self.driver.execute_script(
            """
            const element = arguments[0];
            const value = arguments[1];
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
            descriptor.set.call(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            """,
            field,
            value,
        )
        return field

    def nav_to(self, label: str):
        return self.click_xpath(f"//a[normalize-space()='{label}']")

    def current_path(self) -> str:
        return urlparse(self.driver.current_url).path

    def current_url(self) -> str:
        return self.driver.current_url

    def refresh(self) -> None:
        self.driver.refresh()
        self.wait_for_ready()

    def local_storage_value(self, key: str):
        return self.driver.execute_script("return window.localStorage.getItem(arguments[0]);", key)

    def local_storage_has_key(self, key: str) -> bool:
        return self.local_storage_value(key) is not None

    def wait_for_local_storage_key(self, key: str):
        return self.wait.until(lambda _driver: self.local_storage_value(key))

    def wait_for_local_storage_absent(self, key: str):
        return self.wait.until(lambda _driver: self.local_storage_value(key) is None)

    def user_chip_text(self) -> str:
        return self.driver.execute_script(
            """
            const raw = window.localStorage.getItem('json.sessionUser');
            if (!raw) return '';
            try {
              const user = JSON.parse(raw);
              return [user.email, user.username, user.role].filter(Boolean).join(' ');
            } catch {
              return raw;
            }
            """
        )

    def logout(self) -> None:
        self.driver.execute_script(
            """
            window.localStorage.removeItem('json.sessionToken');
            window.localStorage.removeItem('json.sessionUser');
            """
        )
        self.open("/")
