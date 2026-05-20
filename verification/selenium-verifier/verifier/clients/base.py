from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


SENSITIVE_HEADERS = {"authorization", "x-admin-token", "x-internal-token"}


@dataclass
class ApiCallResult:
    status_code: int
    headers: dict[str, str]
    payload: Any
    text: str


class BaseApiClient:
    def __init__(self, base_url: str, timeout: int = 30) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def request(
        self,
        method: str,
        path: str,
        *,
        headers: dict[str, str] | None = None,
        json_body: Any | None = None,
        params: dict[str, Any] | None = None,
        expected_status: int | tuple[int, ...] | None = None,
        evidence=None,
        evidence_name: str | None = None,
    ) -> ApiCallResult:
        url = f"{self.base_url}{path}"
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=json_body,
            params=params,
            timeout=self.timeout,
        )
        payload: Any
        try:
            payload = response.json()
        except ValueError:
            payload = None

        if expected_status is not None:
            allowed = (expected_status,) if isinstance(expected_status, int) else expected_status
            if response.status_code not in allowed:
                raise AssertionError(
                    f"{method} {url} returned {response.status_code}, expected {allowed}. Body: {response.text}"
                )

        result = ApiCallResult(
            status_code=response.status_code,
            headers=dict(response.headers),
            payload=payload,
            text=response.text,
        )

        if evidence is not None and evidence_name:
            evidence.write_json(
                f"{evidence_name}.json",
                {
                    "request": {
                        "method": method,
                        "url": url,
                        "headers": self._sanitize_headers(headers or {}),
                        "params": params,
                        "json": json_body,
                    },
                    "response": {
                        "status_code": result.status_code,
                        "headers": result.headers,
                        "payload": result.payload,
                        "text": result.text,
                    },
                },
            )

        return result

    def _sanitize_headers(self, headers: dict[str, str]) -> dict[str, str]:
        sanitized: dict[str, str] = {}
        for key, value in headers.items():
            sanitized[key] = "<redacted>" if key.lower() in SENSITIVE_HEADERS else value
        return sanitized
