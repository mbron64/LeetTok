from __future__ import annotations

import logging
from datetime import datetime, timezone

from supabase import create_client, Client

from pipeline.config import Config
from pipeline.discover import DiscoveredVideo

log = logging.getLogger(__name__)

VALID_STATUSES = {
    "discovered",
    "downloading",
    "transcribing",
    "segmenting",
    "clipping",
    "done",
    "failed",
}


def _init_client(config: Config) -> Client:
    return create_client(config.supabase_url, config.supabase_key)


def get_known_video_ids(client: Client) -> set[str]:
    try:
        resp = client.table("videos").select("video_id").execute()
        return {row["video_id"] for row in resp.data}
    except Exception:
        log.exception("Failed to fetch known video IDs")
        return set()


def insert_discovered_videos(client: Client, videos: list[DiscoveredVideo]) -> int:
    if not videos:
        return 0

    rows = [
        {
            "video_id": v.video_id,
            "title": v.title,
            "url": v.url,
            "published_at": v.published_at.isoformat(),
            "problem_number": v.problem_number,
            "status": "discovered",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        for v in videos
    ]

    try:
        resp = client.table("videos").insert(rows).execute()
        inserted = len(resp.data)
        log.info("Inserted %d videos", inserted)
        return inserted
    except Exception:
        log.exception("Failed to insert discovered videos")
        return 0


def update_video_status(
    client: Client,
    video_id: str,
    status: str,
    error: str | None = None,
) -> None:
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status {status!r}; must be one of {VALID_STATUSES}")

    payload: dict = {"status": status}
    if error is not None:
        payload["error"] = error
    if status == "failed":
        payload["failed_at"] = datetime.now(timezone.utc).isoformat()

    try:
        client.table("videos").update(payload).eq("video_id", video_id).execute()
        log.info("Updated video %s → %s", video_id, status)
    except Exception:
        log.exception("Failed to update status for video %s", video_id)


def insert_clip_metadata(client: Client, clip: dict) -> None:
    try:
        client.table("clips").insert(clip).execute()
        log.info("Inserted clip for video %s", clip.get("video_id", "?"))
    except Exception:
        log.exception("Failed to insert clip metadata")
