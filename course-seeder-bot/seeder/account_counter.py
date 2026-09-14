"""
Persists the next bot account number to try, next to this package. Gitignored on purpose: every
clone (or every machine) starts its own numbering, there is nothing to share here.
"""
from __future__ import annotations

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
COUNTER_FILE = ROOT_DIR / "bot-account-counter.txt"


def read_counter(default_value: int = 1) -> int:
    try:
        raw = COUNTER_FILE.read_text(encoding="utf8").strip()
        value = int(raw)
        return value if value > 0 else default_value
    except (OSError, ValueError):
        return default_value


def write_counter(value: int) -> None:
    COUNTER_FILE.write_text(str(value), encoding="utf8")
