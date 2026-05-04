from __future__ import annotations

from urllib.parse import urlparse

import requests


def _health_path(base_url: str) -> str:
    if "voucher" in base_url:
        return "/health"
    return "/actuator/health"


def extract_origin(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def verify_frontend_reachable(frontend_base_url: str) -> dict:
    response = requests.get(frontend_base_url.rstrip("/") + "/", timeout=30)
    if response.status_code != 200:
        raise AssertionError(f"Frontend {frontend_base_url} returned {response.status_code}.")

    status_url = frontend_base_url.rstrip("/") + "/status"
    status_response = requests.get(status_url, timeout=30)
    if status_response.status_code != 200:
        raise AssertionError(f"Frontend health {status_url} returned {status_response.status_code}.")

    return {
        "frontend_url": frontend_base_url,
        "root_status": response.status_code,
        "status_endpoint": status_url,
        "status_text": status_response.text.strip(),
    }


def verify_backend_health(base_url: str) -> dict:
    health_url = base_url.rstrip("/") + _health_path(base_url)
    response = requests.get(health_url, timeout=30)
    if response.status_code != 200:
        raise AssertionError(f"Backend health {health_url} returned {response.status_code}.")
    payload = response.json()
    if str(payload.get("status", "")).upper() != "UP":
        raise AssertionError(f"Backend health {health_url} is not UP: {payload}")
    return {"health_url": health_url, "payload": payload}


def verify_cors(base_url: str, frontend_origin: str) -> dict:
    health_url = base_url.rstrip("/") + _health_path(base_url)
    response = requests.get(health_url, headers={"Origin": frontend_origin}, timeout=30)
    if response.status_code >= 400:
        raise AssertionError(
            f"CORS probe failed for {health_url} from origin {frontend_origin}: {response.status_code}"
        )
    allowed = response.headers.get("access-control-allow-origin")
    if allowed not in {frontend_origin, "*"}:
        raise AssertionError(
            f"CORS mismatch for {health_url}. Expected allow-origin {frontend_origin}, got {allowed!r}."
        )
    return {
        "health_url": health_url,
        "origin": frontend_origin,
        "allow_origin": allowed,
        "status_code": response.status_code,
    }
