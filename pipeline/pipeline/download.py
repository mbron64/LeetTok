from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import yt_dlp

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class DownloadResult:
    video_path: Path
    audio_path: Path
    caption_path: Path | None


def video_id_from_url(url: str) -> str:
    parsed = urlparse(url)

    if parsed.hostname in ("youtu.be",):
        vid = parsed.path.lstrip("/")
        if vid:
            return vid.split("/")[0]

    if parsed.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        qs = parse_qs(parsed.query)
        if "v" in qs:
            return qs["v"][0]

    raise ValueError(f"Could not extract video ID from URL: {url}")


def _find_caption_file(directory: Path, video_id: str) -> Path | None:
    for ext in (".srt", ".vtt"):
        for f in directory.glob(f"{video_id}*{ext}"):
            return f
    return None


def download_video(video_url: str, output_dir: Path) -> DownloadResult:
    output_dir.mkdir(parents=True, exist_ok=True)

    ydl_opts: dict = {
        "format": "best[height<=1080]/best",
        "outtmpl": str(output_dir / "%(id)s.%(ext)s"),
        "keepvideo": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en"],
        "subtitlesformat": "srt",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
            },
        ],
        "postprocessor_args": {
            "FFmpegExtractAudio": ["-ar", "16000", "-ac", "1"],
        },
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        video_id = info["id"]
        video_path = Path(ydl.prepare_filename(info))

    audio_path = video_path.with_suffix(".wav")

    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found at {video_path}")
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found at {audio_path}")

    caption_path = _find_caption_file(output_dir, video_id)

    log.info(
        "Download complete: video=%s  audio=%s  captions=%s",
        video_path,
        audio_path,
        caption_path,
    )

    return DownloadResult(
        video_path=video_path,
        audio_path=audio_path,
        caption_path=caption_path,
    )
