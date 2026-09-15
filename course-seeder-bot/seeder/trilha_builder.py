"""
Groups already-created courses into a Trilha (learning path) - the one piece of the seeding
pipeline the backend has that neither `main.py` nor `build_from_playlist.py` used yet.

A trilha here is pure curation: no new content is generated, it just orders a set of existing
course ids into one sequence and publishes it. Kept separate from `build_from_playlist.py` so the
same courses can be regrouped into different trilhas later without re-running any Groq/YouTube
work.
"""
from __future__ import annotations

from .http_client import HttpClient


def build_trilha(http: HttpClient, *, title: str, description: str, area_id: str,
                  course_ids: list[str], publish: bool = True) -> dict:
    """Creates a trilha (as whichever user `http` is authenticated as - the curator), adds each
    course as an item in the given order, and publishes it. Idempotency is the caller's job: call
    this once per trilha, not on every run."""
    trilha = http.post("/trilhas", {
        "title": title,
        "description": description,
        "visibility": "public",
        "categories": [],
        "areaId": area_id,
    })

    for course_id in course_ids:
        http.post(f"/trilhas/{trilha['id']}/items", {"courseId": course_id})

    if publish:
        http.patch(f"/trilhas/{trilha['id']}", {"status": "available"})

    return trilha
