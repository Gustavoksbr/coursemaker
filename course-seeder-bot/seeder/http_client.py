"""
Thin requests wrapper around the Coursemaker REST API. Mirrors what the frontend's axios client
does (bearer token, JSON body, the {status, error, message, fieldErrors} error envelope) but
without pulling in a heavier client for a bot with a handful of call sites.
"""
from __future__ import annotations

import requests


class ApiError(Exception):
    def __init__(self, message: str, status: int | None = None, body=None):
        super().__init__(message)
        self.status = status
        self.body = body


class HttpClient:
    def __init__(self, base_url: str):
        self._base_url = base_url
        self._token: str | None = None

    def set_token(self, token: str) -> None:
        self._token = token

    @property
    def token(self) -> str | None:
        return self._token

    def get(self, path, **kwargs):
        return self._request("GET", path, **kwargs)

    def post(self, path, body=None, **kwargs):
        return self._request("POST", path, body=body, **kwargs)

    def patch(self, path, body=None, **kwargs):
        return self._request("PATCH", path, body=body, **kwargs)

    def put(self, path, body=None, **kwargs):
        return self._request("PUT", path, body=body, **kwargs)

    def delete(self, path, **kwargs):
        return self._request("DELETE", path, **kwargs)

    def _request(self, method: str, path: str, body=None, auth: bool = True, token: str | None = None):
        headers = {"Content-Type": "application/json"}
        if auth:
            # An explicit `token` overrides the client's own for just this call - lets one shared
            # client act as two identities (e.g. admin for one request, curator for the next)
            # without mutating shared state that some other in-flight call might depend on.
            effective_token = token or self._token
            if not effective_token:
                raise ApiError(f"Chamada autenticada ({method} {path}) sem token definido")
            headers["Authorization"] = f"Bearer {effective_token}"

        url = f"{self._base_url}{path}"
        try:
            response = requests.request(method, url, headers=headers, json=body, timeout=60)
        except requests.RequestException as cause:
            raise ApiError(f"Nao foi possivel conectar em {url}. O backend esta rodando?") from cause

        data = response.json() if response.text else None

        if not response.ok:
            message = (data or {}).get("message") if isinstance(data, dict) else None
            message = message or f"HTTP {response.status_code} em {method} {path}"
            raise ApiError(message, status=response.status_code, body=data)

        return data
