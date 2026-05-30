"""Pydantic models and enums shared across the application."""

from __future__ import annotations

import enum
from pydantic import BaseModel


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    EXTRACTING_AUDIO = "extracting_audio"
    TRANSCRIBING = "transcribing"
    DIARIZING = "diarizing"
    MERGING = "merging"
    COMPLETE = "complete"
    ERROR = "error"


class Segment(BaseModel):
    """A single transcribed segment with speaker label."""

    speaker: str
    start: float
    end: float
    text: str


class Speaker(BaseModel):
    """Detected speaker with a label and optional display name."""

    id: str
    display_name: str


class JobProgress(BaseModel):
    """Real-time progress update sent via WebSocket."""

    job_id: str
    status: JobStatus
    progress: float = 0.0  # 0–100
    message: str = ""


class JobResult(BaseModel):
    """Full processing result for a completed job."""

    job_id: str
    status: JobStatus
    filename: str
    language: str = ""  # language code (e.g. "en", "yue") or "" for auto
    duration: float = 0.0
    segments: list[Segment] = []
    speakers: list[Speaker] = []
    media_url: str = ""
