"""
Fetches a video's transcript so the content generator can ground lesson text in what the video
actually teaches, instead of inventing generic content from just the title.

Primary path: youtube-transcript-api reads the same caption track the YouTube player itself shows
under "CC" - no login, no download of audio/video. Most educational channels (Curso em Video
included) have either manual or auto-generated captions.

Fallback: for the rare video with captions disabled entirely, download audio only (yt-dlp) and
transcribe it with Groq's hosted Whisper endpoint - heavier (a real download + a real transcription
call), so it only runs when the primary path comes back empty.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import CouldNotRetrieveTranscript

from .config import Config

LANGUAGES = ["pt", "pt-BR", "pt-PT", "en"]
GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


def get_transcript(config: Config, video_id: str) -> str | None:
    text = _from_captions(video_id)
    if text:
        return text
    return _from_audio_whisper(config, video_id)


def _from_captions(video_id: str) -> str | None:
    try:
        api = YouTubeTranscriptApi()
        fetched = api.fetch(video_id, languages=LANGUAGES)
        text = " ".join(snippet.text for snippet in fetched).strip()
        return text or None
    except CouldNotRetrieveTranscript:
        return None
    except Exception:  # noqa: BLE001 - any other transcript-fetch failure just falls back
        return None


def _from_audio_whisper(config: Config, video_id: str) -> str | None:
    import yt_dlp  # imported lazily - only needed on the fallback path

    with tempfile.TemporaryDirectory() as tmp_dir:
        output_template = str(Path(tmp_dir) / "%(id)s.%(ext)s")
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_template,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "64",
            }],
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
        except Exception as error:  # noqa: BLE001 - download can fail in many ways, all non-fatal here
            print(f"    [transcript] download de audio falhou para {video_id}: {error}")
            return None

        audio_files = list(Path(tmp_dir).glob(f"{video_id}.*"))
        if not audio_files:
            return None

        try:
            with open(audio_files[0], "rb") as audio_file:
                response = requests.post(
                    GROQ_TRANSCRIPTION_URL,
                    headers={"Authorization": f"Bearer {config.groq.api_key}"},
                    files={"file": (audio_files[0].name, audio_file, "audio/mpeg")},
                    data={"model": "whisper-large-v3-turbo", "response_format": "text"},
                    timeout=300,
                )
            if not response.ok:
                print(f"    [transcript] Groq Whisper respondeu {response.status_code} para {video_id}")
                return None
            return response.text.strip() or None
        except requests.RequestException as error:
            print(f"    [transcript] transcricao via Whisper falhou para {video_id}: {error}")
            return None
