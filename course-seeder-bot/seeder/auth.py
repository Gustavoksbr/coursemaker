"""Account registration and nickname setup for the bot's own throwaway account."""
from __future__ import annotations

import random
import re
import string

from .account_counter import read_counter, write_counter
from .config import Config
from .http_client import ApiError, HttpClient

MAX_ATTEMPTS = 200


def register_bot_account(http: HttpClient, config: Config):
    """
    Registers a brand new account, never reuses one. The counter file just remembers where to
    resume numbering; if an email is already taken (another run, another machine, manual testing)
    it keeps bumping the number until one sticks, and persists whatever number actually worked.
    """
    counter = read_counter(1)

    for _ in range(MAX_ATTEMPTS):
        email = f"{config.bot.email_prefix}{counter}{config.bot.email_domain}"
        try:
            auth = http.post(
                "/auth/register",
                {"email": email, "password": config.bot.password, "name": config.bot.name},
                auth=False,
            )
            write_counter(counter + 1)
            return auth["token"], auth["user"], email
        except ApiError as error:
            if error.status == 409:
                counter += 1
                continue
            raise

    raise RuntimeError(f"Nao foi possivel achar um email disponivel apos {MAX_ATTEMPTS} tentativas")


def setup_nickname(http: HttpClient, user: dict, email: str) -> str:
    """
    Every fresh account needs a nickname before it can own a course (see backend CourseService).
    PATCH /users/{id} reissues a token (it returns a full AuthResponse), so this swaps it into
    the http client on success rather than handing the caller a stale one.
    """
    if not user.get("needsNickname") and user.get("nickname"):
        return user["nickname"]

    base = re.sub(r"[^a-z0-9-]", "-", email.split("@")[0].lower())

    for attempt in range(5):
        nickname = base if attempt == 0 else f"{base}-{_random_suffix()}"
        try:
            updated = http.patch(f"/users/{user['id']}", {"nickname": nickname})
            http.set_token(updated["token"])
            return updated["user"]["nickname"]
        except ApiError as error:
            if error.status == 409:
                continue
            raise

    raise RuntimeError("Nao foi possivel definir um nickname para a conta do bot")


def _random_suffix() -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
