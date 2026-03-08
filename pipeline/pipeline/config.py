from __future__ import annotations

import os
from dataclasses import dataclass, fields
from pathlib import Path

from dotenv import load_dotenv

_REQUIRED_KEYS = (
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "YOUTUBE_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY",
    "R2_SECRET_KEY",
    "R2_BUCKET",
)


@dataclass(frozen=True, slots=True)
class Config:
    openai_api_key: str
    anthropic_api_key: str
    youtube_api_key: str
    supabase_url: str
    supabase_key: str
    r2_account_id: str
    r2_access_key: str
    r2_secret_key: str
    r2_bucket: str


def load_config(env_path: Path | None = None) -> Config:
    load_dotenv(dotenv_path=env_path)

    missing = [k for k in _REQUIRED_KEYS if not os.getenv(k)]
    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            "Copy .env.example to .env and fill in all values."
        )

    return Config(
        openai_api_key=os.environ["OPENAI_API_KEY"],
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
        youtube_api_key=os.environ["YOUTUBE_API_KEY"],
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_key=os.environ["SUPABASE_KEY"],
        r2_account_id=os.environ["R2_ACCOUNT_ID"],
        r2_access_key=os.environ["R2_ACCESS_KEY"],
        r2_secret_key=os.environ["R2_SECRET_KEY"],
        r2_bucket=os.environ["R2_BUCKET"],
    )
