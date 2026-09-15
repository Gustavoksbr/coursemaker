"""
Publishes a course from a YouTube playlist using HAND-WRITTEN lesson content instead of a Groq
call - the third piece of the "Claude writes it" pipeline:

  1. dump_transcripts.py   fetches the playlist + real transcripts to a JSON file.
  2. (Claude reads that dump and writes a "content.json" with the same block/quiz shape
     Groq's real_content_generator.py used to produce - see its docstring for the exact rules:
     2-4 blocks per video grounded only in what the transcript actually says, one quiz per module
     of `lessons_per_module` videos with exactly one correct alternative.)
  3. This script reads the transcript dump (for video order/titles/thumbnail) and content.json
     (for the actual blocks/quiz text), and does the real API calls: curator, school, course,
     modules, lessons, blocks, quiz, publish - everything build_from_playlist.run_playlist_flow
     does, just with the content already decided instead of generated live.

Usage:
    .venv\\Scripts\\python.exe apply_playlist_course.py <transcript_dump.json> <content.json> \\
        --course-name "..." [--lessons-per-module 5]
"""
from __future__ import annotations

import argparse
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from build_from_playlist import build_attribution_html, chunk, pick_tech_area
from seeder.block_utils import sanitize_block, sanitize_quiz
from seeder.config import load_config
from seeder.curator import ensure_curator, ensure_school, grant_school_membership, login_admin
from seeder.http_client import ApiError, HttpClient
from seeder.swagger import verify_swagger


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("dump", help="JSON produced by dump_transcripts.py")
    parser.add_argument("content", help="JSON with hand-written blocks/quizzes")
    parser.add_argument("--course-name", required=True)
    parser.add_argument("--lessons-per-module", type=int, default=5)
    parser.add_argument("--categories", default="", help="Comma-separated stack/language tags, e.g. \"java,backend\".")
    return parser.parse_args()


def main() -> dict:
    args = parse_args()

    with open(args.dump, encoding="utf-8") as f:
        dump = json.load(f)
    with open(args.content, encoding="utf-8") as f:
        content = json.load(f)

    print(f"== Publicando \"{args.course_name}\" a partir de {args.dump} + {args.content} ==")

    config = load_config()
    verify_swagger(config.api_base_url)
    http = HttpClient(f"{config.api_base_url}/api/v1")

    print("[auth] preparando conta curadora...")
    curator_token, curator_user = ensure_curator(http, config)
    http.set_token(curator_token)

    print("[auth] preparando escola de origem...")
    admin_token = login_admin(http, config)
    channel = dump["channel"]
    playlist_url = f"https://www.youtube.com/playlist?list={dump['playlist_id']}"
    school = ensure_school(
        http, admin_token,
        name=channel["title"],
        description=(
            f"Selo de origem apenas: este material foi curado a partir do canal publico "
            f"\"{channel['title']}\". Nao ha parceria, afiliacao ou endosso oficial entre o "
            "Coursemaker e o canal ou seu criador - os videos permanecem hospedados no YouTube e "
            "sao apenas incorporados aqui."
        ),
        logo_url=channel.get("logo_url") or None,
        website_url=channel["url"],
    )
    grant_school_membership(http, admin_token, school["id"], curator_user["id"])

    areas = http.get("/areas", auth=False)
    if not areas:
        raise RuntimeError("Nenhuma area cadastrada no backend (GET /areas vazio).")
    area = pick_tech_area(areas)

    print(f"[curso] criando \"{args.course_name}\"...")
    course = http.post("/courses", {
        "name": args.course_name,
        "description": f"Curso baseado na playlist \"{dump['title']}\", do canal {channel['title']}.",
        "landingDescription": (dump.get("description") or channel.get("description") or args.course_name)[:2000],
        "thumbnailUrl": dump.get("thumbnail_url") or None,
        "visibility": "public",
        "categories": [c.strip() for c in args.categories.split(",") if c.strip()],
        "areaId": area["id"],
        "schoolId": school["id"],
    })

    for module in http.get(f"/courses/{course['id']}/modules"):
        http.delete(f"/modules/{module['id']}")

    intro_module = http.post(f"/courses/{course['id']}/modules", {"title": "Antes de começar"})
    intro_lesson = http.post(f"/modules/{intro_module['id']}/lessons", {"title": "Sobre este curso"})
    http.post(f"/lessons/{intro_lesson['id']}/blocks", {
        "type": "text",
        "content": build_attribution_html(channel["title"], channel["url"], playlist_url),
    })

    videos = dump["videos"]
    video_groups = chunk(videos, max(args.lessons_per_module, 1))
    quizzes = content.get("quizzes", [])

    for group_index, group in enumerate(video_groups, start=1):
        module_title = f"Parte {group_index} de {len(video_groups)}"
        print(f"\n[modulo {group_index}/{len(video_groups)}] \"{module_title}\" ({len(group)} aula(s))")
        module = http.post(f"/courses/{course['id']}/modules", {"title": module_title})

        any_transcribed = False
        for video in group:
            lesson = http.post(f"/modules/{module['id']}/lessons", {"title": video["title"][:255]})
            http.post(f"/lessons/{lesson['id']}/blocks", {
                "type": "video",
                "content": f"https://www.youtube.com/watch?v={video['video_id']}",
            })

            raw_blocks = content.get("videos", {}).get(video["video_id"], [])
            blocks = [b for b in (sanitize_block(block) for block in raw_blocks) if b]
            for block in blocks:
                http.post(f"/lessons/{lesson['id']}/blocks", {
                    "type": block["type"], "content": block["content"], "language": block["language"],
                })
            print(f"  [aula] \"{video['title']}\" -> {len(blocks)} bloco(s)")
            if video.get("transcript"):
                any_transcribed = True

        if any_transcribed and len(quizzes) >= group_index:
            quiz = sanitize_quiz(quizzes[group_index - 1])
            if quiz:
                quiz_lesson = http.post(f"/modules/{module['id']}/lessons", {"title": "Revisão do módulo"})
                http.post(f"/lessons/{quiz_lesson['id']}/blocks", {
                    "type": "text", "content": f"<p><strong>{quiz['prompt']}</strong></p>",
                })
                import uuid
                alternatives = [
                    {"id": str(uuid.uuid4()), "text": a["text"], "correct": a["correct"], "explanation": a["explanation"]}
                    for a in quiz["alternatives"]
                ]
                http.post(f"/lessons/{quiz_lesson['id']}/blocks", {
                    "type": "question", "content": json.dumps({"alternatives": alternatives}, ensure_ascii=False),
                })
                print(f"    [quiz] \"{quiz['prompt']}\"")

    if config.publish_courses:
        http.patch(f"/courses/{course['id']}", {"status": "available"})

    print(f"\nConcluido: /courses/{curator_user.get('nickname', config.curator.nickname)}/{course['slug']}")
    return course


if __name__ == "__main__":
    try:
        course = main()
    except ApiError as error:
        print("\nFalha na execucao:", file=sys.stderr)
        print(str(error), file=sys.stderr)
        if error.body:
            print(json.dumps(error.body, indent=2, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
