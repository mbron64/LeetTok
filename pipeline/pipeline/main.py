from __future__ import annotations

import shutil
import time
from pathlib import Path

import yt_dlp

from pipeline.captions_extract import TranscriptSegment, extract_captions
from pipeline.captions_render import produce_final_clip
from pipeline.challenges import (
    MadLeetsChallenge,
    generate_answer_variations,
    generate_challenge,
    save_challenge,
)
from pipeline.clip import clip_and_reframe
from pipeline.config import Config
from pipeline.db import (
    _init_client,
    get_known_video_ids,
    insert_clip_metadata,
    insert_discovered_videos,
    update_video_status,
)
from pipeline.discover import discover, extract_problem_number, filter_new_videos
from pipeline.download import DownloadResult, download_video, video_id_from_url
from pipeline.log import get_logger
from pipeline.retry import with_retry
from pipeline.segment import DetectedSegment, detect_segments, save_segments
from pipeline.transcribe import transcribe
from pipeline.upload import upload_all_clips

log = get_logger(__name__)


@with_retry(max_attempts=3, retryable_exceptions=(ConnectionError, TimeoutError, OSError))
def _download_with_retry(video_url: str, output_dir: Path) -> DownloadResult:
    return download_video(video_url, output_dir)


@with_retry(max_attempts=3, retryable_exceptions=(ConnectionError, TimeoutError, OSError))
def _upload_with_retry(clip_paths: list[Path], video_id: str, config: Config) -> list[str]:
    return upload_all_clips(clip_paths, video_id, config)


@with_retry(max_attempts=2, retryable_exceptions=(ConnectionError, TimeoutError))
def _detect_segments_with_retry(
    transcript: list[TranscriptSegment],
    title: str,
    problem_number: int | None,
    duration: float,
    config: Config,
    provider: str,
) -> list[DetectedSegment]:
    return detect_segments(transcript, title, problem_number, duration, config, provider)


def _timed(label: str, fn, *args, **kwargs):
    t0 = time.monotonic()
    result = fn(*args, **kwargs)
    elapsed = time.monotonic() - t0
    log.info("%s in %.1fs", label, elapsed)
    return result


def process_video(
    video_url: str,
    config: Config,
    provider: str = "openai",
    crop_strategy: str = "code_focused",
    cloud_transcribe: bool = False,
    dry_run: bool = False,
) -> None:
    video_id = video_id_from_url(video_url)
    output_dir = Path("tmp") / video_id
    output_dir.mkdir(parents=True, exist_ok=True)
    client = _init_client(config)

    log.info("Processing video %s", video_id)

    try:
        # Download
        update_video_status(client, video_id, "downloading")
        dl: DownloadResult = _timed(
            f"Downloaded video {video_id}",
            _download_with_retry,
            video_url,
            output_dir,
        )

        # Fetch video metadata for segment detection
        with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
            info = ydl.extract_info(video_url, download=False)
        video_duration = float(info.get("duration", 0))
        video_title = info.get("title", "")
        problem_number = extract_problem_number(video_title)

        # Transcribe
        update_video_status(client, video_id, "transcribing")
        transcript: list[TranscriptSegment] | None = _timed(
            f"Extracted captions for {video_id}",
            extract_captions,
            video_url,
            output_dir,
        )
        if transcript is None:
            log.info("No captions available, falling back to Whisper")
            transcript = _timed(
                f"Transcribed {video_id}",
                transcribe,
                dl.audio_path,
                config,
                cloud_transcribe,
            )

        # Segment detection
        update_video_status(client, video_id, "segmenting")
        segments: list[DetectedSegment] = _timed(
            f"Detected segments for {video_id}",
            _detect_segments_with_retry,
            transcript,
            video_title,
            problem_number,
            video_duration,
            config,
            provider,
        )
        save_segments(segments, output_dir)
        log.info("Found %d segments for %s", len(segments), video_id)

        if dry_run:
            log.info("Dry run — skipping clipping, captioning, and upload for %s", video_id)
            return

        if not segments:
            log.warning("No segments detected for %s, marking done", video_id)
            update_video_status(client, video_id, "done")
            return

        # Clip + reframe
        update_video_status(client, video_id, "clipping")
        vertical_clips: list[Path] = _timed(
            f"Clipped {len(segments)} segments for {video_id}",
            clip_and_reframe,
            dl.video_path,
            segments,
            output_dir,
            crop_strategy,
        )

        # Burn captions into each clip
        final_clips: list[Path] = []
        clips_dir = output_dir / "clips"
        for i, (vclip, seg) in enumerate(zip(vertical_clips, segments)):
            final_path = clips_dir / f"{i}_final.mp4"
            _timed(
                f"Burned captions into clip {i}",
                produce_final_clip,
                vclip,
                transcript,
                seg.start_time,
                seg.end_time,
                final_path,
            )
            final_clips.append(final_path)

        # Generate MadLeets challenges for each clip
        challenges_dir = output_dir / "challenges"
        challenges: list[MadLeetsChallenge | None] = []
        for i, seg in enumerate(segments):
            challenge = _timed(
                f"Generated challenge for clip {i}",
                generate_challenge,
                transcript,
                video_title,
                problem_number or 0,
                seg.start_time,
                seg.end_time,
                config,
                provider,
            )
            if challenge is not None:
                _timed(
                    f"Generated answer variations for clip {i}",
                    generate_answer_variations,
                    challenge,
                    config,
                    provider,
                )
                save_challenge(challenge, challenges_dir / f"{i}_challenge.json")
            challenges.append(challenge)

        challenge_count = sum(1 for c in challenges if c is not None)
        log.info(
            "Generated %d/%d MadLeets challenges for %s",
            challenge_count, len(segments), video_id,
        )

        # Upload to R2
        urls: list[str] = _timed(
            f"Uploaded {len(final_clips)} clips for {video_id}",
            _upload_with_retry,
            final_clips,
            video_id,
            config,
        )

        # Persist clip metadata
        for i, (seg, url) in enumerate(zip(segments, urls)):
            insert_clip_metadata(client, {
                "video_id": video_id,
                "segment_index": i,
                "title": seg.title,
                "hook": seg.hook,
                "difficulty": seg.difficulty,
                "topics": seg.topics,
                "start_time": seg.start_time,
                "end_time": seg.end_time,
                "url": url,
            })

        update_video_status(client, video_id, "done")
        log.info("Video %s complete — %d clips published", video_id, len(urls))

        # Cleanup
        shutil.rmtree(output_dir, ignore_errors=True)
        log.info("Cleaned up %s", output_dir)

    except Exception as exc:
        log.exception("Failed processing video %s", video_id)
        update_video_status(client, video_id, "failed", error=str(exc)[:500])


def process_batch(
    config: Config,
    provider: str = "openai",
    crop_strategy: str = "code_focused",
    cloud_transcribe: bool = False,
    dry_run: bool = False,
) -> None:
    log.info("Starting batch run")
    client = _init_client(config)

    t0 = time.monotonic()
    videos = discover(config)
    known_ids = get_known_video_ids(client)
    new_videos = filter_new_videos(videos, known_ids)

    if not new_videos:
        log.info("No new videos found")
        return

    inserted = insert_discovered_videos(client, new_videos)
    log.info(
        "Discovered %d videos, %d new, %d persisted in %.1fs",
        len(videos),
        len(new_videos),
        inserted,
        time.monotonic() - t0,
    )

    for v in new_videos:
        log.info("Processing: %s (%s)", v.title, v.url)
        process_video(
            v.url,
            config,
            provider=provider,
            crop_strategy=crop_strategy,
            cloud_transcribe=cloud_transcribe,
            dry_run=dry_run,
        )

    log.info("Batch complete — processed %d videos", len(new_videos))
