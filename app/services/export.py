"""Export job results to various document formats."""

from __future__ import annotations

from app.models import Segment, Speaker


def _display_name(speaker_id: str, speakers: list[Speaker]) -> str:
    """Look up a speaker's display name."""
    for s in speakers:
        if s.id == speaker_id:
            return s.display_name
    return speaker_id


def _fmt_time(seconds: float) -> str:
    """Format seconds to HH:MM:SS,mmm (SRT format)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ── TXT ──────────────────────────────────────────────────────────────────

def to_txt(segments: list[Segment], speakers: list[Speaker]) -> str:
    """
    Clean dialogue-style transcript.

    Example:
        Speaker 00 (0:01 – 0:05):
        Hello, how are you?
    """
    lines: list[str] = []
    for seg in segments:
        name = _display_name(seg.speaker, speakers)
        start_m, start_s = divmod(int(seg.start), 60)
        end_m, end_s = divmod(int(seg.end), 60)
        lines.append(
            f"{name} ({start_m}:{start_s:02d} – {end_m}:{end_s:02d}):\n"
            f"{seg.text}\n"
        )
    return "\n".join(lines)


# ── SRT ──────────────────────────────────────────────────────────────────

def to_srt(segments: list[Segment], speakers: list[Speaker]) -> str:
    """Standard SRT subtitle format with speaker labels."""
    parts: list[str] = []
    for idx, seg in enumerate(segments, 1):
        name = _display_name(seg.speaker, speakers)
        parts.append(
            f"{idx}\n"
            f"{_fmt_time(seg.start)} --> {_fmt_time(seg.end)}\n"
            f"[{name}] {seg.text}\n"
        )
    return "\n".join(parts)


# ── JSON ─────────────────────────────────────────────────────────────────

def to_json(segments: list[Segment], speakers: list[Speaker]) -> dict:
    """Structured JSON with full metadata."""
    return {
        "speakers": [s.model_dump() for s in speakers],
        "segments": [
            {
                "index": i + 1,
                "speaker_id": seg.speaker,
                "speaker_name": _display_name(seg.speaker, speakers),
                "start": seg.start,
                "end": seg.end,
                "text": seg.text,
            }
            for i, seg in enumerate(segments)
        ],
        "total_segments": len(segments),
        "total_speakers": len(speakers),
    }
