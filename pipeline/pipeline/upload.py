from __future__ import annotations

import logging
from pathlib import Path

import boto3

from pipeline.config import Config

log = logging.getLogger(__name__)


def _s3_client(config: Config):
    return boto3.client(
        "s3",
        endpoint_url=f"https://{config.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=config.r2_access_key,
        aws_secret_access_key=config.r2_secret_key,
        region_name="auto",
    )


def upload_clip(
    clip_path: Path,
    video_id: str,
    segment_index: int,
    config: Config,
) -> str:
    key = f"clips/{video_id}/{segment_index}.mp4"
    log.info("Uploading %s → s3://%s/%s", clip_path.name, config.r2_bucket, key)

    client = _s3_client(config)
    client.upload_file(
        str(clip_path),
        config.r2_bucket,
        key,
        ExtraArgs={"ContentType": "video/mp4"},
    )

    url = f"https://{config.r2_bucket}.{config.r2_account_id}.r2.dev/{key}"
    log.info("Uploaded → %s", url)
    return url


def upload_all_clips(
    clip_paths: list[Path],
    video_id: str,
    config: Config,
) -> list[str]:
    urls: list[str] = []
    for i, path in enumerate(clip_paths):
        url = upload_clip(path, video_id, i, config)
        urls.append(url)
    log.info("Uploaded %d clips for video %s", len(urls), video_id)
    return urls
