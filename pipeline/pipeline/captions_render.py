from __future__ import annotations

import logging
import subprocess
from pathlib import Path

from pipeline.captions_extract import TranscriptSegment

log = logging.getLogger(__name__)

_ASS_HEADER = """\
[Script Info]
Title: LeetTok Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,2,40,40,400,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

_HIGHLIGHT_COLOR = "&H00FFFF&"
_NORMAL_COLOR = "&HFFFFFF&"
_MAX_WORDS_PER_LINE = 4


def slice_transcript(
    transcript: list[TranscriptSegment],
    start: float,
    end: float,
) -> list[TranscriptSegment]:
    sliced: list[TranscriptSegment] = []
    for seg in transcript:
        if seg.end <= start or seg.start >= end:
            continue
        adj_start = max(seg.start, start) - start
        adj_end = min(seg.end, end) - start
        sliced.append(TranscriptSegment(start=adj_start, end=adj_end, text=seg.text))
    return sliced


def _format_ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _split_words_with_timing(
    segments: list[TranscriptSegment],
) -> list[tuple[str, float, float]]:
    words: list[tuple[str, float, float]] = []
    for seg in segments:
        seg_words = seg.text.split()
        if not seg_words:
            continue
        seg_duration = seg.end - seg.start
        word_duration = seg_duration / len(seg_words)
        for i, word in enumerate(seg_words):
            w_start = seg.start + i * word_duration
            w_end = w_start + word_duration
            words.append((word, w_start, w_end))
    return words


def _build_dialogue_events(
    words: list[tuple[str, float, float]],
) -> list[str]:
    events: list[str] = []
    total = len(words)
    if total == 0:
        return events

    for highlight_idx in range(total):
        _, w_start, w_end = words[highlight_idx]

        chunk_start = (highlight_idx // _MAX_WORDS_PER_LINE) * _MAX_WORDS_PER_LINE
        chunk_end = min(chunk_start + _MAX_WORDS_PER_LINE, total)
        chunk_words = words[chunk_start:chunk_end]

        parts: list[str] = []
        for i, (word, _, _) in enumerate(chunk_words):
            abs_idx = chunk_start + i
            if abs_idx == highlight_idx:
                parts.append(f"{{\\c{_HIGHLIGHT_COLOR}}}{word}{{\\c{_NORMAL_COLOR}}}")
            else:
                parts.append(word)

        text = " ".join(parts)
        start_ts = _format_ass_time(w_start)
        end_ts = _format_ass_time(w_end)
        events.append(
            f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{text}"
        )

    return events


def generate_ass_captions(
    transcript: list[TranscriptSegment],
    clip_start: float,
    clip_end: float,
    output_path: Path,
) -> Path:
    sliced = slice_transcript(transcript, clip_start, clip_end)
    words = _split_words_with_timing(sliced)
    events = _build_dialogue_events(words)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        f.write(_ASS_HEADER)
        for event in events:
            f.write(event + "\n")

    log.info("Generated ASS captions (%d events) at %s", len(events), output_path)
    return output_path


def burn_captions(
    video_path: Path,
    ass_path: Path,
    output_path: Path,
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    escaped_ass = str(ass_path).replace("\\", "/").replace(":", "\\:")
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vf", f"ass={escaped_ass}",
        "-c:a", "copy",
        str(output_path),
    ]

    log.info("Burning captions: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"FFmpeg caption burn failed (exit {result.returncode}):\n{result.stderr}"
        )

    log.info("Burned captions into %s", output_path)
    return output_path


def produce_final_clip(
    video_path: Path,
    transcript: list[TranscriptSegment],
    clip_start: float,
    clip_end: float,
    output_path: Path,
) -> Path:
    ass_path = output_path.with_suffix(".ass")
    generate_ass_captions(transcript, clip_start, clip_end, ass_path)
    return burn_captions(video_path, ass_path, output_path)
