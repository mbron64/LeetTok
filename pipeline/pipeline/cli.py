from __future__ import annotations

import argparse
import logging
import sys

from pipeline.config import load_config
from pipeline.db import _init_client, get_known_video_ids, insert_discovered_videos
from pipeline.discover import discover, filter_new_videos

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
    print(f"Processing not yet implemented for: {args.youtube_url}")


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
