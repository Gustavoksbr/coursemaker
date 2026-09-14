"""
One Groq chat completion, forced into JSON mode. Content generation always asks for a specific
JSON shape (see content_generator.py), so a response that fails to parse is treated the same as
a network error: retry with backoff, then give up.
"""
from __future__ import annotations

import json
import re
import time

import requests

from .config import Config

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_RETRIES = 5

# Groq's 429 body spells out exactly how long to wait ("Please try again in 5.6325s") - reading
# that instead of guessing with blind exponential backoff means we almost never retry too early
# (another wasted attempt) or needlessly late. Falls back to a fixed pause when the message shape
# does not match (other error types, or Groq changing its wording).
_RETRY_AFTER_PATTERN = re.compile(r"try again in ([\d.]+)s", re.IGNORECASE)
DEFAULT_RETRY_PAUSE_SECONDS = 3.0


def _retry_delay(response: requests.Response | None, error_text: str) -> float:
    if response is not None and response.headers.get("Retry-After"):
        try:
            return float(response.headers["Retry-After"])
        except ValueError:
            pass

    match = _RETRY_AFTER_PATTERN.search(error_text)
    if match:
        # A little slack on top of Groq's own number - retrying at the exact instant the window
        # resets tends to lose the race against its own counter reset.
        return float(match.group(1)) + 0.5

    return DEFAULT_RETRY_PAUSE_SECONDS


def groq_chat_json(config: Config, system: str, user: str, max_tokens: int = 4000, temperature: float = 0.9) -> dict:
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = requests.post(
                GROQ_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {config.groq.api_key}",
                },
                json={
                    "model": config.groq.model,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
                timeout=120,
            )
            if not response.ok:
                error_text = response.text[:500]
                last_error = RuntimeError(f"Groq respondeu {response.status_code}: {error_text}")
                print(f"[groq] tentativa {attempt + 1}/{MAX_RETRIES + 1} falhou: {last_error}")
                if attempt < MAX_RETRIES:
                    delay = _retry_delay(response, error_text) if response.status_code == 429 else 1.0
                    print(f"[groq] aguardando {delay:.1f}s antes de tentar de novo...")
                    time.sleep(delay)
                continue

            data = response.json()
            content = (data.get("choices") or [{}])[0].get("message", {}).get("content")
            if not content:
                raise RuntimeError("Groq nao retornou conteudo na resposta")

            return json.loads(content)
        except (requests.RequestException, ValueError, RuntimeError, KeyError, IndexError) as error:
            last_error = error
            print(f"[groq] tentativa {attempt + 1}/{MAX_RETRIES + 1} falhou: {error}")
            if attempt < MAX_RETRIES:
                time.sleep(1.0)

    raise RuntimeError(f"Groq falhou apos {MAX_RETRIES + 1} tentativas: {last_error}")
