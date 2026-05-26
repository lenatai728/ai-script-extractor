"""REST and WebSocket API endpoints."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from pathlib import Path
from typing import Any
import urllib.parse

from fastapi import (
    APIRouter,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse

from app.config import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
    PROCESSED_DIR,
    UPLOAD_DIR,
)
from app.models import JobResult, JobStatus, Speaker
from app.services import export
from app.services.pipeline import process_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# ── In-memory job store ───────────────────────────────────────────────────
_jobs: dict[str, JobResult] = {}
_ws_connections: dict[str, list[WebSocket]] = {}


# ── Upload ────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(file: UploadFile) -> dict[str, str]:
    """Upload a video/audio file and return a new job ID."""
    if not file.filename:
        raise HTTPException(400, "No file provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Unsupported file type '{ext}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    job_id = uuid.uuid4().hex[:12]
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    dest = job_dir / file.filename
    size = 0

    with open(dest, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            size += len(chunk)
            if size > MAX_FILE_SIZE_BYTES:
                dest.unlink(missing_ok=True)
                raise HTTPException(413, "File too large.")
            f.write(chunk)

    _jobs[job_id] = JobResult(
        job_id=job_id,
        status=JobStatus.PENDING,
        filename=file.filename,
    )

    logger.info("Uploaded %s (%.1f MB) → job %s", file.filename, size / 1e6, job_id)
    return {"job_id": job_id, "filename": file.filename}


# ── WebSocket: real-time processing ──────────────────────────────────────

@router.websocket("/ws/{job_id}")
async def websocket_process(ws: WebSocket, job_id: str) -> None:
    """
    Connect via WebSocket to kick off processing and receive live progress.

    The client connects, the server starts processing in a background thread,
    and progress updates are pushed back to the client.
    """
    await ws.accept()

    if job_id not in _jobs:
        await ws.send_json({"error": "Job not found."})
        await ws.close()
        return

    _ws_connections.setdefault(job_id, []).append(ws)
    loop = asyncio.get_event_loop()
    job = _jobs[job_id]

    async def send_progress(status: JobStatus, progress: float, message: str) -> None:
        payload = {
            "job_id": job_id,
            "status": status.value,
            "progress": progress,
            "message": message,
        }
        for conn in _ws_connections.get(job_id, []):
            try:
                await conn.send_json(payload)
            except Exception:
                pass

    def sync_progress(status: JobStatus, progress: float, message: str) -> None:
        asyncio.run_coroutine_threadsafe(
            send_progress(status, progress, message), loop
        )

    try:
        result = await loop.run_in_executor(
            None,
            process_file,
            job_id,
            job.filename,
            sync_progress,
        )
        _jobs[job_id] = result

        # Send the final result.
        await ws.send_json({
            "job_id": job_id,
            "status": result.status.value,
            "progress": 100,
            "message": "Processing complete!",
            "result": result.model_dump(),
        })
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for job %s", job_id)
    except Exception as exc:
        logger.exception("WebSocket processing error for job %s", job_id)
        try:
            await ws.send_json({"error": str(exc)})
        except Exception:
            pass
    finally:
        _ws_connections.get(job_id, []).remove(ws) if ws in _ws_connections.get(job_id, []) else None


# ── Get Job Result ───────────────────────────────────────────────────────

@router.get("/jobs/{job_id}")
async def get_job(job_id: str) -> JobResult:
    """Return the current state / result of a job."""
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found.")
    return _jobs[job_id]


@router.get("/jobs")
async def list_jobs() -> list[dict[str, Any]]:
    """List all jobs with basic info."""
    return [
        {
            "job_id": j.job_id,
            "filename": j.filename,
            "status": j.status.value,
            "duration": j.duration,
            "speaker_count": len(j.speakers),
            "segment_count": len(j.segments),
        }
        for j in _jobs.values()
    ]


# ── Speaker rename ───────────────────────────────────────────────────────

@router.put("/jobs/{job_id}/speakers/{speaker_id}")
async def rename_speaker(job_id: str, speaker_id: str, body: dict) -> dict:
    """Rename a speaker's display name."""
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found.")

    new_name = body.get("display_name", "").strip()
    if not new_name:
        raise HTTPException(400, "display_name is required.")

    job = _jobs[job_id]
    for speaker in job.speakers:
        if speaker.id == speaker_id:
            speaker.display_name = new_name
            return {"ok": True, "speaker_id": speaker_id, "display_name": new_name}

    raise HTTPException(404, "Speaker not found.")


# ── Export ────────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}/export")
async def export_job(job_id: str, format: str = "txt"):
    """Export the transcript in the requested format."""
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found.")

    job = _jobs[job_id]
    if job.status != JobStatus.COMPLETE:
        raise HTTPException(400, "Job not yet complete.")

    fmt = format.lower()
    base_name = Path(job.filename).stem

    safe_filename = urllib.parse.quote(base_name)

    if fmt == "txt":
        content = export.to_txt(job.segments, job.speakers)
        return PlainTextResponse(
            content,
            headers={
                "Content-Disposition": f'attachment; filename="{safe_filename}_transcript.txt"'
            },
        )
    elif fmt == "srt":
        content = export.to_srt(job.segments, job.speakers)
        return PlainTextResponse(
            content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_filename}_transcript.srt"'
            },
        )
    elif fmt == "json":
        data = export.to_json(job.segments, job.speakers)
        return JSONResponse(
            data,
            headers={
                "Content-Disposition": f'attachment; filename="{safe_filename}_transcript.json"'
            },
        )
    else:
        raise HTTPException(400, f"Unsupported format: {fmt}. Use txt, srt, or json.")


# ── Serve media files ────────────────────────────────────────────────────

@router.get("/media/{job_id}/{filename}")
async def serve_media(job_id: str, filename: str):
    """Serve a processed media file for playback."""
    path = PROCESSED_DIR / job_id / filename
    if not path.exists():
        raise HTTPException(404, "Media file not found.")
    return FileResponse(path)
