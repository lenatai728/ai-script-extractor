"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
PROCESSED_DIR = BASE_DIR / "processed"
FRONTEND_DIR = BASE_DIR / "frontend" / "dist"

UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

# ── Secrets & Model Settings ──────────────────────────────────────────
HF_TOKEN: str = os.getenv("HF_TOKEN", "")
WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")

# ── Limits ────────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "500"))
MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024

# ── Allowed upload extensions ─────────────────────────────────────────
ALLOWED_VIDEO_EXT = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv"}
ALLOWED_AUDIO_EXT = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"}
ALLOWED_EXTENSIONS = ALLOWED_VIDEO_EXT | ALLOWED_AUDIO_EXT
