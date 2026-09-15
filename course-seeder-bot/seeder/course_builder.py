"""Builds random courses (modules, lessons, text/code blocks) via the Coursemaker API."""
from __future__ import annotations

import json
import random
import time
import uuid

from .config import Config
from .content_generator import generate_course_skeleton, generate_module_content_and_quiz
from .http_client import HttpClient
from .thumbnail import placeholder_thumbnail

# A short pause between Groq calls spreads out token usage instead of bursting it, which
# measurably cuts how often the free-tier TPM rate limit gets hit (see groq_client.py - it now
# waits out Groq's own suggested retry delay on a 429, but avoiding the 429 in the first place is
# still cheaper than even a well-timed retry).
GROQ_CALL_PAUSE_SECONDS = 1.5


def build_random_courses(http: HttpClient, config: Config) -> list[dict]:
    course_count = random.randint(config.volume.courses_min, config.volume.courses_max)
    print(f"\n[courses] Gerando {course_count} curso(s)...")

    # areaId is required by the backend (CreateCourseRequest.areaId is @NotNull) even though it
    # has no real bearing on a randomly generated course - just pick one of whatever areas an
    # admin has already curated.
    areas = http.get("/areas", auth=False)
    if not areas:
        raise RuntimeError(
            "Nenhuma area cadastrada no backend (GET /areas vazio). Crie ao menos uma area antes "
            "de rodar o bot - toda criacao de curso exige uma."
        )

    courses = []
    for index in range(course_count):
        if index > 0:
            time.sleep(GROQ_CALL_PAUSE_SECONDS)
        courses.append(_build_one_course(http, config, areas, index + 1, course_count))
    return courses


def _build_one_course(http: HttpClient, config: Config, areas: list[dict], index: int, total: int) -> dict:
    modules_count = random.randint(config.volume.modules_min, config.volume.modules_max)
    lessons_per_module = random.randint(config.volume.lessons_min, config.volume.lessons_max)

    print(f"\n[curso {index}/{total}] gerando curriculo ({modules_count} modulos x {lessons_per_module} aulas)...")
    skeleton = generate_course_skeleton(config, modules_count, lessons_per_module)
    print(f"[curso {index}/{total}] \"{skeleton['name']}\"")

    course = http.post("/courses", {
        "name": skeleton["name"],
        "description": skeleton["description"],
        "landingDescription": skeleton["landingDescription"],
        "thumbnailUrl": placeholder_thumbnail(skeleton["name"]),
        "visibility": "public",
        "categories": skeleton["categories"],
        "areaId": random.choice(areas)["id"],
    })

    # Every new course is seeded with one default module/lesson/block (see backend CourseService);
    # it exists so a human editing by hand has somewhere to start, but the bot builds its own.
    _remove_seeded_modules(http, course["id"])

    for module_skeleton in skeleton["modules"]:
        time.sleep(GROQ_CALL_PAUSE_SECONDS)
        _build_module(http, config, course, module_skeleton)

    if config.publish_courses:
        http.patch(f"/courses/{course['id']}", {"status": "available"})

    print(f"[curso {index}/{total}] pronto -> /courses/{course['owner']['nickname']}/{course['slug']}")
    return course


def _remove_seeded_modules(http: HttpClient, course_id: str) -> None:
    for module in http.get(f"/courses/{course_id}/modules"):
        http.delete(f"/modules/{module['id']}")


def _build_module(http: HttpClient, config: Config, course: dict, module_skeleton: dict) -> None:
    module = http.post(f"/courses/{course['id']}/modules", {"title": module_skeleton["title"]})
    print(f"  [modulo] \"{module_skeleton['title']}\"")

    # One Groq call for both the lesson content and the wrap-up quiz - see
    # generate_module_content_and_quiz's own docstring for why they were merged.
    lessons, quiz = generate_module_content_and_quiz(
        config,
        course_name=course["name"],
        module_title=module_skeleton["title"],
        lesson_titles=module_skeleton["lessonTitles"],
        blocks_min=config.volume.blocks_min,
        blocks_max=config.volume.blocks_max,
    )

    for lesson in lessons:
        _build_lesson(http, module["id"], lesson)

    if quiz is None:
        print(f"    [quiz] pulado (Groq nao retornou uma pergunta valida para \"{module_skeleton['title']}\")")
        return

    _build_module_quiz(http, module["id"], quiz)


def _build_module_quiz(http: HttpClient, module_id: str, quiz: dict) -> None:
    """
    Good practice for a module's curriculum: end it with a quick multiple-choice review of what it
    just taught, as its own lesson (a text block with the question, then a question block with the
    alternatives - QUESTION blocks carry no prompt field of their own).
    """
    lesson = http.post(f"/modules/{module_id}/lessons", {"title": "Revisão do módulo"})

    http.post(f"/lessons/{lesson['id']}/blocks", {
        "type": "text",
        "content": f"<p><strong>{quiz['prompt']}</strong></p>",
        "language": None,
    })

    alternatives = [
        {
            "id": str(uuid.uuid4()),
            "text": alternative["text"],
            "correct": alternative["correct"],
            "explanation": alternative["explanation"],
        }
        for alternative in quiz["alternatives"]
    ]
    http.post(f"/lessons/{lesson['id']}/blocks", {
        "type": "question",
        "content": json.dumps({"alternatives": alternatives}, ensure_ascii=False),
        "language": None,
    })

    print(f"    [quiz] \"{quiz['prompt']}\" ({len(alternatives)} alternativas)")


def _build_lesson(http: HttpClient, module_id: str, lesson_content: dict) -> None:
    lesson = http.post(f"/modules/{module_id}/lessons", {"title": lesson_content["title"]})

    for block in lesson_content["blocks"]:
        http.post(f"/lessons/{lesson['id']}/blocks", {
            "type": block["type"],
            "content": block["content"],
            "language": block["language"],
        })

    print(f"    [aula] \"{lesson_content['title']}\" ({len(lesson_content['blocks'])} blocos)")
