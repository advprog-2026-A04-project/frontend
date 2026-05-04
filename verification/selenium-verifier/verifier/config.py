from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv


load_dotenv()


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value


def _env_bool(name: str, default: bool) -> bool:
    value = _env(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = _env(name)
    return int(value) if value is not None else default


@dataclass(frozen=True)
class Settings:
    frontend_base_url: str
    auth_base_url: str
    inventory_base_url: str
    wallet_base_url: str
    order_base_url: str
    voucher_base_url: str
    buyer_email: str | None
    buyer_password: str | None
    jastiper_email: str | None
    jastiper_password: str | None
    admin_email: str | None
    admin_password: str | None
    voucher_admin_token: str | None
    internal_api_token: str | None
    browser: str
    headless: bool
    default_topup_amount: int
    default_product_id: str | None
    default_voucher_code: str | None
    shipping_address: str
    artifacts_root: Path
    concurrency_workers: int
    concurrency_product_id: str | None
    auto_detect_frontend_origin: bool

    @property
    def frontend_origin(self) -> str:
        parsed = urlparse(self.frontend_base_url)
        return f"{parsed.scheme}://{parsed.netloc}"

    def require(self, *names: str) -> None:
        missing = [name for name in names if not getattr(self, name)]
        if missing:
            raise RuntimeError(f"Missing required settings: {', '.join(missing)}")


def load_settings() -> Settings:
    return Settings(
        frontend_base_url=_env(
            "FRONTEND_BASE_URL",
            "https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app",
        ),
        auth_base_url=_env(
            "AUTH_BASE_URL",
            "https://auth-profile-api-osvihgaoya-uc.a.run.app",
        ),
        inventory_base_url=_env(
            "INVENTORY_BASE_URL",
            "https://inventory-api-osvihgaoya-uc.a.run.app",
        ),
        wallet_base_url=_env(
            "WALLET_BASE_URL",
            "https://wallet-api-osvihgaoya-uc.a.run.app",
        ),
        order_base_url=_env(
            "ORDER_BASE_URL",
            "https://order-api-osvihgaoya-uc.a.run.app",
        ),
        voucher_base_url=_env(
            "VOUCHER_BASE_URL",
            "https://voucher-promo-api-osvihgaoya-uc.a.run.app",
        ),
        buyer_email=_env("BUYER_EMAIL", "demo@json.app"),
        buyer_password=_env("BUYER_PASSWORD", "Demo123!"),
        jastiper_email=_env("JASTIPER_EMAIL", "jastiper3@json.app"),
        jastiper_password=_env("JASTIPER_PASSWORD", "Demo123!"),
        admin_email=_env("ADMIN_EMAIL", "admin@json.app"),
        admin_password=_env("ADMIN_PASSWORD", "Demo123!"),
        voucher_admin_token=_env("VOUCHER_ADMIN_TOKEN"),
        internal_api_token=_env("INTERNAL_API_TOKEN"),
        browser=_env("BROWSER", "edge"),
        headless=_env_bool("HEADLESS", False),
        default_topup_amount=_env_int("DEFAULT_TOPUP_AMOUNT", 1_000_000),
        default_product_id=_env("DEFAULT_PRODUCT_ID"),
        default_voucher_code=_env("DEFAULT_VOUCHER_CODE", "MILESTONE10"),
        shipping_address=_env("SHIPPING_ADDRESS", "Jl. Mawar No. 1, Jakarta"),
        artifacts_root=Path(_env("ARTIFACTS_ROOT", "verification-artifacts")),
        concurrency_workers=_env_int("CONCURRENCY_WORKERS", 25),
        concurrency_product_id=_env("CONCURRENCY_PRODUCT_ID") or _env("DEFAULT_PRODUCT_ID"),
        auto_detect_frontend_origin=_env_bool("AUTO_DETECT_FRONTEND_ORIGIN", True),
    )
