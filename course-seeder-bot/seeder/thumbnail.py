"""
Deterministic placeholder thumbnail for courses that have no real source image to pull from -
`course_builder.py`'s random flow invents a course from scratch via Groq, so unlike
`build_from_playlist.py` (which grabs the playlist's own YouTube thumbnail, see
`youtube_playlist.py`) there is no real cover art available.

Uses placehold.co, a public no-key image generator: given a size and a background/text color
pair, it renders a plain solid card with the given text centered - not a generated illustration,
but good enough for a course card, and it needs no image-generation infra, API key, or upload step
(unlike, say, generating a PNG locally and signing an upload through the backend's own
`/uploads/cloudinary-signature` - considered, but that trades a same-request instant public URL
for real network calls and Cloudinary storage growth, for a payoff that's mostly cosmetic here).

The color pair is picked by hashing the course name, so re-running the bot with the same name
(the resumability check in `seed_production.py`, or just running `main.py` twice) reliably
produces the same thumbnail instead of a new random one each time.
"""
from __future__ import annotations

import hashlib
from urllib.parse import quote

# Background/text hex pairs pulled from the app's own design tokens - the `brand` sky-blue scale
# in frontend/tailwind.config.js, plus the amber/violet/green accents Badge.jsx already uses for
# draft/private/featured pills - so a generated thumbnail looks like it belongs on the site
# instead of a generic placeholder. (background, text)
_PALETTE = [
    ("0c4a6e", "e0f2fe"),  # brand-900 / brand-100
    ("075985", "bae6fd"),  # brand-800 / brand-200
    ("0369a1", "f0f9ff"),  # brand-700 / brand-50
    ("78350f", "fde68a"),  # amber-900 / amber-200
    ("4c1d95", "ddd6fe"),  # violet-900 / violet-200
    ("064e3b", "a7f3d0"),  # green-900 / green-200
]


def placeholder_thumbnail(text: str, *, width: int = 1280, height: int = 720) -> str:
    index = int(hashlib.sha1(text.encode("utf-8")).hexdigest(), 16) % len(_PALETTE)
    bg, fg = _PALETTE[index]
    return f"https://placehold.co/{width}x{height}/{bg}/{fg}?text={quote(text)}&font=roboto"
