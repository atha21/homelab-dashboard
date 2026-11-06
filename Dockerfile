# ── Stage 1: Build React frontend ────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Install deps first (layer-cached until package.json changes)
COPY frontend/package*.json ./
RUN npm install

# Build — produces /build/dist
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Minimal system deps; clean apt cache in the same layer to keep image small
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps — installed before copying app code so this layer is cached
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application source
COPY backend/app ./app

# React build output goes into the static dir FastAPI serves
COPY --from=frontend-builder /build/dist ./app/static

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]
