"""
One-off batch script: builds ~20 real courses (verified YouTube playlists from well-known
Brazilian dev-education channels) and groups them into 5 Trilhas, to populate a portfolio
deployment with real, coherent content instead of the random/placeholder courses `main.py`'s
random flow would produce.

Every playlist ID below was verified against the real YouTube Data API (title, channel, video
count) before being hardcoded here - see the conversation this script came out of for how. This
is NOT meant to be a general-purpose reusable tool: it is a specific, one-time content plan, kept
as a script (instead of running commands by hand) so a failure partway through can be resumed
without redoing the courses that already succeeded.

Usage:
    .venv\\Scripts\\python.exe seed_production.py             # runs everything
    .venv\\Scripts\\python.exe seed_production.py --dry-run   # just prints the plan, no API calls

Safe to re-run: each course is skipped if a course with the exact same name already exists under
the curator account (see `_existing_course_names`), and each trilha is skipped if one with the
same title already exists.
"""
from __future__ import annotations

import argparse
import sys
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from build_from_playlist import pick_tech_area, run_playlist_flow
from seeder.config import load_config
from seeder.curator import ensure_curator, login_admin
from seeder.http_client import ApiError, HttpClient
from seeder.swagger import verify_swagger
from seeder.trilha_builder import build_trilha

# A short pause between courses (on top of run_playlist_flow's own per-video pause) - keeps the
# Groq free-tier TPM window from carrying momentum straight from the last video of one course into
# the first video of the next.
BETWEEN_COURSE_PAUSE_SECONDS = 5

# v4: same as v3 (Curso em Vídeo=6, Rocketseat=5, Hashtag=5, Loiane Groner=2, Michelli Brito=2),
# plus Alura=2 - their official channel (@alura) is mostly career talks/podcasts, not hands-on
# tutorials, but "Python para Análise de Dados" and the DevSoutinho Git collab are real technical
# playlists. Total now 22, still with every school inside [2, 6].
PLAN = [
    {
        "trilha": "Fundamentos de Programação",
        "description": (
            "O ponto de partida para quem nunca programou: lógica, controle de versão, "
            "terminal Linux e a primeira linguagem de verdade."
        ),
        "courses": [
            {"name": "Lógica de Programação", "playlist": "PLHz_AreHm4dmSj0MHol_aoNYCSGFqvfXV", "categories": ["logica", "algoritmos", "fundamentos"]},
            {"name": "Git e GitHub na Prática", "playlist": "PLHz_AreHm4dm7ZULPAmadvNhH6vk9oNZA", "categories": ["git", "github"]},
            {"name": "Git e GitHub para Sobrevivência", "playlist": "PLh2Y_pKOa4Uf-cUQOVNGlz_GVHx8QYoE6", "categories": ["git", "github"]},
            {"name": "Linux: Primeiros Passos", "playlist": "PLHz_AreHm4dlIXleu20uwPWFOSswqLYbV", "categories": ["linux", "terminal", "sistemas"]},
            {"name": "Python 3: Fundamentos", "playlist": "PLHz_AreHm4dlKP6QQCekuIPky1CiwmdI6", "max_videos": 12, "categories": ["python", "fundamentos"]},
        ],
    },
    {
        "trilha": "Frontend Web",
        "description": "HTML, CSS e JavaScript até um framework moderno de verdade: React com TypeScript.",
        "courses": [
            {"name": "HTML5 e CSS3: Fundamentos", "playlist": "PLHz_AreHm4dkZ9-atkcmcBaMZdmLHft8n", "max_videos": 12, "categories": ["html", "css", "frontend"]},
            {"name": "JavaScript e ECMAScript", "playlist": "PLHz_AreHm4dlsK3Nr9GVvXCbpQyHQl1o1", "max_videos": 12, "categories": ["javascript", "frontend"]},
            {"name": "TypeScript", "playlist": "PL85ITvJ7FLohXigfxBqzpZxzRG8TaRSj2", "categories": ["typescript", "javascript", "frontend"]},
            {"name": "React", "playlist": "PL85ITvJ7FLohz54DLfinJeHi7DrHGT2_U", "max_videos": 12, "categories": ["react", "javascript", "frontend"]},
        ],
    },
    {
        "trilha": "Backend Java",
        "description": "Java do zero até estrutura de dados e dois projetos reais com Spring Boot.",
        "courses": [
            {"name": "Java Básico", "playlist": "PLGxZ4Rq3BOBq0KXHsp5J3PxyFaBIXVs3r", "max_videos": 12, "categories": ["java", "backend", "fundamentos"]},
            {"name": "Estrutura de Dados e Algoritmos em Java", "playlist": "PLGxZ4Rq3BOBrgumpzz-l8kFMw2DLERdxi", "max_videos": 12, "categories": ["java", "estrutura-de-dados", "algoritmos"]},
            {"name": "Spring Boot: Aplicação Java Web", "playlist": "PL8iIphQOyG-DHLpEx1TPItqJamy08fs1D", "categories": ["java", "spring-boot", "backend"]},
            {"name": "Spring Boot: Deploy na AWS", "playlist": "PL8iIphQOyG-AdKMQWtt1bqdVm8QUnX7_S", "max_videos": 12, "categories": ["java", "spring-boot", "aws", "devops"]},
        ],
    },
    {
        "trilha": "Backend Python, Node e Go",
        "description": "APIs com Node.js e FastAPI, automação com Python, e uma volta por Go e DevOps.",
        "courses": [
            {"name": "Node.js", "playlist": "PL85ITvJ7FLogNHtbfjISMtEk_WepbGMO6", "max_videos": 12, "categories": ["node.js", "javascript", "backend"]},
            {"name": "Go", "playlist": "PL85ITvJ7FLohbSBGlkakoyhFpS08KJQ2z", "categories": ["go", "backend"]},
            {"name": "DevOps na Prática", "playlist": "PL85ITvJ7FLohEWHrA1tU1Rijd-6Br_huQ", "categories": ["devops", "docker", "ci-cd"]},
            {"name": "FastAPI: API REST com Python", "playlist": "PLpdAy0tYrnKy3TvpCT-x7kGqMQ5grk1Xq", "categories": ["python", "fastapi", "backend", "api"]},
        ],
    },
    {
        "trilha": "Dados e Ciência de Dados",
        "description": "Banco de dados, automação e ciência de dados com Python.",
        "courses": [
            {"name": "SQL", "playlist": "PLpdAy0tYrnKxDVJfbPRe8L_YbACivhl3t", "max_videos": 12, "categories": ["sql", "banco-de-dados"]},
            {"name": "Ciência de Dados", "playlist": "PLpdAy0tYrnKwh54zFrSVyI54RMiUB2-it", "max_videos": 12, "categories": ["python", "ciencia-de-dados", "dados"]},
            {"name": "Automações com Python", "playlist": "PLpdAy0tYrnKyjrY1Fr72DhmrRmeWI_5C8", "max_videos": 12, "categories": ["python", "automacao"]},
            {"name": "Análise de Dados", "playlist": "PLpdAy0tYrnKx9CtTmgSdzHz9YQ-C5ZNI9", "max_videos": 12, "categories": ["python", "dados", "analise-de-dados"]},
            {"name": "Python para Análise de Dados", "playlist": "PLh2Y_pKOa4Uc99I9oi6EifeHwYNDYIq2o", "categories": ["python", "dados", "analise-de-dados"]},
        ],
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="So imprime o plano, sem chamar a API.")
    return parser.parse_args()


def _existing_course_names(http: HttpClient, author_nickname: str) -> dict[str, dict]:
    # Authenticated as the curator itself (not auth=False) so a course left in draft by a
    # previous, interrupted run - not yet PATCHed to "available" - is still found and skipped
    # instead of being built a second time under a slightly-different slug.
    items = http.get(f"/courses?author={author_nickname}&size=100")["items"]
    return {c["name"]: c for c in items}


def _existing_trilha_titles(http: HttpClient, author_nickname: str) -> dict[str, dict]:
    items = http.get(f"/trilhas?author={author_nickname}&size=100")["items"]
    return {t["title"]: t for t in items}


def main() -> None:
    args = parse_args()
    total_courses = sum(len(g["courses"]) for g in PLAN)

    if args.dry_run:
        print(f"== Plano: {len(PLAN)} trilhas, {total_courses} cursos (dry-run, nenhuma chamada de API) ==\n")
        for group in PLAN:
            print(f"[{group['trilha']}]")
            for course in group["courses"]:
                cap = course.get("max_videos")
                print(f"  - {course['name']}  ({course['playlist']}" + (f", max {cap} videos)" if cap else ")"))
        return

    print(f"== Coursemaker: seed de producao - {len(PLAN)} trilhas, {total_courses} cursos ==\n")

    config = load_config()
    verify_swagger(config.api_base_url)

    http = HttpClient(f"{config.api_base_url}/api/v1")

    print("[auth] preparando conta curadora...")
    curator_token, curator_user = ensure_curator(http, config)
    http.set_token(curator_token)
    curator_nickname = curator_user.get("nickname", config.curator.nickname)

    existing_courses = _existing_course_names(http, curator_nickname)
    existing_trilhas = _existing_trilha_titles(http, curator_nickname)

    areas = http.get("/areas", auth=False)
    area = pick_tech_area(areas)

    results: list[tuple[str, str, str | None]] = []  # (course_name, trilha_title, error_or_None)
    trilha_course_ids: dict[str, list[str]] = {group["trilha"]: [] for group in PLAN}

    course_index = 0
    for group in PLAN:
        for course_spec in group["courses"]:
            course_index += 1
            name = course_spec["name"]
            print(f"\n{'=' * 70}\n[{course_index}/{total_courses}] {name}  (trilha: {group['trilha']})\n{'=' * 70}")

            if name in existing_courses:
                print(f"  [pulado] curso \"{name}\" ja existe (id={existing_courses[name]['id']})")
                trilha_course_ids[group["trilha"]].append(existing_courses[name]["id"])
                results.append((name, group["trilha"], None))
                continue

            try:
                course = run_playlist_flow(
                    course_spec["playlist"],
                    max_videos=course_spec.get("max_videos"),
                    course_name=name,
                    categories=course_spec.get("categories"),
                )
                trilha_course_ids[group["trilha"]].append(course["id"])
                results.append((name, group["trilha"], None))
            except Exception as error:  # noqa: BLE001 - one course's failure must not sink the whole batch
                print(f"  [FALHOU] {name}: {error}", file=sys.stderr)
                results.append((name, group["trilha"], str(error)))

            time.sleep(BETWEEN_COURSE_PAUSE_SECONDS)

    print(f"\n{'=' * 70}\n[trilhas] agrupando cursos criados\n{'=' * 70}")
    for group in PLAN:
        course_ids = trilha_course_ids[group["trilha"]]
        if not course_ids:
            print(f"  [pulado] \"{group['trilha']}\" - nenhum curso disponivel para agrupar")
            continue
        if group["trilha"] in existing_trilhas:
            print(f"  [pulado] trilha \"{group['trilha']}\" ja existe")
            continue
        try:
            build_trilha(
                http,
                title=group["trilha"],
                description=group["description"],
                area_id=area["id"],
                course_ids=course_ids,
            )
            print(f"  [ok] \"{group['trilha']}\" com {len(course_ids)} curso(s)")
        except ApiError as error:
            print(f"  [FALHOU] trilha \"{group['trilha']}\": {error}", file=sys.stderr)

    print(f"\n{'=' * 70}\nRESUMO\n{'=' * 70}")
    ok = [r for r in results if r[2] is None]
    failed = [r for r in results if r[2] is not None]
    print(f"Cursos ok: {len(ok)}/{total_courses}")
    for name, trilha, _ in ok:
        print(f"  [ok] {name}")
    if failed:
        print(f"\nCursos com falha: {len(failed)}")
        for name, trilha, error in failed:
            print(f"  [FALHOU] {name} ({trilha}): {error}")


if __name__ == "__main__":
    try:
        main()
    except ApiError as error:
        print("\nFalha na execucao:", file=sys.stderr)
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception as error:  # noqa: BLE001 - top-level CLI guard
        print("\nFalha na execucao:", file=sys.stderr)
        print(str(error), file=sys.stderr)
        sys.exit(1)
