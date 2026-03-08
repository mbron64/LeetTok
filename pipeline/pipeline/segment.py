from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path

from pipeline.captions_extract import TranscriptSegment
from pipeline.config import Config

log = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """\
You are analyzing a transcript of a LeetCode solution video by NeetCode.

Video: "{title}" (LeetCode #{problem_number}, {duration_minutes:.1f} minutes)

Identify 3-5 self-contained segments (30-90 seconds each) that would work as standalone short-form video clips. Each segment should:
- Explain ONE clear concept (problem intuition, key insight, trick, or pattern)
- Have a natural beginning and end (not mid-sentence)
- Be understandable without watching the rest of the video
- Prioritize "aha moment" explanations over code typing

For each segment, return:
- start_time (seconds, float)
- end_time (seconds, float)
- title (short, catchy, e.g. "Why Two Pointers Works Here")
- hook (1-sentence description for the overlay)
- difficulty: easy | medium | hard
- topics: array of tags (e.g. ["arrays", "two-pointers"])

Return a JSON array of objects with these exact fields."""


@dataclass(frozen=True, slots=True)
class DetectedSegment:
    start_time: float
    end_time: float
    title: str
    hook: str
    difficulty: str
    topics: list[str]


def _build_prompt(
    transcript: list[TranscriptSegment],
    title: str,
    problem_number: int | None,
    duration: float,
) -> tuple[str, str]:
    system = _PROMPT_TEMPLATE.format(
        title=title,
        problem_number=problem_number or "unknown",
        duration_minutes=duration / 60.0,
    )
    transcript_text = "\n".join(
        f"[{s.start:.1f}s] {s.text}" for s in transcript
    )
    user = f"Here is the transcript:\n\n{transcript_text}"
    return system, user


def _call_openai(system: str, user: str, api_key: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    return response.choices[0].message.content or "[]"


def _call_anthropic(system: str, user: str, api_key: str) -> str:
    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-haiku-4-20250414",
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text


def _extract_json_array(raw: str) -> list[dict]:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)

    parsed = json.loads(raw)

    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        for key in ("segments", "results", "data"):
            if key in parsed and isinstance(parsed[key], list):
                return parsed[key]
        values = list(parsed.values())
        if len(values) == 1 and isinstance(values[0], list):
            return values[0]
    raise ValueError(f"Could not extract JSON array from response: {raw[:200]}")


def _validate_segments(
    raw_segments: list[dict], duration: float
) -> list[DetectedSegment]:
    valid: list[DetectedSegment] = []
    for i, seg in enumerate(raw_segments):
        try:
            start = float(seg["start_time"])
            end = float(seg["end_time"])
            seg_duration = end - start

            if start < 0 or end > duration:
                log.warning(
                    "Segment %d: timestamps out of bounds (%.1f-%.1f, video=%.1f), skipping",
                    i, start, end, duration,
                )
                continue

            if seg_duration < 30 or seg_duration > 90:
                log.warning(
                    "Segment %d: duration %.1fs outside 30-90s range, skipping",
                    i, seg_duration,
                )
                continue

            difficulty = seg.get("difficulty", "medium").lower()
            if difficulty not in ("easy", "medium", "hard"):
                difficulty = "medium"

            valid.append(DetectedSegment(
                start_time=start,
                end_time=end,
                title=seg.get("title", f"Segment {i + 1}"),
                hook=seg.get("hook", ""),
                difficulty=difficulty,
                topics=seg.get("topics", []),
            ))
        except (KeyError, TypeError, ValueError) as e:
            log.warning("Segment %d: invalid data (%s), skipping", i, e)

    return valid


def detect_segments(
    transcript: list[TranscriptSegment],
    title: str,
    problem_number: int | None,
    duration: float,
    config: Config,
    provider: str = "openai",
) -> list[DetectedSegment]:
    system, user = _build_prompt(transcript, title, problem_number, duration)

    log.info("Detecting segments via %s...", provider)
    if provider == "anthropic":
        raw = _call_anthropic(system, user, config.anthropic_api_key)
    else:
        raw = _call_openai(system, user, config.openai_api_key)

    raw_segments = _extract_json_array(raw)
    segments = _validate_segments(raw_segments, duration)
    log.info("Detected %d valid segments (of %d returned)", len(segments), len(raw_segments))

    return segments


def save_segments(segments: list[DetectedSegment], output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "segments.json"
    data = [asdict(s) for s in segments]
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info("Segments saved to %s", path)
    return path


def load_segments(output_dir: Path) -> list[DetectedSegment]:
    path = output_dir / "segments.json"
    if not path.exists():
        raise FileNotFoundError(f"No segments.json found in {output_dir}")
    data = json.loads(path.read_text(encoding="utf-8"))
    return [
        DetectedSegment(
            start_time=s["start_time"],
            end_time=s["end_time"],
            title=s["title"],
            hook=s["hook"],
            difficulty=s["difficulty"],
            topics=s["topics"],
        )
        for s in data
    ]
