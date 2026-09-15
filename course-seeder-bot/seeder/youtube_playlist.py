"""Resolves a playlist URL into channel info and an ordered list of real videos via the YouTube Data API."""
from __future__ import annotations

import re
from dataclasses import dataclass

import requests

API_BASE = "https://www.googleapis.com/youtube/v3"


@dataclass(frozen=True)
class ChannelInfo:
    id: str
    title: str
    description: str
    url: str
    logo_url: str


@dataclass(frozen=True)
class PlaylistVideo:
    video_id: str
    title: str
    description: str
    position: int


@dataclass(frozen=True)
class PlaylistInfo:
    id: str
    title: str
    description: str
    thumbnail_url: str
    channel: ChannelInfo
    videos: list[PlaylistVideo]


def extract_playlist_id(url_or_id: str) -> str:
    match = re.search(r"[?&]list=([\w-]+)", url_or_id)
    if match:
        return match.group(1)
    if re.fullmatch(r"[\w-]{10,}", url_or_id.strip()):
        return url_or_id.strip()
    raise ValueError(f"Nao foi possivel extrair um playlist ID de: {url_or_id}")


def fetch_playlist(api_key: str, url_or_id: str) -> PlaylistInfo:
    playlist_id = extract_playlist_id(url_or_id)

    playlist_data = _get(api_key, "playlists", {"part": "snippet", "id": playlist_id})
    items = playlist_data.get("items") or []
    if not items:
        raise ValueError(f"Playlist nao encontrada ou privada: {playlist_id}")
    snippet = items[0]["snippet"]

    channel = _fetch_channel(api_key, snippet["channelId"])
    videos = _fetch_all_videos(api_key, playlist_id)

    # A playlist's own thumbnail is usually just whatever its first video's thumbnail is anyway,
    # but it's occasionally missing/generic (older playlists) - falling back to the first video's
    # own thumbnail, built without another API call since YouTube's thumbnail URLs are
    # deterministic from the video id. hqdefault always exists; maxresdefault does not (only for
    # videos uploaded in HD), so hqdefault is the safe default-quality choice.
    thumbnail_url = _best_thumbnail(snippet.get("thumbnails") or {})
    if not thumbnail_url and videos:
        thumbnail_url = f"https://i.ytimg.com/vi/{videos[0].video_id}/hqdefault.jpg"

    return PlaylistInfo(
        id=playlist_id,
        title=snippet["title"],
        description=snippet.get("description", ""),
        thumbnail_url=thumbnail_url,
        channel=channel,
        videos=videos,
    )


def _best_thumbnail(thumbnails: dict) -> str:
    for size in ("maxres", "high", "medium", "default"):
        url = thumbnails.get(size, {}).get("url")
        if url:
            return url
    return ""


def _fetch_channel(api_key: str, channel_id: str) -> ChannelInfo:
    data = _get(api_key, "channels", {"part": "snippet", "id": channel_id})
    items = data.get("items") or []
    if not items:
        raise ValueError(f"Canal nao encontrado: {channel_id}")
    snippet = items[0]["snippet"]
    custom_url = snippet.get("customUrl")
    url = f"https://www.youtube.com/{custom_url}" if custom_url else f"https://www.youtube.com/channel/{channel_id}"
    thumbnails = snippet.get("thumbnails") or {}
    logo = (thumbnails.get("high") or thumbnails.get("default") or {}).get("url", "")

    return ChannelInfo(
        id=channel_id,
        title=snippet["title"],
        description=snippet.get("description", ""),
        url=url,
        logo_url=logo,
    )


def _fetch_all_videos(api_key: str, playlist_id: str) -> list[PlaylistVideo]:
    videos = []
    page_token = None

    while True:
        params = {"part": "snippet", "playlistId": playlist_id, "maxResults": 50}
        if page_token:
            params["pageToken"] = page_token

        data = _get(api_key, "playlistItems", params)
        for item in data.get("items") or []:
            snippet = item["snippet"]
            resource = snippet.get("resourceId") or {}
            if resource.get("kind") != "youtube#video":
                continue
            # A video removed/made private by its owner still occupies a playlist slot; the API
            # marks its title this way instead of omitting the item.
            if snippet.get("title") in ("Private video", "Deleted video"):
                continue
            videos.append(PlaylistVideo(
                video_id=resource["videoId"],
                title=snippet["title"],
                description=snippet.get("description", ""),
                position=snippet.get("position", len(videos)),
            ))

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return videos


def _get(api_key: str, endpoint: str, params: dict) -> dict:
    response = requests.get(f"{API_BASE}/{endpoint}", params={**params, "key": api_key}, timeout=30)
    if not response.ok:
        raise RuntimeError(f"YouTube API respondeu {response.status_code} em {endpoint}: {response.text[:300]}")
    return response.json()
