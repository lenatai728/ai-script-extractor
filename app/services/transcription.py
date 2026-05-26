"""Speech-to-text transcription using faster-whisper."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from faster_whisper import WhisperModel

from app.config import WHISPER_MODEL

logger = logging.getLogger(__name__)

# Lazy-loaded singleton – avoids reloading the model on every request.
_model: WhisperModel | None = None


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        logger.info("Loading Whisper model: %s", WHISPER_MODEL)
        _model = WhisperModel(WHISPER_MODEL, compute_type="int8")
        logger.info("Whisper model loaded.")
    return _model


@dataclass
class TranscriptSegment:
    """A segment of transcribed speech."""

    start: float
    end: float
    text: str


def transcribe(audio_path: str | Path) -> tuple[list[TranscriptSegment], float]:
    """
    Transcribe an audio file and return timestamped segments.

    Returns:
        A tuple of (segments, audio_duration_seconds).
    """
    audio_path = str(audio_path)
    model = _get_model()

    logger.info("Transcribing: %s", audio_path)
    segments_iter, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,           # skip silence
        vad_parameters=dict(
            min_silence_duration_ms=500,
        ),
    )

    segments: list[TranscriptSegment] = []
    for seg in segments_iter:
        text = seg.text.strip()
        if text:
            segments.append(TranscriptSegment(
                start=round(seg.start, 2),
                end=round(seg.end, 2),
                text=text,
            ))

    duration = info.duration or (segments[-1].end if segments else 0.0)
    logger.info(
        "Transcription complete: %d segments, %.1fs duration",
        len(segments), duration,
    )
    return segments, duration
