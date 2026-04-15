from __future__ import annotations

from .base import BaseApiClient


class InventoryClient(BaseApiClient):
    def health(self, **kwargs):
        return self.request("GET", "/actuator/health", expected_status=200, **kwargs)

    def search(self, token: str, keyword: str | None = None, **kwargs):
        params = {"keyword": keyword} if keyword else None
        return self.request(
            "GET",
            "/api/products/search",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            expected_status=200,
            **kwargs,
        )

    def get_product(self, token: str, product_id: str, **kwargs):
        return self.request(
            "GET",
            f"/api/products/{product_id}",
            headers={"Authorization": f"Bearer {token}"},
            expected_status=200,
            **kwargs,
        )

    def get_inventory_internal(self, product_id: str, internal_token: str, **kwargs):
        return self.request(
            "GET",
            f"/api/products/inventory/{product_id}",
            headers={"X-Internal-Token": internal_token},
            expected_status=200,
            **kwargs,
        )

    def reduce_stock_internal(self, product_id: str, quantity: int, internal_token: str, **kwargs):
        return self.request(
            "PATCH",
            "/api/products/inventory/reduce-stock",
            headers={"X-Internal-Token": internal_token},
            json_body={"productId": product_id, "quantity": quantity},
            expected_status=(200, 409),
            **kwargs,
        )

    def restore_stock_internal(self, product_id: str, quantity: int, internal_token: str, **kwargs):
        return self.request(
            "PATCH",
            "/api/products/inventory/restore-stock",
            headers={"X-Internal-Token": internal_token},
            json_body={"productId": product_id, "quantity": quantity},
            expected_status=200,
            **kwargs,
        )
