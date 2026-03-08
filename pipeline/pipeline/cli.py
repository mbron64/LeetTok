from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from pipeline.captions_extract import extract_captions
from pipeline.config import load_config
from pipeline.db import _init_client, get_known_video_ids, insert_discovered_videos
from pipeline.discover import discover, filter_new_videos
from pipeline.download import download_video, video_id_from_url

log = logging.getLogger(__name__)


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


def _cmd_process(args: argparse.Namespace) -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    load_config()

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
        print(f"  Found {len(segments)} caption segments")
        coverage = f"{segments[0].start:.1f}s – {segments[-1].end:.1f}s"
        print(f"  Coverage: {coverage}")
        preview = segments[0].text[:80]
        if len(segments[0].text) > 80:
            preview += "..."
        print(f'  Preview: "{preview}"')
    else:
        print("  No captions available — Whisper fallback needed")


def _cmd_batch(args: argparse.Namespace) -> None:
    print("Batch processing not yet implemented")


def _cmd_review(args: argparse.Namespace) -> None:
    print(f"Review not yet implemented for video_id: {args.video_id}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="leettok",
        description="NeetCode Clipping Engine — detect, extract, and publish viral coding clips",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("discover", help="Find new videos from NeetCode's channel")

    process_p = sub.add_parser("process", help="Run the full pipeline on a single video")
    process_p.add_argument("youtube_url", help="YouTube video URL to process")

    sub.add_parser("batch", help="Discover new videos and process all of them")

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
