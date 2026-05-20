from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class TestUser:
    email: str
    username: str
    password: str
    user_id: int | None = None
    token: str | None = None


@dataclass(frozen=True)
class VoucherInfo:
    code: str
    discount_type: str
    discount_value: Decimal
    min_spend: Decimal
    quota_remaining: int
    raw: dict[str, Any]


@dataclass(frozen=True)
class ProductInfo:
    product_id: str
    name: str
    price: Decimal
    stock: int
    jastiper_id: str | None
    raw: dict[str, Any]


@dataclass(frozen=True)
class CheckoutState:
    stock: int
    wallet_balance: Decimal
    voucher_quota: int | None
    order_count: int
    orders: list[dict[str, Any]]


@dataclass(frozen=True)
class ConcurrencyOutcome:
    name: str
    verdict: str
    worker_count: int
    before: dict[str, Any]
    after: dict[str, Any]
    result_counts: dict[str, int]
    limitations: list[str]
