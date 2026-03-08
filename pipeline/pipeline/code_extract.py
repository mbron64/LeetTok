from __future__ import annotations

import json
import logging

from pipeline.captions_extract import TranscriptSegment
from pipeline.config import Config

log = logging.getLogger(__name__)

_EXTRACT_PROMPT = """\
You are reconstructing code from a LeetCode solution video transcript.

NeetCode explains code verbally — he describes what he's typing, reads lines aloud, and explains logic step by step. Your job is to reconstruct the actual code he is writing/discussing.

Video: "{title}" (LeetCode #{problem_number})
Transcript:
{transcript_text}

Instructions:
1. Reconstruct the complete code solution being discussed.
2. Use proper formatting, indentation, and syntax.
3. If multiple languages are mentioned, prefer Python.
4. Include only the solution code — no class wrappers unless they're part of the solution.
5. If the transcript doesn't discuss any specific code, return null.

Return JSON:
{{
  "language": "python",
  "code": "the reconstructed code here"
}}

If no code is discussed, return null."""


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
        temperature=0.2,
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


def extract_code_from_transcript(
    transcript: list[TranscriptSegment],
    title: str,
    problem_number: int,
    config: Config,
    provider: str = "openai",
) -> str | None:
    transcript_text = "\n".join(
        f"[{s.start:.1f}s] {s.text}" for s in transcript
    )
    system = _EXTRACT_PROMPT.format(
        title=title,
        problem_number=problem_number,
        transcript_text=transcript_text,
    )
    user = "Reconstruct the code from this transcript."

    log.info("Extracting code from transcript via %s...", provider)
    try:
        if provider == "anthropic":
            raw = _call_anthropic(system, user, config.anthropic_api_key)
        else:
            raw = _call_openai(system, user, config.openai_api_key)

        raw = raw.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            raw = "\n".join(lines)

        parsed = json.loads(raw)
        if parsed is None:
            log.info("No code found in transcript")
            return None
        if not isinstance(parsed, dict) or "code" not in parsed:
            log.warning("Unexpected code extraction response format")
            return None

        code = str(parsed["code"]).strip()
        if not code:
            return None

        log.info("Extracted %d-line code block (%s)", code.count("\n") + 1, parsed.get("language", "unknown"))
        return code

    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
        log.warning("Failed to parse code extraction response: %s", e)
        return None
