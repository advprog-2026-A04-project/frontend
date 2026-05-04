from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from .models import CheckoutState, ProductInfo, TestUser, VoucherInfo
from .utils import normalize_code


class SetupHelper:
    def __init__(self, settings, services) -> None:
        self.settings = settings
        self.services = services

    def new_user(self, prefix: str) -> TestUser:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        email = f"{prefix}-{timestamp}@json.app"
        return TestUser(email=email, username=f"{prefix}{timestamp}", password="Audit123!")

    def login_existing_user_api(
        self,
        email: str,
        password: str,
        evidence=None,
        evidence_name: str | None = None,
    ) -> TestUser:
        response = self.services.auth.login(
            email,
            password,
            evidence=evidence,
            evidence_name=evidence_name,
        )
        payload = response.payload
        return TestUser(
            email=payload["email"],
            username=payload["username"],
            password=password,
            user_id=int(payload["id"]),
            token=payload["token"],
        )

    def register_user_api(self, user: TestUser, evidence=None, evidence_name: str | None = None) -> TestUser:
        response = self.services.auth.register(
            user.email,
            user.username,
            user.password,
            evidence=evidence,
            evidence_name=evidence_name,
        )
        payload = response.payload
        return TestUser(
            email=user.email,
            username=user.username,
            password=user.password,
            user_id=int(payload["id"]),
            token=payload["token"],
        )

    def login_user_api(self, user: TestUser, evidence=None, evidence_name: str | None = None) -> TestUser:
        response = self.services.auth.login(
            user.email,
            user.password,
            evidence=evidence,
            evidence_name=evidence_name,
        )
        payload = response.payload
        return TestUser(
            email=user.email,
            username=payload.get("username") or user.username,
            password=user.password,
            user_id=int(payload["id"]),
            token=payload["token"],
        )

    def choose_product(
        self,
        token: str,
        preferred_jastiper_id: int | str | None = None,
        evidence=None,
        evidence_name: str | None = None,
    ) -> ProductInfo:
        if self.settings.default_product_id:
            response = self.services.inventory.get_product(
                token,
                self.settings.default_product_id,
                evidence=evidence,
                evidence_name=evidence_name or "product_default",
            )
            payload = response.payload
            return ProductInfo(
                product_id=payload["id"],
                name=payload["name"],
                price=Decimal(str(payload["price"])),
                stock=int(payload["stock"]),
                jastiper_id=payload.get("jastiperId"),
                raw=payload,
            )

        response = self.services.inventory.search(
            token,
            evidence=evidence,
            evidence_name=evidence_name or "product_search",
        )
        products = response.payload
        if not products:
            raise AssertionError("Inventory search returned no products.")

        preferred = str(preferred_jastiper_id) if preferred_jastiper_id is not None else None
        sorted_products = sorted(products, key=lambda item: int(item.get("stock") or 0), reverse=True)
        viable = None
        if preferred:
            viable = next(
                (
                    item
                    for item in sorted_products
                    if str(item.get("jastiperId") or "") == preferred and int(item["stock"]) >= 1
                ),
                None,
            )

        if viable is None:
            viable = next((item for item in sorted_products if int(item["stock"]) >= 1), sorted_products[0])

        return ProductInfo(
            product_id=viable["id"],
            name=viable["name"],
            price=Decimal(str(viable["price"])),
            stock=int(viable["stock"]),
            jastiper_id=viable.get("jastiperId"),
            raw=viable,
        )

    def ensure_voucher(
        self,
        order_amount: Decimal,
        evidence=None,
        evidence_name: str | None = None,
        force_create: bool = False,
    ) -> VoucherInfo:
        active_response = self.services.voucher.active(
            evidence=evidence,
            evidence_name=evidence_name or "voucher_active",
        )
        active = active_response.payload or []
        preferred_code = normalize_code(self.settings.default_voucher_code)

        def to_voucher(item: dict[str, Any]) -> VoucherInfo:
            return VoucherInfo(
                code=item["code"],
                discount_type=str(item["discountType"]),
                discount_value=Decimal(str(item["discountValue"])),
                min_spend=Decimal(str(item.get("minSpend") or 0)),
                quota_remaining=int(item.get("quotaRemaining") or 0),
                raw=item,
            )

        if not force_create:
            for item in active:
                voucher = to_voucher(item)
                if preferred_code and voucher.code == preferred_code and voucher.quota_remaining > 1 and voucher.min_spend <= order_amount:
                    return voucher

            for item in active:
                voucher = to_voucher(item)
                if voucher.quota_remaining > 1 and voucher.min_spend <= order_amount:
                    return voucher

        if not self.settings.voucher_admin_token:
            raise AssertionError(
                "No usable active voucher exists and VOUCHER_ADMIN_TOKEN is not configured. "
                "Voucher setup is a deployment prerequisite."
            )

        code = f"AUDIT{datetime.utcnow().strftime('%H%M%S%f')}"
        now = datetime.utcnow()
        create_body = {
            "code": code,
            "discountType": "PERCENT",
            "discountValue": 10.00,
            "startAt": (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S"),
            "endAt": (now + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S"),
            "minSpend": 0.00,
            "quotaTotal": 50,
        }
        create_response = self.services.voucher.create_admin(
            self.settings.voucher_admin_token,
            create_body,
            evidence=evidence,
            evidence_name="voucher_created",
        )
        payload = create_response.payload
        return VoucherInfo(
            code=payload["code"],
            discount_type=str(payload["discountType"]),
            discount_value=Decimal(str(payload["discountValue"])),
            min_spend=Decimal(str(payload.get("minSpend") or 0)),
            quota_remaining=int(payload["quotaRemaining"]),
            raw=payload,
        )

    def capture_state(self, user: TestUser, product_id: str, voucher_code: str | None, evidence=None, prefix: str = "state") -> CheckoutState:
        inventory_payload = self.services.inventory.get_product(
            user.token,
            product_id,
            evidence=evidence,
            evidence_name=f"{prefix}_product",
        ).payload
        wallet_payload = self.services.wallet.get_balance(
            user.user_id,
            token=user.token,
            evidence=evidence,
            evidence_name=f"{prefix}_wallet",
        ).payload
        orders_payload = self.services.order.list_my(
            user.token,
            evidence=evidence,
            evidence_name=f"{prefix}_orders",
        ).payload["data"]

        voucher_quota = None
        if voucher_code:
            active_payload = self.services.voucher.active(
                evidence=evidence,
                evidence_name=f"{prefix}_voucher_active",
            ).payload
            for voucher in active_payload:
                if normalize_code(voucher["code"]) == normalize_code(voucher_code):
                    voucher_quota = int(voucher.get("quotaRemaining") or 0)
                    break

        return CheckoutState(
            stock=int(inventory_payload["stock"]),
            wallet_balance=Decimal(str(wallet_payload["balance"])),
            voucher_quota=voucher_quota,
            order_count=len(orders_payload),
            orders=orders_payload,
        )

    def top_up_to_balance(self, user: TestUser, target_balance: Decimal, evidence=None, prefix: str = "topup") -> dict[str, Any]:
        current_balance = Decimal(
            str(
                self.services.wallet.get_balance(
                    user.user_id,
                    token=user.token,
                    evidence=evidence,
                    evidence_name=f"{prefix}_before",
                ).payload["balance"]
            )
        )
        if current_balance >= target_balance:
            return {"before": current_balance, "after": current_balance, "requestId": None, "topUpAmount": Decimal("0")}

        amount = target_balance - current_balance
        top_up_response = self.services.wallet.top_up(
            user.user_id,
            amount,
            user.token,
            evidence=evidence,
            evidence_name=f"{prefix}_request",
        ).payload
        request_id = int(top_up_response["requestId"])
        self.services.wallet.mark_top_up_success(
            request_id,
            token=user.token,
            evidence=evidence,
            evidence_name=f"{prefix}_mark_success",
        )
        after_balance = Decimal(
            str(
                self.services.wallet.get_balance(
                    user.user_id,
                    token=user.token,
                    evidence=evidence,
                    evidence_name=f"{prefix}_after",
                ).payload["balance"]
            )
        )
        return {
            "before": current_balance,
            "after": after_balance,
            "requestId": request_id,
            "topUpAmount": amount,
        }

    def expected_total(self, subtotal: Decimal, voucher: VoucherInfo | None, evidence=None) -> dict[str, Any]:
        validation = None
        discount = Decimal("0")

        if voucher and self.settings.internal_api_token:
            validation = self.services.voucher.validate(
                voucher.code,
                float(subtotal),
                self.settings.internal_api_token,
                evidence=evidence,
                evidence_name="voucher_validate",
            ).payload
            discount = Decimal(str(validation.get("discountAmount") or 0))
        elif voucher and voucher.discount_type == "PERCENT":
            discount = (subtotal * voucher.discount_value / Decimal("100")).quantize(Decimal("1"))
        elif voucher:
            discount = voucher.discount_value

        total_paid = subtotal - discount
        if total_paid < 0:
            total_paid = Decimal("0")

        return {
            "subtotal": subtotal,
            "discount": discount,
            "total_paid": total_paid,
            "validation": validation,
        }

    def checkout_body(self, product_id: str, quantity: int, voucher_code: str | None) -> dict[str, Any]:
        return {
            "address": self.settings.shipping_address,
            "voucherCode": voucher_code,
            "items": [{"productId": product_id, "qty": quantity}],
        }

    def as_dict(self, value: Any) -> Any:
        if hasattr(value, "__dataclass_fields__"):
            return asdict(value)
        return value
