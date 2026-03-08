from __future__ import annotations

import logging
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

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


@dataclass(frozen=True, slots=True)
class ClipRecord:
    video_url: str
    title: str
    hook: str
    duration: float
    difficulty: str
    topics: list[str]
    problem_number: int | None
    source_video_id: str
    transcript: str
    start_time: float
    end_time: float


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


def _upsert_problem(client: Client, clip: ClipRecord) -> int:
    if clip.problem_number is None:
        resp = (
            client.table("problems")
            .insert({"title": clip.title, "difficulty": clip.difficulty, "topics": clip.topics})
            .execute()
        )
        return resp.data[0]["id"]

    existing = (
        client.table("problems")
        .select("id")
        .eq("problem_number", clip.problem_number)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]

    resp = (
        client.table("problems")
        .insert({
            "problem_number": clip.problem_number,
            "title": clip.title,
            "difficulty": clip.difficulty,
            "topics": clip.topics,
        })
        .execute()
    )
    return resp.data[0]["id"]


def insert_clip_metadata(client: Client, clip: ClipRecord) -> None:
    try:
        problem_id = _upsert_problem(client, clip)

        row = {
            "problem_id": problem_id,
            "source_video_id": clip.source_video_id,
            "video_url": clip.video_url,
            "title": clip.title,
            "hook": clip.hook,
            "duration": clip.duration,
            "difficulty": clip.difficulty,
            "topics": clip.topics,
            "transcript": clip.transcript,
            "start_time": clip.start_time,
            "end_time": clip.end_time,
        }
        client.table("clips").insert(row).execute()
        log.info(
            "Inserted clip '%s' for video %s (problem_id=%d)",
            clip.title, clip.source_video_id, problem_id,
        )
    except Exception:
        log.exception("Failed to insert clip metadata for '%s'", clip.title)
        raise


def mark_video_done(client: Client, video_id: str) -> None:
    update_video_status(client, video_id, "done")


def cleanup_tmp(video_id: str, base_dir: Path) -> None:
    tmp_dir = base_dir / "tmp" / video_id
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
        log.info("Cleaned up %s", tmp_dir)
    else:
        log.debug("No tmp directory to clean for %s", video_id)
