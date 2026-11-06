# Product Requirements Document (PRD)
## Project: HomeLab Private Dashboard (Sleek, Modern, & Ultra-Lightweight Server Monitor)

---

### 1. Overview & Objectives
Membangun web dashboard monitoring home server kosan dengan tampilan **modern, interaktif, dan berkelas (portfolio-grade)** namun tetap **ultra-lightweight** dan berjalan secara **read-only** di dalam container Docker. Dashboard ini berfungsi memantau performa hardware, proses sistem (mirip `btop`), status port, dan status kontainer Docker secara privat melalui jaringan Tailscale.

---

### 2. Design Philosophy & Non-Functional Requirements
- **Client-Side Rendering Performance:** UI dibangun dengan React (Vite) yang di-compile menjadi aset statis. Semua rendering animasi dan grafik ditangani oleh browser client (laptop/HP), sehingga beban server tetap minimal.
- **Minimal Server Footprint:** Di server, runtime yang berjalan 24/7 **hanya satu proses Python FastAPI** yang menyajikan REST/WebSocket dan file statis frontend. Target konsumsi RAM server: **< 90 MB**.
- **Dynamic Hardware Discovery:** Tidak ada nilai hardware atau mount point yang di-*hardcode*. Penambahan drive storage, pergantian RAM, atau CPU harus terdeteksi secara otomatis saat runtime.
- **Graceful Degradation:** Jika modul GPU (NVML) atau Docker socket tidak tersedia, sistem tetap berjalan normal tanpa crash (komponen terkait disembunyikan/fallback).
- **Read-Only / Non-Intrusive:** Sistem hanya membaca metrik dan status tanpa hak akses untuk mematikan/mengubah state server atau kontainer (tahap awal).
- **Aesthetic Standard (Sleek & Josjis):** Mengusung dark theme elegan (Zinc/Slate 950), aksen *glassmorphism* (`backdrop-blur`), status indikator berdenyut (*pulsing badges*), dan transisi animasi halus antar tab.

---

### 3. Target Environment & Specifications
- **Host OS:** Ubuntu Linux LTS (64-bit)
- **CPU:** Intel Core i5-3330 (4 Cores / 4 Threads)
- **RAM:** 8 GB DDR3
- **Storage:** 128 GB SSD (Root / System) + 500 GB HDD (Data / Storage) + Dynamic expansion
- **GPU:** NVIDIA GeForce GT 1030 2GB
- **Runtime:** Docker Engine di host Ubuntu dengan akses:
  - `pid: host` (untuk monitoring proses host)
  - `network_mode: host` (untuk monitoring port & network bandwidth host)
  - `/var/run/docker.sock:ro` (read-only monitoring container)
  - NVIDIA Container Toolkit / GPU passthrough

---

### 4. Tech Stack Architecture

#### 4.1. Backend (Systems & Data Engine)
- **Framework:** Python 3.11+ / FastAPI (Asynchronous, High Performance)
- **System Libraries:**
  - `psutil`: CPU, RAM, Disks, Network I/O, Processes, Listening Ports
  - `pynvml`: NVIDIA NVML (GT 1030 utilization, VRAM, Temperature)
  - `docker`: Python Docker SDK via unix socket
- **Communication:**
  - REST API: Endpoint snapshot data lengkap (`/api/status/all`)
  - WebSocket: Real-time low-latency stream (`/ws/metrics`) interval 1-2 detik

#### 4.2. Frontend (Modern Interactive UI)
- **Framework:** React 18+ (Vite SPA)
- **Styling:** Tailwind CSS (Modern Dark Palette: Zinc/Slate, Glassmorphism, Neon Accents)
- **Icons:** Lucide React
- **Data Visualization:** Recharts / Chart.js (Real-time live gradient area & line charts)
- **Micro-Animations:** Framer Motion (Transisi halus perpindahan halaman, progress bar, & card hover)

#### 4.3. Packaging & Build Strategy
- **Multi-Stage Dockerfile:**
  - *Stage 1 (Build):* Node.js 20 Alpine untuk compile React -> folder `dist/`.
  - *Stage 2 (Runtime):* Python 3.11 Slim yang hanya berisi FastAPI backend dan menyajikan folder `dist/` sebagai static files. Node.js dibuang dari image akhir.

---

### 5. Detailed UI/UX & Page Breakdown

Layout menggunakan **Fixed Sidebar Navigation** di sebelah kiri (collapsible/responsif di mobile) dengan status banner server (Uptime, Tailscale Status, Hostname) dan 5 halaman utama:

#### 5.1. Page: USAGE (Resource Performance)
- **CPU Widget:** Model CPU (i5-3330), total load %, frekuensi rata-rata (GHz), usage bar per-core (Core 0 - 3).
- **GPU Widget (GT 1030):** Model GPU, GPU load %, VRAM used/total (MB), Suhu inti (°C) dengan indikator warna dinamis.
- **RAM Widget:** Total RAM, Used, Available, % Usage bar dengan animasi *smooth fill*.
- **Real-Time Performance Charts:** Grafik area bergradasi (*gradient fill*) live 1 detik sekali untuk CPU, GPU, dan RAM berdampingan dengan tooltip interaktif.

#### 5.2. Page: DISK (Dynamic Storage)
- **Dynamic Drive Cards:** Menampilkan seluruh disk fisik yang ter-mount (SSD 128GB, HDD 500GB, disk baru di masa depan). Mengabaikan virtual filesystem (`tmpfs`, `squashfs`).
- **Informasi per Disk:** Mount point, tipe filesystem, total capacity, used, free (dalam GB/TB), bar visual persentase, dan I/O rate (Read/Write speed).

#### 5.3. Page: NETWORK (Bandwidth & Ports)
- **Bandwidth Monitor:**
  - Real-time Download & Upload Speed (KB/s / MB/s) dengan animasi grafik garis bergerak.
- **Active Listening Ports Table:**
  - Kolom: Port Number, Protocol (TCP/UDP), Bind IP, Process Name, PID.
  - Search box instan untuk filter nomor port atau nama service.

#### 5.4. Page: PROCESS (Task Manager / btop Style)
- **Process List Table:**
  - Menampilkan Top 40 proses aktif di server.
  - Kolom: PID, Name, User, CPU (%), Memory (%), Status.
  - Filter pencarian cepat nama proses.
  - Tombol sorting: Urutkan berdasarkan CPU% atau Memory%.

#### 5.5. Page: DOCKER (Container Overview)
- **Summary Badges:** Total Containers, Running (Hijau Neon berdenyut), Stopped (Abu/Merah), Restarting (Amber).
- **Container Cards / Table:**
  - Container Name & Image ID.
  - Status Badge visual yang rapi.
  - Port mapping (Host -> Container).
  - Created time / Uptime.


---
### 6. Project Directory Tree
```text
IBM-CAPSTONE-PROJECT/
├── .agents/
│   ├── antislop.md            # Guidelines pencegahan kode berlebih/slop
│   ├── ponytail.md            # Style guide / quality enforcement
│   └── PRD.md                 # Dokumen spesifikasi utama proyek ini
├── docker-compose.yml         # Konfigurasi runtime host & socket
├── Dockerfile                 # Multi-stage build (Node -> Python)
├── backend/
│   ├── requirements.txt       # Dependencies FastAPI, psutil, nvml, docker
│   └── app/
│       ├── __init__.py
│       ├── main.py            # Entrypoint FastAPI, WebSocket & Static Mount
│       └── system_monitor.py  # Modul pembaca metrik hardware & host
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── App.jsx            # Shell layout, Sidebar & State Router
        ├── main.jsx
        ├── index.css          # Tailwind directives & custom animations
        ├── components/
        │   ├── Sidebar.jsx    # Navigasi samping interaktif
        │   ├── MetricCard.jsx # Card komponen dengan efek glassmorphism
        │   └── LiveChart.jsx  # Chart real-time bergradasi
        ├── pages/
        │   ├── UsagePage.jsx  # CPU, GPU GT1030, RAM
        │   ├── DiskPage.jsx   # Dynamic Disks (SSD/HDD) & I/O
        │   ├── NetworkPage.jsx# Live traffic & Listening Ports table
        │   ├── ProcessPage.jsx# btop / Task Manager table (sort & search)
        │   └── DockerPage.jsx # Container monitoring & status badges
        └── hooks/
            └── useWebSocket.js# Hook langganan live metrics stream
```
---

### 7. Implementation Roadmap
- **Milestone 1:** Backend Core (`backend/app/system_monitor.py` & `backend/app/main.py`) + REST & WebSocket endpoints.
- **Milestone 2:** Frontend Setup (Vite + React + Tailwind + Lucide) & Layout Shell (Sidebar + Navigation State).
- **Milestone 3:** Pembuatan Halaman Frontend (Usage, Disk, Network/Ports, Process, Docker) & integrasi WebSocket live data.
- **Milestone 4:** Packaging Multi-Stage `Dockerfile` & `docker-compose.yml` (`pid: host`, `network_mode: host`, `docker.sock`).
- **Milestone 5:** Pengujian di server Ubuntu & verifikasi akses privat Tailscale.