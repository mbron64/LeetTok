from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path

from pipeline.captions_extract import TranscriptSegment
from pipeline.config import Config

log = logging.getLogger(__name__)

_CHALLENGE_PROMPT = """\
You are creating a "fill in the blank" coding challenge from a LeetCode video clip transcript.

Video: "{title}" (LeetCode #{problem_number})
Transcript: {transcript_text}

Tasks:
1. Extract the complete code snippet being discussed in this clip.
2. Identify the single most important/educational line -- the line that represents the key insight, the clever trick, or the core algorithm step.
3. Generate a challenge where that line is blanked out.

Return JSON:
{{
  "language": "python",
  "code_block": "the full code with all lines",
  "blank_line_index": 4,
  "blank_line_content": "if complement in seen: return [seen[complement], i]",
  "accepted_answers": ["variation1", "variation2", "variation3"],
  "hint": "Check if we've already seen the number we need",
  "explanation": "We look up the complement in our hash map for O(1) lookup",
  "difficulty": "medium",
  "pause_timestamp": 34.5,
  "xp_value": 15,
  "tags": ["hash-map", "lookup", "two-sum"]
}}

If this clip doesn't discuss specific code or isn't suitable for a fill-in-the-blank challenge, return null."""

_VARIATIONS_PROMPT = """\
You are generating accepted answer variations for a "fill in the blank" coding challenge.

Language: {language}
Full code block:
```
{code_block}
```

The blanked-out line is:
{blank_line_content}

Current accepted answers:
{current_answers}

Generate 5-10 additional valid variations of this line that would be functionally equivalent. Consider:
- Whitespace variations (extra/fewer spaces around operators)
- Equivalent syntax (e.g., `!= None` vs `is not None`, `x += 1` vs `x = x + 1`)
- Variable name flexibility where the context makes the intent obvious
- Parenthesization differences that don't change semantics
- Semicolons vs no semicolons (if language allows)

Return a JSON array of strings. Only include variations that are genuinely correct and equivalent.
Do NOT include variations already in the current accepted answers."""

_REQUIRED_FIELDS = {
    "language", "code_block", "blank_line_index", "blank_line_content",
    "accepted_answers", "hint", "explanation", "difficulty",
    "pause_timestamp", "xp_value", "tags",
}


@dataclass(slots=True)
class MadLeetsChallenge:
    language: str
    code_block: str
    blank_line_index: int
    blank_line_content: str
    accepted_answers: list[str]
    hint: str
    explanation: str
    difficulty: str
    pause_timestamp: float
    xp_value: int
    tags: list[str]


def _build_challenge_prompt(
    transcript: list[TranscriptSegment],
    title: str,
    problem_number: int,
    clip_start: float,
    clip_end: float,
) -> tuple[str, str]:
    relevant = [
        s for s in transcript
        if s.end > clip_start and s.start < clip_end
    ]
    transcript_text = "\n".join(
        f"[{s.start:.1f}s] {s.text}" for s in relevant
    )
    system = _CHALLENGE_PROMPT.format(
        title=title,
        problem_number=problem_number,
        transcript_text=transcript_text,
    )
    return system, "Generate the challenge JSON."


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
    return response.choices[0].message.content or "null"


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


def _strip_code_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)
    return raw


def _parse_challenge(raw: str) -> MadLeetsChallenge | None:
    raw = _strip_code_fences(raw)

    parsed = json.loads(raw)
    if parsed is None:
        return None
    if not isinstance(parsed, dict):
        log.warning("Challenge response is not a dict: %s", type(parsed))
        return None

    missing = _REQUIRED_FIELDS - set(parsed.keys())
    if missing:
        log.warning("Challenge response missing fields: %s", missing)
        return None

    difficulty = str(parsed["difficulty"]).lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    return MadLeetsChallenge(
        language=str(parsed["language"]),
        code_block=str(parsed["code_block"]),
        blank_line_index=int(parsed["blank_line_index"]),
        blank_line_content=str(parsed["blank_line_content"]),
        accepted_answers=[str(a) for a in parsed["accepted_answers"]],
        hint=str(parsed["hint"]),
        explanation=str(parsed["explanation"]),
        difficulty=difficulty,
        pause_timestamp=float(parsed["pause_timestamp"]),
        xp_value=int(parsed["xp_value"]),
        tags=[str(t) for t in parsed["tags"]],
    )


def generate_challenge(
    transcript: list[TranscriptSegment],
    title: str,
    problem_number: int,
    clip_start: float,
    clip_end: float,
    config: Config,
    provider: str = "openai",
) -> MadLeetsChallenge | None:
    system, user = _build_challenge_prompt(
        transcript, title, problem_number, clip_start, clip_end,
    )

    log.info("Generating MadLeets challenge via %s...", provider)
    try:
        if provider == "anthropic":
            raw = _call_anthropic(system, user, config.anthropic_api_key)
        else:
            raw = _call_openai(system, user, config.openai_api_key)

        challenge = _parse_challenge(raw)
        if challenge is None:
            log.info("Clip %.1f-%.1f not suitable for a challenge", clip_start, clip_end)
        return challenge

    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
        log.warning("Failed to parse challenge response: %s", e)
        return None


def save_challenge(challenge: MadLeetsChallenge, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    data = asdict(challenge)
    output_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8",
    )
    log.info("Challenge saved to %s", output_path)


def generate_answer_variations(
    challenge: MadLeetsChallenge,
    config: Config,
    provider: str = "openai",
) -> list[str]:
    current_answers_text = json.dumps(challenge.accepted_answers, indent=2)
    system = _VARIATIONS_PROMPT.format(
        language=challenge.language,
        code_block=challenge.code_block,
        blank_line_content=challenge.blank_line_content,
        current_answers=current_answers_text,
    )
    user = "Generate the variations JSON array."

    log.info("Generating answer variations via %s...", provider)
    try:
        if provider == "anthropic":
            raw = _call_anthropic(system, user, config.anthropic_api_key)
        else:
            raw = _call_openai(system, user, config.openai_api_key)

        raw = _strip_code_fences(raw)
        parsed = json.loads(raw)

        if isinstance(parsed, dict):
            for key in ("variations", "answers", "data"):
                if key in parsed and isinstance(parsed[key], list):
                    parsed = parsed[key]
                    break
            else:
                values = list(parsed.values())
                if len(values) == 1 and isinstance(values[0], list):
                    parsed = values[0]

        if not isinstance(parsed, list):
            log.warning("Variations response is not a list")
            return challenge.accepted_answers

        new_variations = [str(v) for v in parsed if str(v) not in challenge.accepted_answers]
        combined = challenge.accepted_answers + new_variations
        challenge.accepted_answers = combined
        log.info("Added %d answer variations (total: %d)", len(new_variations), len(combined))
        return combined

    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
        log.warning("Failed to parse variations response: %s", e)
        return challenge.accepted_answers
