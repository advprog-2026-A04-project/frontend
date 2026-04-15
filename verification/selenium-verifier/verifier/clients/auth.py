from __future__ import annotations

from .base import BaseApiClient


class AuthClient(BaseApiClient):
    def register(self, email: str, username: str, password: str, **kwargs):
        return self.request(
            "POST",
            "/auth/register",
            json_body={"email": email, "username": username, "password": password},
            expected_status=(200, 201),
            **kwargs,
        )

    def login(self, email: str, password: str, **kwargs):
        return self.request(
            "POST",
            "/auth/login",
            json_body={"email": email, "password": password},
            expected_status=200,
            **kwargs,
        )

    def me(self, token: str, **kwargs):
        return self.request(
            "GET",
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            expected_status=200,
            **kwargs,
        )

    def health(self, **kwargs):
        return self.request("GET", "/actuator/health", expected_status=200, **kwargs)
