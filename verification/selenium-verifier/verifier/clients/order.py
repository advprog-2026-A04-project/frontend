from __future__ import annotations

from .base import BaseApiClient


class OrderClient(BaseApiClient):
    def health(self, **kwargs):
        return self.request("GET", "/actuator/health", expected_status=200, **kwargs)

    def list_my(self, token: str, **kwargs):
        return self.request(
            "GET",
            "/orders/my",
            headers={"Authorization": f"Bearer {token}"},
            expected_status=200,
            **kwargs,
        )

    def detail(self, order_id: int, token: str, **kwargs):
        return self.request(
            "GET",
            f"/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"},
            expected_status=200,
            **kwargs,
        )

    def checkout(self, token: str, body: dict, **kwargs):
        return self.request(
            "POST",
            "/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json_body=body,
            expected_status=(201, 409),
            **kwargs,
        )
