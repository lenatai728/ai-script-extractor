"""Speaker diarization using pyannote.audio."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from pyannote.audio import Pipeline

from app.config import HF_TOKEN

logger = logging.getLogger(__name__)

# Lazy-loaded singleton.
_pipeline: Pipeline | None = None


def _get_pipeline() -> Pipeline:
    global _pipeline
    if _pipeline is None:
        logger.info("Loading pyannote diarization pipeline …")
        _pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            token=HF_TOKEN,
        )
        logger.info("Diarization pipeline loaded.")
    return _pipeline


@dataclass
class DiarizationSegment:
    """A time range assigned to a speaker."""

    speaker: str
    start: float
    end: float


def diarize(audio_path: str | Path) -> list[DiarizationSegment]:
    """
    Run speaker diarization and return labelled time segments.
    """
    audio_path = str(audio_path)
    pipeline = _get_pipeline()

    logger.info("Diarizing: %s", audio_path)
    result = pipeline(audio_path)

    annotation = result.speaker_diarization

    segments: list[DiarizationSegment] = []
    for turn, _, speaker in annotation.itertracks(yield_label=True):
        segments.append(DiarizationSegment(
            speaker=speaker,
            start=round(turn.start, 2),
            end=round(turn.end, 2),
        ))
    # for turn, _, speaker in result.itertracks(yield_label=True):
    #     segments.append(DiarizationSegment(
    #         speaker=speaker,
    #         start=round(turn.start, 2),
    #         end=round(turn.end, 2),
    #     ))

    speakers_found = {s.speaker for s in segments}
    logger.info(
        "Diarization complete: %d segments, %d speakers",
        len(segments), len(speakers_found),
    )
    return segments
