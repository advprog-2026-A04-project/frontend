from __future__ import annotations

from decimal import Decimal

from .base import BaseApiClient


class WalletClient(BaseApiClient):
    def health(self, **kwargs):
        return self.request("GET", "/actuator/health", expected_status=200, **kwargs)

    def get_balance(self, user_id: int, token: str | None = None, internal_token: str | None = None, **kwargs):
        headers = self._auth_headers(token, internal_token)
        return self.request(
            "POST",
            "/wallet/balance",
            headers=headers,
            json_body={"userId": user_id},
            expected_status=200,
            **kwargs,
        )

    def top_up(self, user_id: int, amount: int | Decimal, token: str, **kwargs):
        return self.request(
            "POST",
            "/wallet/topup",
            headers={"Authorization": f"Bearer {token}"},
            json_body={"userId": user_id, "amount": float(amount)},
            expected_status=(200, 201),
            **kwargs,
        )

    def mark_top_up_success(self, request_id: int, token: str | None = None, internal_token: str | None = None, **kwargs):
        return self.request(
            "POST",
            f"/wallet/topup/{request_id}/mark-success",
            headers=self._auth_headers(token, internal_token),
            expected_status=200,
            **kwargs,
        )

    def deduct(self, user_id: int, order_id: int, amount: int | Decimal, internal_token: str, **kwargs):
        return self.request(
            "POST",
            "/wallet/deduct",
            headers={"X-Internal-Token": internal_token},
            json_body={"userId": user_id, "orderId": order_id, "amount": float(amount)},
            expected_status=(200, 409),
            **kwargs,
        )

    def refund(self, user_id: int, order_id: int, amount: int | Decimal, internal_token: str, **kwargs):
        return self.request(
            "POST",
            "/wallet/refund",
            headers={"X-Internal-Token": internal_token},
            json_body={"userId": user_id, "orderId": order_id, "amount": float(amount)},
            expected_status=200,
            **kwargs,
        )

    def _auth_headers(self, token: str | None, internal_token: str | None) -> dict[str, str]:
        if internal_token:
            return {"X-Internal-Token": internal_token}
        if token:
            return {"Authorization": f"Bearer {token}"}
        raise RuntimeError("Wallet call needs either a bearer token or an internal token.")
