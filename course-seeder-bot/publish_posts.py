"""One-off: publishes hand-written posts (title/description/blocks JSON) as the curator."""
from __future__ import annotations

import argparse
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from build_from_playlist import pick_tech_area
from seeder.config import load_config
from seeder.curator import ensure_curator
from seeder.http_client import ApiError, HttpClient
from seeder.swagger import verify_swagger


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("posts_json")
    args = parser.parse_args()

    with open(args.posts_json, encoding="utf-8") as f:
        posts = json.load(f)

    config = load_config()
    verify_swagger(config.api_base_url)
    http = HttpClient(f"{config.api_base_url}/api/v1")

    token, user = ensure_curator(http, config)
    http.set_token(token)

    existing = {p["title"]: p for p in http.get(f"/posts?author={user['nickname']}&size=100")["items"]}
    areas = http.get("/areas", auth=False)
    area = pick_tech_area(areas)

    for post in posts:
        if post["title"] in existing:
            print(f"  [pulado] \"{post['title']}\" ja existe")
            continue

        print(f"[post] criando \"{post['title']}\"...")
        created = http.post("/posts", {
            "title": post["title"],
            "description": post["description"],
            "visibility": "public",
            "categories": [],
            "areaId": area["id"],
        })

        for block in post["blocks"]:
            http.post(f"/posts/{created['id']}/blocks", {
                "type": block["type"],
                "content": block["content"],
                "language": block.get("language"),
            })

        if config.publish_courses:
            http.patch(f"/posts/{created['id']}", {"status": "available"})

        print(f"  Concluido: /posts/{user.get('nickname')}/{created['slug']}")


if __name__ == "__main__":
    try:
        main()
    except ApiError as error:
        print("\nFalha:", file=sys.stderr)
        print(str(error), file=sys.stderr)
        if error.body:
            print(json.dumps(error.body, indent=2, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
