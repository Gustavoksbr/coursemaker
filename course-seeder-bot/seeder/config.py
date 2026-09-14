"""Loads and validates the bot's configuration from the environment (.env)."""
from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _int(name: str, fallback: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return fallback
    try:
        return int(raw)
    except ValueError:
        return fallback


def _bool(name: str, fallback: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return fallback
    return raw.strip().lower() == "true"


def _required(name: str) -> str:
    value = os.environ.get(name)
    if not value or not value.strip():
        raise RuntimeError(
            f"Variavel de ambiente {name} nao configurada. Copie .env.example para .env e preencha."
        )
    return value.strip()


@dataclass(frozen=True)
class GroqConfig:
    api_key: str
    model: str


@dataclass(frozen=True)
class BotConfig:
    email_prefix: str
    email_domain: str
    password: str
    name: str


@dataclass(frozen=True)
class VolumeConfig:
    courses_min: int
    courses_max: int
    modules_min: int
    modules_max: int
    lessons_min: int
    lessons_max: int
    blocks_min: int
    blocks_max: int


@dataclass(frozen=True)
class CuratorConfig:
    """The neutral account/school used to own courses built from someone else's real content -
    never a persona named after the real creator (see build_from_playlist.py's own docstring)."""
    email: str
    password: str
    name: str
    nickname: str


@dataclass(frozen=True)
class AdminConfig:
    """Needed only by build_from_playlist.py, to create/manage Schools (admin-only endpoints)."""
    email: str | None
    password: str | None


@dataclass(frozen=True)
class Config:
    groq: GroqConfig
    api_base_url: str
    bot: BotConfig
    volume: VolumeConfig
    publish_courses: bool
    youtube_api_key: str | None
    curator: CuratorConfig
    admin: AdminConfig


def load_config() -> Config:
    return Config(
        groq=GroqConfig(
            api_key=_required("GROQ_API_KEY"),
            model=os.environ.get("GROQ_MODEL", "").strip() or "openai/gpt-oss-120b",
        ),
        api_base_url=(os.environ.get("API_BASE_URL", "").strip() or "http://localhost:8080").rstrip("/"),
        bot=BotConfig(
            email_prefix=os.environ.get("BOT_EMAIL_PREFIX", "").strip() or "testebot",
            email_domain=os.environ.get("BOT_EMAIL_DOMAIN", "").strip() or "@email.com",
            password=os.environ.get("BOT_PASSWORD", "").strip() or "SenhaForte123!",
            name=os.environ.get("BOT_NAME", "").strip() or "Bot Coursemaker",
        ),
        volume=VolumeConfig(
            courses_min=_int("COURSES_MIN", 2),
            courses_max=_int("COURSES_MAX", 3),
            modules_min=_int("MODULES_MIN", 2),
            modules_max=_int("MODULES_MAX", 4),
            lessons_min=_int("LESSONS_MIN", 2),
            lessons_max=_int("LESSONS_MAX", 4),
            blocks_min=_int("BLOCKS_MIN", 2),
            blocks_max=_int("BLOCKS_MAX", 4),
        ),
        publish_courses=_bool("PUBLISH_COURSES", True),
        youtube_api_key=(os.environ.get("YOUTUBE_API_KEY", "").strip() or None),
        curator=CuratorConfig(
            email=os.environ.get("CURATOR_EMAIL", "").strip() or "curadoria@email.com",
            password=os.environ.get("CURATOR_PASSWORD", "").strip() or "SenhaForte123!",
            name=os.environ.get("CURATOR_NAME", "").strip() or "Coursemaker Curadoria",
            nickname=os.environ.get("CURATOR_NICKNAME", "").strip() or "curadoria",
        ),
        admin=AdminConfig(
            email=os.environ.get("ADMIN_EMAIL", "").strip() or None,
            password=os.environ.get("ADMIN_PASSWORD", "").strip() or None,
        ),
    )


def require_youtube_api_key(config: Config) -> str:
    if not config.youtube_api_key:
        raise RuntimeError(
            "YOUTUBE_API_KEY nao configurada. Copie .env.example para .env e preencha - crie uma "
            "chave gratuita na YouTube Data API v3 no Google Cloud Console."
        )
    return config.youtube_api_key
