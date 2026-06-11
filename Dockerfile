# Multi-stage Dockerfile
# Stage 1: build the frontend using Node
FROM node:22-bullseye AS frontend-builder
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY frontend ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
RUN npm run build

# Stage 2: runtime image (Python, CPU)
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies (ffmpeg, audio libs)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
        build-essential \
        git \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install. Install CPU PyTorch wheel first to
# ensure CPU-only runtime on Hugging Face Spaces
COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel \
    && pip install --index-url https://download.pytorch.org/whl/cpu torch --no-cache-dir \
    && pip install -r requirements.txt --no-cache-dir

# Copy the app source
COPY . /app

# Copy built frontend from builder
COPY --from=frontend-builder /src/frontend/dist /app/frontend/dist

# Port expected by Hugging Face Spaces (use 7860 for compatibility)
ENV PORT=7860
EXPOSE 7860

# Start the FastAPI app with a single worker. Adjust --workers if needed
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
