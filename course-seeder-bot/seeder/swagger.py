"""
The bot leans on springdoc's /v3/api-docs as its contract with the backend: rather than trusting
that the hardcoded paths below still exist, it checks them against the live spec before doing
anything else. If the API shape changed, this fails fast with a clear message instead of the bot
limping through half of a run and leaving orphaned accounts/courses behind.
"""
from __future__ import annotations

import requests

REQUIRED_OPERATIONS = [
    ("post", "/api/v1/auth/register"),
    ("patch", "/api/v1/users/{id}"),
    ("post", "/api/v1/courses"),
    ("get", "/api/v1/courses/{courseId}/modules"),
    ("post", "/api/v1/courses/{courseId}/modules"),
    ("delete", "/api/v1/modules/{id}"),
    ("post", "/api/v1/modules/{moduleId}/lessons"),
    ("post", "/api/v1/lessons/{lessonId}/blocks"),
    ("patch", "/api/v1/courses/{id}"),
]


def verify_swagger(api_base_url: str) -> None:
    url = f"{api_base_url}/v3/api-docs"
    try:
        response = requests.get(url, timeout=30)
    except requests.RequestException as cause:
        raise RuntimeError(f"Nao foi possivel buscar o swagger em {url}. O backend esta rodando?") from cause
    if not response.ok:
        raise RuntimeError(f"GET {url} respondeu {response.status_code}")

    spec = response.json()
    paths = spec.get("paths") or {}

    missing = [
        f"{method.upper()} {path}"
        for method, path in REQUIRED_OPERATIONS
        if method not in (paths.get(path) or {})
    ]
    if missing:
        raise RuntimeError(
            f"O swagger em {url} nao expoe mais estas operacoes que o bot depende: "
            f"{', '.join(missing)}. A API do backend provavelmente mudou e este bot precisa ser atualizado."
        )

    info = spec.get("info") or {}
    print(
        f"[swagger] {info.get('title', 'API')} v{info.get('version', '?')} - "
        f"{len(paths)} rotas, todas as operacoes esperadas presentes."
    )
