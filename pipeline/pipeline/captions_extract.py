from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path

import yt_dlp

log = logging.getLogger(__name__)

_TIMESTAMP_RE = re.compile(r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})")
_CUE_RE = re.compile(
    r"(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})"
)
_HTML_TAG_RE = re.compile(r"<[^>]+>")


@dataclass(frozen=True, slots=True)
class TranscriptSegment:
    start: float
    end: float
    text: str


def _parse_timestamp(ts: str) -> float:
    m = _TIMESTAMP_RE.match(ts.strip())
    if not m:
        raise ValueError(f"Invalid timestamp: {ts!r}")
    hours, minutes, seconds, millis = m.groups()
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(millis) / 1000


def _parse_caption_file(path: Path) -> list[TranscriptSegment]:
    content = path.read_text(encoding="utf-8")
    segments: list[TranscriptSegment] = []

    blocks = re.split(r"\n\s*\n", content)

    for block in blocks:
        lines = block.strip().split("\n")

        timing_idx = -1
        for i, line in enumerate(lines):
            if _CUE_RE.search(line):
                timing_idx = i
                break

        if timing_idx == -1:
            continue

        match = _CUE_RE.search(lines[timing_idx])
        assert match is not None
        start = _parse_timestamp(match.group(1))
        end = _parse_timestamp(match.group(2))

        text_lines = lines[timing_idx + 1 :]
        text = " ".join(line.strip() for line in text_lines if line.strip())
        text = _HTML_TAG_RE.sub("", text).strip()

        if text:
            segments.append(TranscriptSegment(start=start, end=end, text=text))

    return segments


def _find_caption_file(directory: Path, video_id: str) -> Path | None:
    for ext in (".srt", ".vtt"):
        for f in directory.glob(f"{video_id}*{ext}"):
            return f
    return None


def extract_captions(
    video_url: str, output_dir: Path
) -> list[TranscriptSegment] | None:
    output_dir.mkdir(parents=True, exist_ok=True)

    with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
        info = ydl.extract_info(video_url, download=False)

    video_id: str = info["id"]
    subtitles = info.get("subtitles") or {}
    auto_captions = info.get("automatic_captions") or {}

    has_manual_en = "en" in subtitles
    has_auto_en = "en" in auto_captions

    if not has_manual_en and not has_auto_en:
        log.info("No English captions available for %s", video_id)
        return None

    source = "manual" if has_manual_en else "auto-generated"
    log.info("Using %s English captions for %s", source, video_id)

    ydl_opts: dict = {
        "skip_download": True,
        "writesubtitles": has_manual_en,
        "writeautomaticsub": not has_manual_en,
        "subtitleslangs": ["en"],
        "subtitlesformat": "srt",
        "outtmpl": str(output_dir / "%(id)s.%(ext)s"),
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])

    caption_file = _find_caption_file(output_dir, video_id)
    if caption_file is None:
        log.warning("Caption download succeeded but no file found for %s", video_id)
        return None

    segments = _parse_caption_file(caption_file)
    log.info("Parsed %d caption segments from %s", len(segments), caption_file.name)
    return segments if segments else None
