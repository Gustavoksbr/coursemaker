"""
Sets up the neutral identity that owns a course built from someone else's real content.

Deliberately NOT a persona named after the real creator: a School only ever records provenance
("this content was curated from channel X"), never a claim of partnership (see the backend's own
School entity docstring) - and the account that owns the course is a neutral curator, not an
account pretending to be the video's actual author, who never signed up for this platform.
"""
from __future__ import annotations

from .config import Config
from .http_client import ApiError, HttpClient


def login_admin(http: HttpClient, config: Config) -> str:
    if not config.admin.email or not config.admin.password:
        raise RuntimeError(
            "ADMIN_EMAIL/ADMIN_PASSWORD nao configurados no .env deste bot - precisa das "
            "credenciais do admin do backend para criar/gerenciar Schools."
        )
    data = http.post("/auth/login", {"email": config.admin.email, "password": config.admin.password}, auth=False)
    return data["token"]


def ensure_curator(http: HttpClient, config: Config) -> tuple[str, dict]:
    """Logs into the curator account, registering it on first use. Returns (token, user)."""
    try:
        data = http.post("/auth/register", {
            "email": config.curator.email,
            "password": config.curator.password,
            "name": config.curator.name,
        }, auth=False)
    except ApiError as error:
        if error.status != 409:
            raise
        data = http.post(
            "/auth/login", {"email": config.curator.email, "password": config.curator.password}, auth=False,
        )

    token, user = data["token"], data["user"]

    if user.get("needsNickname") or not user.get("nickname"):
        updated = http.patch(f"/users/{user['id']}", {"nickname": config.curator.nickname}, token=token)
        token, user = updated["token"], updated["user"]

    return token, user


def ensure_school(http: HttpClient, admin_token: str, *, name: str, description: str,
                   logo_url: str | None, website_url: str | None) -> dict:
    schools = http.get("/schools", auth=False)
    existing = next((s for s in schools if s["name"] == name), None)
    if existing:
        return existing

    return http.post("/schools", {
        "name": name,
        "description": description,
        "logoUrl": logo_url,
        "websiteUrl": website_url,
    }, token=admin_token)


def grant_school_membership(http: HttpClient, admin_token: str, school_id: str, user_id: str) -> None:
    http.put(f"/schools/{school_id}/members/{user_id}", token=admin_token)
