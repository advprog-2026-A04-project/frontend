from __future__ import annotations

import re
from decimal import Decimal


def parse_currency(value: str) -> Decimal:
    sign = "-" if "-" in value else ""
    digits = "".join(re.findall(r"\d+", value))
    if not digits:
        raise ValueError(f"Could not parse currency from {value!r}")
    return Decimal(f"{sign}{digits}")


def round_up_to_step(value: Decimal, step: Decimal) -> Decimal:
    if value <= 0:
        return Decimal("0")
    quotient, remainder = divmod(value, step)
    if remainder == 0:
        return value
    return (quotient + 1) * step


def normalize_code(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper()
    return normalized or None
