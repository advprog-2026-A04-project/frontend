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

    def list_my_active(self, token: str, **kwargs):
        return self.request(
            "GET",
            "/orders/my/active",
            headers={"Authorization": f"Bearer {token}"},
            expected_status=200,
            **kwargs,
        )

    def list_jastiper(self, token: str, **kwargs):
        return self.request(
            "GET",
            "/orders/jastiper",
            headers={"Authorization": f"Bearer {token}"},
            expected_status=200,
            **kwargs,
        )

    def list_admin(self, token: str, **kwargs):
        return self.request(
            "GET",
            "/orders/admin",
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

    def update_status(self, order_id: int, token: str, next_status: str, **kwargs):
        return self.request(
            "PATCH",
            f"/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json_body={"nextStatus": next_status},
            expected_status=(200, 400, 403, 409),
            **kwargs,
        )

    def cancel(self, order_id: int, token: str, **kwargs):
        return self.request(
            "POST",
            f"/orders/{order_id}/cancel",
            headers={"Authorization": f"Bearer {token}"},
            expected_status=(200, 403, 409),
            **kwargs,
        )

    def submit_rating(self, order_id: int, token: str, payload: dict, **kwargs):
        return self.request(
            "POST",
            f"/orders/{order_id}/rating",
            headers={"Authorization": f"Bearer {token}"},
            json_body=payload,
            expected_status=(201, 403, 409),
            **kwargs,
        )
