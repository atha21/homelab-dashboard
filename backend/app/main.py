"""FastAPI entrypoint — REST + WebSocket metrics server."""

import asyncio
import json
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .system_monitor import SystemMonitor

app = FastAPI(title="HomeLab Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_monitor = SystemMonitor()

# Warm up the CPU percent sampler on startup so first reads aren't 0.0
import psutil as _psutil
_psutil.cpu_percent(interval=None)
_psutil.cpu_percent(interval=None, percpu=True)

# Static files — present only in the Docker image (dist/ is copied there at build time)
_STATIC_DIR = Path(__file__).parent / "static"
if _STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="assets")


# ── Speedtest cache ───────────────────────────────────────────────────────────
_speedtest_cache: Optional[dict] = None


def _run_speedtest_sync() -> dict:
    """Run speedtest-cli and return parsed result dict. Blocking — call from thread."""
    for cmd in (["speedtest-cli", "--json"], ["speedtest", "--json"]):
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=90,
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return {
                    "ok": True,
                    "ping_ms":       round(data.get("ping", 0), 1),
                    "download_mbps": round(data.get("download", 0) / 1_000_000, 2),
                    "upload_mbps":   round(data.get("upload",   0) / 1_000_000, 2),
                    "timestamp":     data.get("timestamp", ""),
                    "server":        data.get("server", {}).get("name", ""),
                }
        except FileNotFoundError:
            continue
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "Speedtest timed out after 90 s"}
        except json.JSONDecodeError as exc:
            return {"ok": False, "error": f"JSON parse error: {exc}"}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
    return {
        "ok": False,
        "error": "speedtest-cli not found. Install with: pip install speedtest-cli",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/status/all")
def status_all():
    return _monitor.snapshot_all()


@app.get("/api/speedtest/latest")
def speedtest_latest():
    """Return the most recent cached speedtest result, or null if none yet."""
    return _speedtest_cache or {"ok": False, "error": "No speedtest run yet"}


@app.post("/api/speedtest/run")
async def speedtest_run():
    """Trigger a new speedtest and cache the result. May take up to 90 s."""
    global _speedtest_cache
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run_speedtest_sync)
    _speedtest_cache = result
    return result


@app.websocket("/ws/metrics")
async def ws_metrics(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = _monitor.snapshot_realtime()
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        pass  # client closed — no leak, loop exits cleanly


# SPA catch-all — serve index.html for every path that isn't /api/* or /ws/*
# Must be registered last so it doesn't shadow the routes above.
@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    index = _STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    # Dev mode: static dir absent, return a minimal hint
    return {"detail": "Frontend not built. Run 'npm run build' first."}, 404
