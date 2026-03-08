from __future__ import annotations

import json
import logging
from pathlib import Path

from pipeline.captions_extract import TranscriptSegment
from pipeline.config import Config

log = logging.getLogger(__name__)


def transcribe_local(audio_path: Path) -> list[TranscriptSegment]:
    from faster_whisper import WhisperModel

    log.info("Loading faster-whisper large-v2 model (first run downloads ~3 GB)...")
    model = WhisperModel("large-v2", device="auto", compute_type="auto")

    raw_segments, info = model.transcribe(
        str(audio_path),
        beam_size=5,
        word_timestamps=True,
    )

    segments: list[TranscriptSegment] = []
    for seg in raw_segments:
        text = seg.text.strip()
        if text:
            segments.append(TranscriptSegment(start=seg.start, end=seg.end, text=text))

    log.info(
        "Transcribed %d segments (language=%s, probability=%.2f)",
        len(segments),
        info.language,
        info.language_probability,
    )
    return segments


def transcribe_cloud(audio_path: Path, api_key: str) -> list[TranscriptSegment]:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    log.info("Sending audio to OpenAI gpt-4o-mini-transcribe...")
    with open(audio_path, "rb") as audio_file:
        response = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"],
        )

    segments: list[TranscriptSegment] = []
    for seg in response.segments or []:
        text = seg.get("text", "").strip() if isinstance(seg, dict) else seg.text.strip()
        start = seg.get("start", 0.0) if isinstance(seg, dict) else seg.start
        end = seg.get("end", 0.0) if isinstance(seg, dict) else seg.end
        if text:
            segments.append(TranscriptSegment(start=start, end=end, text=text))

    log.info("Cloud transcription returned %d segments", len(segments))
    return segments


def _save_transcript(segments: list[TranscriptSegment], output_path: Path) -> None:
    data = [
        {"start": s.start, "end": s.end, "text": s.text}
        for s in segments
    ]
    output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info("Transcript saved to %s", output_path)


def transcribe(
    audio_path: Path, config: Config, cloud: bool = False
) -> list[TranscriptSegment]:
    if cloud:
        segments = transcribe_cloud(audio_path, config.openai_api_key)
    else:
        segments = transcribe_local(audio_path)

    transcript_path = audio_path.with_suffix(".transcript.json")
    _save_transcript(segments, transcript_path)

    return segments
