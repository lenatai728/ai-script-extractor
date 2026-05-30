"""Speech-to-text transcription using faster-whisper."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from faster_whisper import WhisperModel

from app.config import WHISPER_MODEL, CANTONESE_MODEL

logger = logging.getLogger(__name__)

# Lazy-loaded singletons – avoids reloading models on every request.
_model: WhisperModel | None = None
_cantonese_model: WhisperModel | None = None


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        logger.info("Loading Whisper model: %s", WHISPER_MODEL)
        _model = WhisperModel(WHISPER_MODEL, compute_type="int8")
        logger.info("Whisper model loaded.")
    return _model


def _get_cantonese_model() -> WhisperModel:
    global _cantonese_model
    if _cantonese_model is None:
        logger.info("Loading Cantonese Whisper model: %s", CANTONESE_MODEL)
        _cantonese_model = WhisperModel(
            CANTONESE_MODEL, device="cpu", compute_type="int8"
        )
        logger.info("Cantonese Whisper model loaded.")
    return _cantonese_model


@dataclass
class TranscriptSegment:
    """A segment of transcribed speech."""

    start: float
    end: float
    text: str


def transcribe(
    audio_path: str | Path,
    language: str | None = None,
) -> tuple[list[TranscriptSegment], float]:
    """
    Transcribe an audio file and return timestamped segments.

    Args:
        audio_path: Path to the audio file.
        language: Language code for transcription (e.g. "en", "zh", "yue").
                  None means automatic language detection.

    Returns:
        A tuple of (segments, audio_duration_seconds).
    """
    audio_path = str(audio_path)

    if language == "yue":
        # Cantonese uses a specialised model with different settings.
        model = _get_cantonese_model()
        logger.info("Transcribing (Cantonese): %s", audio_path)
        segments_iter, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True,
            condition_on_previous_text=False,
            vad_filter=False,
            vad_parameters=dict(min_silence_duration_ms=500),
            language="yue",
        )
    else:
        model = _get_model()
        logger.info("Transcribing (lang=%s): %s", language or "auto", audio_path)

        transcribe_kwargs: dict = dict(
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        if language:
            transcribe_kwargs["language"] = language

        segments_iter, info = model.transcribe(audio_path, **transcribe_kwargs)

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
