from __future__ import annotations

import logging
import shutil
import subprocess
from enum import Enum
from pathlib import Path

from pipeline.segment import DetectedSegment

log = logging.getLogger(__name__)


class CropStrategy(str, Enum):
    CODE_FOCUSED = "code_focused"
    SPLIT_LAYOUT = "split_layout"
    BLUR_BACKGROUND = "blur_background"


def _check_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if path is None:
        raise RuntimeError("ffmpeg not found on PATH — install it first")
    return path


def _run_ffmpeg(cmd: list[str]) -> None:
    log.debug("Running: %s", " ".join(cmd))
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed (exit {result.returncode}):\n{result.stderr}"
        )


def clip_segment(
    video_path: Path,
    segment: DetectedSegment,
    output_dir: Path,
    index: int,
) -> Path:
    ffmpeg = _check_ffmpeg()
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    output_path = clips_dir / f"{index}.mp4"
    duration = segment.end_time - segment.start_time

    cmd = [
        ffmpeg,
        "-ss", str(segment.start_time),
        "-i", str(video_path),
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-y",
        str(output_path),
    ]

    log.info(
        "Clipping segment %d: %.1fs–%.1fs (%s)",
        index, segment.start_time, segment.end_time, segment.title,
    )
    _run_ffmpeg(cmd)

    if not output_path.exists():
        raise FileNotFoundError(f"Expected clip not found: {output_path}")

    log.info("Clip written: %s", output_path)
    return output_path


def clip_all_segments(
    video_path: Path,
    segments: list[DetectedSegment],
    output_dir: Path,
) -> list[Path]:
    paths: list[Path] = []
    for i, seg in enumerate(segments):
        path = clip_segment(video_path, seg, output_dir, i)
        paths.append(path)
    return paths


def _build_reframe_filter(strategy: CropStrategy) -> str:
    if strategy == CropStrategy.CODE_FOCUSED:
        return "crop=in_h*9/16:in_h:in_w/2-in_h*9/32:0,scale=1080:1920"

    if strategy == CropStrategy.SPLIT_LAYOUT:
        return (
            "[0:v]crop=iw/3:ih/3:iw*2/3:0,scale=1080:640[cam];"
            "[0:v]crop=iw*9/16:ih:iw/2-iw*9/32:0,scale=1080:1280[code];"
            "[cam][code]vstack[out]"
        )

    if strategy == CropStrategy.BLUR_BACKGROUND:
        return (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
            "[0:v]scale=1080:1920,boxblur=20[bg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2[out]"
        )

    raise ValueError(f"Unknown crop strategy: {strategy}")


def _filter_needs_map(strategy: CropStrategy) -> bool:
    return strategy in (CropStrategy.SPLIT_LAYOUT, CropStrategy.BLUR_BACKGROUND)


def reframe_vertical(
    clip_path: Path,
    output_path: Path,
    strategy: str = "code_focused",
) -> Path:
    ffmpeg = _check_ffmpeg()
    crop = CropStrategy(strategy)
    vf = _build_reframe_filter(crop)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [ffmpeg, "-i", str(clip_path)]

    if _filter_needs_map(crop):
        cmd += ["-filter_complex", vf, "-map", "[out]", "-map", "0:a?"]
    else:
        cmd += ["-vf", vf]

    cmd += [
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-y",
        str(output_path),
    ]

    log.info("Reframing %s → %s (strategy=%s)", clip_path.name, output_path.name, strategy)
    _run_ffmpeg(cmd)

    if not output_path.exists():
        raise FileNotFoundError(f"Expected reframed clip not found: {output_path}")

    log.info("Vertical clip written: %s", output_path)
    return output_path


def clip_and_reframe(
    video_path: Path,
    segments: list[DetectedSegment],
    output_dir: Path,
    strategy: str = "code_focused",
) -> list[Path]:
    raw_clips = clip_all_segments(video_path, segments, output_dir)
    clips_dir = output_dir / "clips"

    vertical_paths: list[Path] = []
    for i, raw_clip in enumerate(raw_clips):
        vertical_path = clips_dir / f"{i}_vertical.mp4"
        reframe_vertical(raw_clip, vertical_path, strategy=strategy)
        vertical_paths.append(vertical_path)

    return vertical_paths
