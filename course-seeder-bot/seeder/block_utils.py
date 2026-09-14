"""Shared helpers for turning Groq's raw JSON replies into valid lesson blocks and quiz questions."""
from __future__ import annotations

import html
import re

# Mirrors the languages Shiki highlights on the frontend (frontend/src/lib/constants.js). Kept as
# its own small copy since this bot is a standalone package, not a workspace of the frontend.
CODE_LANGUAGES = [
    "javascript", "typescript", "jsx", "tsx", "java", "kotlin", "python", "go",
    "rust", "csharp", "php", "ruby", "sql", "html", "css", "json", "yaml",
    "bash", "dockerfile", "markdown",
]

HTML_RULES = (
    "Use apenas tags HTML simples: <p>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <code>. "
    "Nunca inclua <html>, <head>, <body>, markdown (como ** ou #) ou blocos de codigo dentro do texto."
)


def non_empty_string(value, fallback):
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def clean_plain_text(value: str) -> str:
    """
    Undoes an occasional Groq quirk: HTML-entity-encoding accented characters (`j&aacute;` for
    `já`) or slipping in a stray tag (`<code>`), in a field that is only ever shown as plain text -
    unlike a TEXT block's content, a QUESTION block's alternative text/explanation is rendered
    verbatim (see the frontend's QuestionEditor/QuestionBlock), so anything HTML-ish in it would
    show up on screen exactly as typed instead of being interpreted.
    """
    return re.sub(r"<[^>]+>", "", html.unescape(value)).strip()


def as_list(value):
    return value if isinstance(value, list) else []


def sanitize_block(block: dict):
    block_type = block.get("type") if block.get("type") in ("code", "text") else None
    content = non_empty_string(block.get("content"), None)
    if not block_type or not content:
        return None

    if block_type == "text":
        return {"type": block_type, "content": content, "language": None}

    language = block.get("language") if block.get("language") in CODE_LANGUAGES else "plaintext"
    return {"type": block_type, "content": content, "language": language}


def sanitize_quiz(raw: dict) -> dict | None:
    """Validates a {"prompt", "alternatives"} quiz reply, forcing exactly one correct alternative."""
    prompt = non_empty_string(raw.get("prompt"), None)
    if prompt:
        prompt = clean_plain_text(prompt)

    alternatives = [
        {
            "text": clean_plain_text(text),
            "correct": bool(a.get("correct")),
            "explanation": clean_plain_text(non_empty_string(a.get("explanation"), "")),
        }
        for a in as_list(raw.get("alternatives"))
        if isinstance(a, dict) and (text := non_empty_string(a.get("text"), None))
    ][:4]

    if not prompt or len(alternatives) < 2:
        return None

    # Exactly one alternative must be correct - if Groq marked zero or several, fall back to the
    # first one rather than shipping a quiz with no right answer or two.
    if sum(1 for a in alternatives if a["correct"]) != 1:
        for a in alternatives:
            a["correct"] = False
        alternatives[0]["correct"] = True

    return {"prompt": prompt, "alternatives": alternatives}
