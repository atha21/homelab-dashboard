# 🖥️ HomeLab Dashboard

> Real-time server monitoring dashboard for home servers and self-hosted infrastructure.

![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=flat-square&logo=react)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?style=flat-square&logo=docker)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

A lightweight, self-hosted monitoring web app that gives full visibility into your server's health — CPU, RAM, GPU, Disk, Network, Processes, and Docker containers — all updated live via WebSocket. Built as a capstone project for **IBM Skillsbuild University Education × Hacktiv8**.

---

## ✨ Features

| Feature | Description |
|---|---|
| ⚡ **Real-time Metrics** | WebSocket stream pushes updates every 1.5 s — no page refresh needed |
| 🩺 **Health Alerting** | Automated 3-level scoring: `LOW` / `MEDIUM` / `HIGH` with descriptive alerts |
| 🎮 **GPU Support** | NVIDIA GPU utilisation, VRAM, and temperature via NVML (graceful fallback) |
| 💾 **Disk Intelligence** | Auto-discovers all physical partitions — works on bare-metal and inside Docker |
| 🐳 **Docker Integration** | Lists all containers (running + stopped) via Docker Python SDK |
| 🌐 **Network Monitor** | Live bandwidth (KB/s ↔ MB/s), listening ports table, LAN & Tailscale IP |
| 🚀 **Speedtest** | On-demand internet speed test with cached result (ping, download, upload) |
| 📊 **Process Explorer** | Top-40 host processes sortable by CPU or memory usage |

---

## 📸 Pages

```
Overview   — Health banner + CPU / RAM / GPU / Disk / Network summary cards
Usage      — Per-core CPU bars, live chart history, RAM gauge, GPU utilisation
Disk       — Per-partition usage bars, total/used/free, filesystem type, I/O
Network    — Live bandwidth chart, speedtest panel, listening ports table
Process    — Task manager — sortable by CPU/memory, searchable
Docker     — All containers with status badges, image, ports, and created time
```

---

## 🏗️ Architecture

```
Browser (React SPA)
      │  HTTP / WebSocket
      ▼
FastAPI (Python 3.11)
  ├── GET  /api/health           — liveness check
  ├── GET  /api/status/all       — full system snapshot
  ├── GET  /api/speedtest/latest — cached speedtest result
  ├── POST /api/speedtest/run    — trigger new speedtest
  ├── WS   /ws/metrics           — live stream (1.5 s interval)
  └── GET  /*                    — SPA catch-all (serves index.html)
      │
      ├── psutil     — CPU, RAM, Disk, Network, Processes, Ports
      ├── pynvml     — NVIDIA GPU metrics
      └── docker SDK — Container listing via /var/run/docker.sock
```

---

## 🚀 Quick Start

### Prerequisites
- Docker Engine
- Docker Compose v2
- *(Optional)* NVIDIA GPU + [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) for GPU metrics

### Run

```bash
git clone https://github.com/baihaqi/homelab-dashboard.git
cd homelab-dashboard
docker compose up -d
```

Open **http://localhost:8000** in your browser.

> **Note:** The container uses `network_mode: host` and `pid: host` to give the monitor accurate visibility into the host system. It mounts `/var/run/docker.sock` read-only for container listing and `/` read-only at `/host` for disk partition discovery.

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — async REST + WebSocket server
- [psutil](https://psutil.readthedocs.io/) — cross-platform system metrics
- [pynvml](https://pypi.org/project/pynvml/) — NVIDIA GPU metrics via NVML
- [docker](https://docker-py.readthedocs.io/) — Python Docker SDK
- [speedtest-cli](https://pypi.org/project/speedtest-cli/) — internet speed test

**Frontend**
- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) — dark theme with glassmorphism accents
- [Recharts](https://recharts.org/) — real-time area charts
- [Framer Motion](https://www.framer.com/motion/) — page transitions & animations
- [Lucide React](https://lucide.dev/) — icons

**Deployment**
- Multi-stage `Dockerfile`: `node:20-alpine` (build) → `python:3.11-slim` (runtime)
- No Node.js in final image — only the compiled static assets

---

## 🩺 Health Alert Thresholds

| Level | CPU | RAM | Disk | GPU Temp |
|---|---|---|---|---|
| 🟢 **LOW** | ≤ 70% | ≤ 80% | ≤ 80% | ≤ 70°C |
| 🟡 **MEDIUM** | > 70% | > 80% | > 80% | > 70°C |
| 🔴 **HIGH** | > 85% | > 90% | > 90% | > 80°C |

---

## 📁 Project Structure

```
ibm-capstone-project/
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml          # Runtime config (host net, pid:host, GPU)
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI entrypoint, routes, WebSocket
│       └── system_monitor.py   # All metric readers (CPU/RAM/GPU/Disk/Net/Docker)
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx             # SPA shell, routing state
        ├── hooks/
        │   └── useMetrics.js   # WebSocket + REST seed hook
        ├── components/
        │   ├── Header.jsx
        │   └── Sidebar.jsx
        └── pages/
            ├── OverviewPage.jsx
            ├── UsagePage.jsx
            ├── DiskPage.jsx
            ├── NetworkPage.jsx
            ├── ProcessPage.jsx
            └── DockerPage.jsx
```

---

## 🔧 Development

```bash
# Backend (dev mode — hot reload)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (dev mode — Vite HMR)
cd frontend
npm install
npm run dev          # runs on :5173, proxies /api and /ws to :8000
```

---

## 📜 License

MIT — free to use, modify, and distribute.

---

<p align="center">
  Built for <strong>IBM Skillsbuild University Education × Hacktiv8</strong> Capstone Program
</p>
