from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from pipeline.captions_extract import TranscriptSegment, extract_captions
from pipeline.config import load_config
from pipeline.db import _init_client, get_known_video_ids, insert_discovered_videos
from pipeline.discover import discover, extract_problem_number, filter_new_videos
from pipeline.download import download_video, video_id_from_url
from pipeline.segment import DetectedSegment, detect_segments, load_segments, save_segments
from pipeline.transcribe import transcribe

log = logging.getLogger(__name__)


def _fmt_time(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m:02d}:{s:02d}"


def _cmd_discover(args: argparse.Namespace) -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    config = load_config()
    videos = discover(config)

    client = _init_client(config)
    known_ids = get_known_video_ids(client)
    new_videos = filter_new_videos(videos, known_ids)

    if not new_videos:
        print("No new videos found.")
        return

    inserted = insert_discovered_videos(client, new_videos)
    print(f"Discovered {len(videos)} videos, {len(new_videos)} new, {inserted} persisted.")
    for v in new_videos:
        problem = f" (LC #{v.problem_number})" if v.problem_number else ""
        print(f"  • {v.title}{problem}")


def _print_transcript_summary(segments: list[TranscriptSegment], source: str) -> None:
    print(f"  Source: {source}")
    print(f"  Segments: {len(segments)}")
    if segments:
        duration = segments[-1].end - segments[0].start
        print(f"  Coverage: {segments[0].start:.1f}s – {segments[-1].end:.1f}s ({duration:.1f}s)")
        preview = segments[0].text[:80]
        if len(segments[0].text) > 80:
            preview += "..."
        print(f'  Preview: "{preview}"')


def _print_segment_review(
    segments: list[DetectedSegment],
    transcript: list[TranscriptSegment] | None = None,
) -> None:
    for i, seg in enumerate(segments):
        duration = seg.end_time - seg.start_time
        time_range = f"{_fmt_time(seg.start_time)}-{_fmt_time(seg.end_time)}"
        topics = ", ".join(seg.topics) if seg.topics else "—"

        print(f"\n{'─' * 60}")
        print(f"  [{i + 1}] {seg.title}")
        print(f"  Time: {time_range} ({duration:.0f}s)  |  Difficulty: {seg.difficulty}")
        print(f"  Topics: {topics}")
        print(f"  Hook: {seg.hook}")

        if transcript:
            matching = [
                t for t in transcript
                if t.end > seg.start_time and t.start < seg.end_time
            ]
            if matching:
                print(f"\n  Transcript ({len(matching)} segments):")
                for t in matching:
                    print(f"    [{_fmt_time(t.start)}] {t.text}")

    print(f"\n{'─' * 60}")


def _load_transcript(output_dir: Path) -> list[TranscriptSegment] | None:
    transcript_files = list(output_dir.glob("*.transcript.json"))
    if not transcript_files:
        return None
    data = json.loads(transcript_files[0].read_text(encoding="utf-8"))
    return [TranscriptSegment(start=s["start"], end=s["end"], text=s["text"]) for s in data]


def _cmd_process(args: argparse.Namespace) -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    config = load_config()

    video_id = video_id_from_url(args.youtube_url)
    output_dir = Path("tmp") / video_id

    print(f"Downloading: {args.youtube_url}")
    result = download_video(args.youtube_url, output_dir)
    print(f"  Video: {result.video_path}")
    print(f"  Audio: {result.audio_path}")
    if result.caption_path:
        print(f"  Captions file: {result.caption_path}")

    print("\nExtracting captions...")
    segments = extract_captions(args.youtube_url, output_dir)

    if segments:
        print("\nTranscript ready:")
        _print_transcript_summary(segments, "YouTube captions")
    else:
        print("  No captions available — running Whisper transcription fallback")
        mode = "cloud (gpt-4o-mini-transcribe)" if args.cloud_transcribe else "local (faster-whisper large-v2)"
        print(f"  Mode: {mode}")
        segments = transcribe(result.audio_path, config, cloud=args.cloud_transcribe)
        print("\nTranscript ready:")
        _print_transcript_summary(segments, f"Whisper ({mode})")

    import yt_dlp
    with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
        info = ydl.extract_info(args.youtube_url, download=False)
    video_duration = float(info.get("duration", 0))
    video_title = info.get("title", "")
    problem_number = extract_problem_number(video_title)

    print(f"\nDetecting segments via {args.provider}...")
    detected = detect_segments(
        segments,
        video_title,
        problem_number,
        video_duration,
        config,
        provider=args.provider,
    )
    save_segments(detected, output_dir)

    print(f"\nDetected {len(detected)} segments:")
    _print_segment_review(detected, segments)


def _cmd_batch(args: argparse.Namespace) -> None:
    print("Batch processing not yet implemented")


def _cmd_review(args: argparse.Namespace) -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    output_dir = Path("tmp") / args.video_id

    try:
        segments = load_segments(output_dir)
    except FileNotFoundError:
        print(f"No segments.json found in {output_dir}")
        print("Run 'leettok process <url>' first to generate segments.")
        sys.exit(1)

    transcript = _load_transcript(output_dir)

    print(f"Review: {args.video_id} — {len(segments)} segments")
    _print_segment_review(segments, transcript)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="leettok",
        description="NeetCode Clipping Engine — detect, extract, and publish viral coding clips",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("discover", help="Find new videos from NeetCode's channel")

    process_p = sub.add_parser("process", help="Run the full pipeline on a single video")
    process_p.add_argument("youtube_url", help="YouTube video URL to process")
    process_p.add_argument(
        "--cloud-transcribe",
        action="store_true",
        default=False,
        help="Use OpenAI gpt-4o-mini-transcribe instead of local faster-whisper for Whisper fallback",
    )
    process_p.add_argument(
        "--provider",
        choices=["openai", "anthropic"],
        default="openai",
        help="LLM provider for segment detection (default: openai)",
    )

    batch_p = sub.add_parser("batch", help="Discover new videos and process all of them")
    batch_p.add_argument(
        "--auto-approve",
        action="store_true",
        default=False,
        help="Automatically approve all detected segments without review",
    )

    review_p = sub.add_parser("review", help="Review detected segments for a video")
    review_p.add_argument("video_id", help="Video ID to review")

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    dispatch = {
        "discover": _cmd_discover,
        "process": _cmd_process,
        "batch": _cmd_batch,
        "review": _cmd_review,
    }

    handler = dispatch.get(args.command)
    if handler is None:
        parser.print_help()
        sys.exit(1)

    handler(args)


if __name__ == "__main__":
    main()
