from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime

from googleapiclient.discovery import build

from pipeline.config import Config

log = logging.getLogger(__name__)

NEETCODE_HANDLE = "@NeetCode"
YOUTUBE_VIDEO_URL = "https://www.youtube.com/watch?v={video_id}"
MAX_RESULTS = 50

_PROBLEM_RE = re.compile(
    r"(?:leet|neet)\s*code\s*(?:#\s*)?(\d+)", re.IGNORECASE
)
_DASH_NUM_RE = re.compile(
    r"[-–—]\s*(?:leet|neet)\s*code\s*(\d+)", re.IGNORECASE
)
_TRAILING_NUM_RE = re.compile(
    r"[-–—]\s*#?\s*(\d+)\s*$"
)


@dataclass(frozen=True, slots=True)
class DiscoveredVideo:
    video_id: str
    title: str
    url: str
    published_at: datetime
    problem_number: int | None


def _build_youtube(api_key: str):
    return build("youtube", "v3", developerKey=api_key, cache_discovery=False)


def resolve_channel_id(youtube, handle: str = NEETCODE_HANDLE) -> str:
    resp = youtube.channels().list(
        part="id",
        forHandle=handle,
    ).execute()

    items = resp.get("items", [])
    if not items:
        raise LookupError(f"Could not resolve channel for handle {handle}")
    return items[0]["id"]


def extract_problem_number(title: str) -> int | None:
    for pattern in (_PROBLEM_RE, _DASH_NUM_RE, _TRAILING_NUM_RE):
        match = pattern.search(title)
        if match:
            return int(match.group(1))
    return None


def fetch_recent_videos(youtube, channel_id: str, max_results: int = MAX_RESULTS) -> list[DiscoveredVideo]:
    resp = youtube.search().list(
        part="snippet",
        channelId=channel_id,
        type="video",
        order="date",
        maxResults=max_results,
    ).execute()

    videos: list[DiscoveredVideo] = []
    for item in resp.get("items", []):
        vid_id = item["id"]["videoId"]
        snippet = item["snippet"]
        title = snippet["title"]
        published = datetime.fromisoformat(
            snippet["publishedAt"].replace("Z", "+00:00")
        )
        videos.append(
            DiscoveredVideo(
                video_id=vid_id,
                title=title,
                url=YOUTUBE_VIDEO_URL.format(video_id=vid_id),
                published_at=published,
                problem_number=extract_problem_number(title),
            )
        )
    return videos


def filter_new_videos(
    videos: list[DiscoveredVideo], known_ids: set[str]
) -> list[DiscoveredVideo]:
    return [v for v in videos if v.video_id not in known_ids]


def discover(config: Config) -> list[DiscoveredVideo]:
    log.info("Building YouTube API client")
    youtube = _build_youtube(config.youtube_api_key)

    log.info("Resolving NeetCode channel ID")
    channel_id = resolve_channel_id(youtube)
    log.info("Channel ID: %s", channel_id)

    log.info("Fetching recent uploads")
    videos = fetch_recent_videos(youtube, channel_id)
    log.info("Found %d videos", len(videos))

    return videos
