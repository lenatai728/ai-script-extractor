"""
Full processing pipeline: extract audio → transcribe → diarize → merge.

The pipeline reports progress via a callback so the API layer can push
real-time updates over WebSocket.
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path
from typing import Callable

from app.config import PROCESSED_DIR, UPLOAD_DIR
from app.models import JobResult, JobStatus, Segment, Speaker
from app.services.audio import extract_audio
from app.services.diarization import DiarizationSegment, diarize
from app.services.transcription import TranscriptSegment, transcribe

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[JobStatus, float, str], None]


def _merge_segments(
    transcript: list[TranscriptSegment],
    diarization: list[DiarizationSegment],
) -> list[Segment]:
    """
    Align transcript segments with diarization results.

    For each transcribed sentence, determine which *speaker* was speaking
    the most during that time range, by computing the overlap between the
    sentence's [start, end] and every diarization segment.
    """
    merged: list[Segment] = []

    for t_seg in transcript:
        # Find the speaker with the most overlap for this transcript segment.
        best_speaker = "Unknown"
        best_overlap = 0.0

        for d_seg in diarization:
            overlap_start = max(t_seg.start, d_seg.start)
            overlap_end = min(t_seg.end, d_seg.end)
            overlap = max(0.0, overlap_end - overlap_start)

            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = d_seg.speaker

        merged.append(Segment(
            speaker=best_speaker,
            start=t_seg.start,
            end=t_seg.end,
            text=t_seg.text,
        ))

    return merged


def _noop_progress(status: JobStatus, progress: float, message: str) -> None:
    pass


def process_file(
    job_id: str,
    filename: str,
    on_progress: ProgressCallback = _noop_progress,
) -> JobResult:
    """
    Run the full extraction pipeline for one uploaded file.

    Steps:
        1. Extract audio (→ WAV)
        2. Transcribe with Whisper
        3. Diarize speakers with pyannote
        4. Merge transcription + diarization
    """
    src_path = UPLOAD_DIR / job_id / filename
    job_dir = PROCESSED_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # Copy original media to processed dir so the frontend can play it.
    media_dest = job_dir / filename
    if not media_dest.exists():
        shutil.copy2(src_path, media_dest)

    audio_path = job_dir / "audio.wav"

    try:
        # ── Step 1: Extract audio ─────────────────────────────────────
        on_progress(JobStatus.EXTRACTING_AUDIO, 10, "Extracting audio from file…")
        extract_audio(src_path, audio_path)

        # ── Step 2: Transcribe ────────────────────────────────────────
        on_progress(JobStatus.TRANSCRIBING, 30, "Transcribing speech (this may take a moment)…")
        transcript, duration = transcribe(audio_path)

        # ── Step 3: Diarize ───────────────────────────────────────────
        on_progress(JobStatus.DIARIZING, 60, "Identifying speakers…")
        dia_segments = diarize(audio_path)

        # ── Step 4: Merge ─────────────────────────────────────────────
        on_progress(JobStatus.MERGING, 85, "Merging transcript with speaker data…")
        merged = _merge_segments(transcript, dia_segments)

        # Collect unique speakers.
        speaker_ids = sorted({s.speaker for s in merged})
        speakers = [
            Speaker(id=sid, display_name=sid.replace("SPEAKER_", "Speaker "))
            for sid in speaker_ids
        ]

        on_progress(JobStatus.COMPLETE, 100, "Processing complete!")

        return JobResult(
            job_id=job_id,
            status=JobStatus.COMPLETE,
            filename=filename,
            duration=duration,
            segments=merged,
            speakers=speakers,
            media_url=f"/api/media/{job_id}/{filename}",
        )

    except Exception as exc:
        logger.exception("Pipeline error for job %s", job_id)
        on_progress(JobStatus.ERROR, 0, f"Error: {exc}")
        return JobResult(
            job_id=job_id,
            status=JobStatus.ERROR,
            filename=filename,
        )
