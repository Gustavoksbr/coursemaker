"""
Fetches a playlist's videos + real transcripts and dumps them to a JSON file, WITHOUT calling Groq
for content generation - the transcript fetch itself (captions primary, Whisper-audio fallback for
videos with captions disabled) is unrelated to the chat-completion daily quota that kept getting
exhausted, so it still runs the normal way.

This is the first half of the "Claude writes the lesson content itself" pipeline: this script gets
the raw material, Claude reads the dump and writes blocks/quizzes by hand, and
`apply_playlist_course.py` (a separate script) publishes them - see that script's own docstring.

Usage:
    .venv\\Scripts\\python.exe dump_transcripts.py <playlist_id> <output.json> [--max-videos N]
"""
from __future__ import annotations

import argparse
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from seeder.config import load_config, require_youtube_api_key
from seeder.transcript import get_transcript
from seeder.youtube_playlist import fetch_playlist


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("playlist")
    parser.add_argument("output")
    parser.add_argument("--max-videos", type=int, default=None)
    parser.add_argument("--exclude", default=None)
    args = parser.parse_args()

    config = load_config()
    youtube_api_key = require_youtube_api_key(config)

    playlist = fetch_playlist(youtube_api_key, args.playlist)
    videos = playlist.videos

    excluded_ids = {v.strip() for v in args.exclude.split(",") if v.strip()} if args.exclude else set()
    if excluded_ids:
        videos = [v for v in videos if v.video_id not in excluded_ids]
    if args.max_videos:
        videos = videos[: args.max_videos]

    print(f'"{playlist.title}" (canal: {playlist.channel.title}) - {len(videos)} video(s)')

    dump = {
        "playlist_id": playlist.id,
        "title": playlist.title,
        "description": playlist.description,
        "thumbnail_url": playlist.thumbnail_url,
        "channel": {
            "title": playlist.channel.title,
            "description": playlist.channel.description,
            "url": playlist.channel.url,
            "logo_url": playlist.channel.logo_url,
        },
        "videos": [],
    }

    for i, video in enumerate(videos, start=1):
        print(f"  [{i}/{len(videos)}] \"{video.title}\" - buscando transcricao...")
        transcript = get_transcript(config, video.video_id)
        print(f"    -> {'OK, ' + str(len(transcript)) + ' chars' if transcript else 'SEM TRANSCRICAO'}")
        dump["videos"].append({
            "video_id": video.video_id,
            "title": video.title,
            "description": video.description,
            "transcript": transcript,
        })

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(dump, f, ensure_ascii=False, indent=2)
    print(f"\nSalvo em {args.output}")


if __name__ == "__main__":
    main()
