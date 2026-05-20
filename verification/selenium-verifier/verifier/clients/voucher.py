from __future__ import annotations

from .base import BaseApiClient


class VoucherClient(BaseApiClient):
    def health(self, **kwargs):
        return self.request("GET", "/health", expected_status=200, **kwargs)

    def active(self, **kwargs):
        return self.request("GET", "/vouchers/active", expected_status=200, **kwargs)

    def validate(self, code: str, order_amount: float, internal_token: str, **kwargs):
        return self.request(
            "POST",
            "/vouchers/validate",
            headers={"X-Internal-Token": internal_token},
            json_body={"code": code, "orderAmount": float(order_amount)},
            expected_status=200,
            **kwargs,
        )

    def claim(self, code: str, order_id: str, order_amount: float, buyer_id: int, internal_token: str, **kwargs):
        return self.request(
            "POST",
            "/vouchers/claim",
            headers={"X-Internal-Token": internal_token},
            json_body={
                "code": code,
                "orderId": str(order_id),
                "orderAmount": float(order_amount),
                "buyerId": buyer_id,
            },
            expected_status=200,
            **kwargs,
        )

    def list_admin(self, admin_token: str, status: str | None = None, expected_status: int | tuple[int, ...] = 200, **kwargs):
        params = {"status": status} if status else None
        return self.request(
            "GET",
            "/admin/vouchers",
            headers={"X-Admin-Token": admin_token},
            params=params,
            expected_status=expected_status,
            **kwargs,
        )

    def create_admin(self, admin_token: str, body: dict, expected_status: int | tuple[int, ...] = (200, 201), **kwargs):
        return self.request(
            "POST",
            "/admin/vouchers",
            headers={"X-Admin-Token": admin_token},
            json_body=body,
            expected_status=expected_status,
            **kwargs,
        )

    def update_admin(self, admin_token: str, voucher_id: int, body: dict, expected_status: int | tuple[int, ...] = 200, **kwargs):
        return self.request(
            "PUT",
            f"/admin/vouchers/{voucher_id}",
            headers={"X-Admin-Token": admin_token},
            json_body=body,
            expected_status=expected_status,
            **kwargs,
        )

    def disable_admin(self, admin_token: str, voucher_id: int, expected_status: int | tuple[int, ...] = (200, 204), **kwargs):
        return self.request(
            "POST",
            f"/admin/vouchers/{voucher_id}/disable",
            headers={"X-Admin-Token": admin_token},
            expected_status=expected_status,
            **kwargs,
        )
