"""Audio extraction from video files using ffmpeg."""

import logging
from pathlib import Path

import ffmpeg

logger = logging.getLogger(__name__)


def extract_audio(video_path: str | Path, audio_path: str | Path) -> Path:
    """
    Extract audio track from a video file and save as WAV.

    If the input is already an audio file, it is converted to WAV for
    consistent downstream processing.
    """
    video_path = Path(video_path)
    audio_path = Path(audio_path)
    audio_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info("Extracting audio: %s → %s", video_path, audio_path)

    (
        ffmpeg
        .input(str(video_path))
        .output(
            str(audio_path),
            ac=1,          # mono – better for speech recognition
            ar="16000",    # 16 kHz – the sample rate Whisper expects
            format="wav",
        )
        .overwrite_output()
        .run(quiet=True)
    )

    logger.info("Audio extraction complete: %s", audio_path)
    return audio_path
