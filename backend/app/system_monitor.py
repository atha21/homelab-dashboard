"""System Monitor — reads host metrics via psutil, pynvml, and docker SDK."""

import socket
import time
import platform
import psutil

# --- GPU (NVML) setup — graceful fallback if driver absent ---
try:
    import pynvml
    pynvml.nvmlInit()
    _NVML_OK = True
except Exception:
    _NVML_OK = False

# --- Docker SDK setup — graceful fallback if socket absent ---
try:
    import docker as _docker_sdk
    _docker_client = _docker_sdk.DockerClient(base_url="unix:///var/run/docker.sock")
    _docker_client.ping()
    _DOCKER_OK = True
except Exception:
    _docker_client = None
    _DOCKER_OK = False

# Only include real physical/mounted filesystems
_PHYSICAL_FS = {"ext4", "ext3", "ext2", "xfs", "btrfs", "ntfs", "vfat", "fat32",
                "exfat", "f2fs", "zfs", "ufs", "hfs", "apfs", "reiserfs"}

# Device prefixes for real physical/virtual block devices only
_ALLOWED_DEV_PREFIXES = ("/dev/sd", "/dev/nvme", "/dev/vd")

# Mountpoint substrings that are definitely NOT real storage locations
_SKIP_MOUNT_SUBSTRINGS = ("/usr", "/etc", "/lib", "/var", "/snap", "/run", "/dev",
                           "/proc", "/sys", "/tmp", "/boot/efi")

# Mountpoints that ARE allowed (root + real storage, including /host/* from container bind-mount)
_ALLOWED_MOUNTPOINT_PREFIXES = ("/", "/home", "/mnt", "/media", "/data", "/storage",
                                  "/opt", "/srv", "/host")

# Persistent counter snapshot for network speed calculation
_prev_net: dict = {}
_prev_net_time: float = 0.0


def _get_ip_local() -> str | None:
    """Return the primary LAN IP (192.168.x.x / 10.x / 172.x). Uses a UDP trick — no packet sent."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def _get_ip_tailscale() -> str | None:
    """Return Tailscale IP from the tailscale0 interface (100.x.y.z)."""
    try:
        addrs = psutil.net_if_addrs()
        for iface_name in ("tailscale0", "ts0"):
            if iface_name in addrs:
                for addr in addrs[iface_name]:
                    if addr.family == socket.AF_INET and addr.address.startswith("100."):
                        return addr.address
    except Exception:
        pass
    return None


def _format_uptime(seconds: float) -> str:
    """Format uptime seconds into human-readable string like '3d 5h 12m'."""
    seconds = int(seconds)
    d = seconds // 86400
    h = (seconds % 86400) // 3600
    m = (seconds % 3600) // 60
    parts = []
    if d:
        parts.append(f"{d}d")
    if h:
        parts.append(f"{h}h")
    parts.append(f"{m}m")
    return " ".join(parts)


def get_system_info() -> dict:
    """Return hostname, uptime, LAN IP, and Tailscale IP."""
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    return {
        "hostname": socket.gethostname(),
        "uptime_seconds": round(uptime_seconds),
        "uptime": _format_uptime(uptime_seconds),
        "ip_local": _get_ip_local(),
        "ip_tailscale": _get_ip_tailscale(),
    }


def _cpu_model() -> str:
    """Read CPU model from /proc/cpuinfo on Linux; fall back to platform.processor()."""
    if platform.system() == "Linux":
        try:
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if line.startswith("model name"):
                        return line.split(":", 1)[1].strip()
        except OSError:
            pass
    return platform.processor() or "Unknown CPU"


def get_cpu_temp() -> float | None:
    """Return CPU temperature in °C using psutil.sensors_temperatures()."""
    try:
        temps = psutil.sensors_temperatures()
        if not temps:
            return None
        # Priority order of known keys
        for key in ("coretemp", "k10temp", "cpu_thermal", "acpitz", "thinkpad"):
            if key in temps:
                entries = temps[key]
                if entries:
                    # Pick the highest value (usually the package/tdie sensor)
                    return round(max(e.current for e in entries), 1)
        # Fallback: try any key whose name hints at CPU
        for key, entries in temps.items():
            if entries and any(k in key.lower() for k in ("cpu", "core", "temp")):
                return round(max(e.current for e in entries), 1)
    except Exception:
        pass
    return None


def get_cpu() -> dict:
    cpu_freq = psutil.cpu_freq()
    return {
        "model": _cpu_model(),
        "total_percent": psutil.cpu_percent(interval=None),
        "per_core_percent": psutil.cpu_percent(interval=None, percpu=True),
        "freq_ghz": round(cpu_freq.current / 1000, 2) if cpu_freq else None,
        "temp_celsius": get_cpu_temp(),
    }


def get_ram() -> dict:
    vm = psutil.virtual_memory()
    return {
        "total_mb": round(vm.total / 1024**2),
        "used_mb": round(vm.used / 1024**2),
        "available_mb": round(vm.available / 1024**2),
        "percent": vm.percent,
    }


def get_gpu() -> dict | None:
    """Return GPU metrics or None if NVML unavailable."""
    if not _NVML_OK:
        return None
    try:
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        util = pynvml.nvmlDeviceGetUtilizationRates(handle)
        mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
        temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
        name = pynvml.nvmlDeviceGetName(handle)
        # pynvml may return bytes on older versions
        if isinstance(name, bytes):
            name = name.decode("utf-8", errors="replace")
        return {
            "name": name,
            "utilization_percent": util.gpu,
            "vram_used_mb": round(mem.used / 1024**2),
            "vram_total_mb": round(mem.total / 1024**2),
            "temp_celsius": temp,
        }
    except Exception:
        return None


def _iter_partitions():
    """
    Yield disk partition namedtuples.

    Strategy:
      1. Always run psutil.disk_partitions(all=False) — works on bare-metal and
         on containers with pid:host where /proc is shared.
      2. If /host/proc/mounts exists (container with -v /:/host:ro), additionally
         parse it directly to catch host block-device mounts that the container's
         mount namespace might hide.  We yield synthetic namedtuples so the rest
         of get_disks() stays unchanged.
    """
    import collections

    _Part = collections.namedtuple("_Part", ["device", "mountpoint", "fstype", "opts"])

    # Standard psutil scan
    try:
        for p in psutil.disk_partitions(all=False):
            yield p
    except Exception:
        pass

    # Supplemental scan via /host/proc/mounts (Docker bind-mount of host /)
    host_mounts = "/host/proc/mounts"
    if not platform.system() == "Linux":
        return
    try:
        import os
        if not os.path.exists(host_mounts):
            return
        with open(host_mounts) as f:
            for line in f:
                parts = line.split()
                if len(parts) < 4:
                    continue
                device, mountpoint, fstype, opts = parts[0], parts[1], parts[2], parts[3]
                # Rewrite mountpoint: /host/proc/mounts shows host-relative paths,
                # but the actual path accessible from this process is /host + path
                accessible_mp = "/host" + mountpoint if mountpoint != "/" else "/host"
                yield _Part(device=device, mountpoint=accessible_mp, fstype=fstype, opts=opts)
    except Exception:
        pass


def get_disks() -> list[dict]:
    disks = []
    seen_devices: set[str] = set()
    try:
        io_counters = psutil.disk_io_counters(perdisk=True)
    except Exception:
        io_counters = {}

    for part in _iter_partitions():
        fstype = part.fstype.lower().strip()

        # Strict whitelist: only known physical filesystems
        if fstype not in _PHYSICAL_FS:
            continue

        # Only allow real block device prefixes (sd*, nvme*, vd*)
        if not any(part.device.startswith(pfx) for pfx in _ALLOWED_DEV_PREFIXES):
            continue

        # De-duplicate: one entry per physical device node
        if part.device in seen_devices:
            continue

        # Reject mountpoints containing system path substrings
        mp = part.mountpoint
        # Strip leading /host prefix for the substring/prefix checks so rules apply uniformly
        check_mp = mp[5:] if mp.startswith("/host") else mp
        check_mp = check_mp or "/"

        if any(sub in check_mp for sub in _SKIP_MOUNT_SUBSTRINGS):
            # Allow root "/" exactly; reject everything else that matches a substring
            if check_mp != "/":
                continue

        # Only allow root or real storage mountpoint prefixes
        if not any(check_mp == pfx or check_mp.startswith(pfx + "/") for pfx in _ALLOWED_MOUNTPOINT_PREFIXES):
            continue

        try:
            usage = psutil.disk_usage(mp)
        except (PermissionError, OSError):
            continue

        seen_devices.add(part.device)
        dev_name = part.device.split("/")[-1]
        io = io_counters.get(dev_name) if io_counters else None
        # Normalise displayed mountpoint: strip /host prefix for cleaner UI
        display_mp = check_mp
        disks.append({
            "device": part.device,
            "mountpoint": display_mp,
            "fstype": part.fstype,
            "total_gb": round(usage.total / 1024**3, 1),
            "used_gb": round(usage.used / 1024**3, 1),
            "free_gb": round(usage.free / 1024**3, 1),
            "percent": usage.percent,
            "io_read_mb": round(io.read_bytes / 1024**2) if io else None,
            "io_write_mb": round(io.write_bytes / 1024**2) if io else None,
        })
    return disks


def get_network_speed() -> dict:
    """Return current Download/Upload speed in KB/s using delta from last call."""
    global _prev_net, _prev_net_time

    now = time.monotonic()
    counters = psutil.net_io_counters()

    if _prev_net and (now - _prev_net_time) > 0:
        delta = now - _prev_net_time
        down_kbs = round((counters.bytes_recv - _prev_net["bytes_recv"]) / delta / 1024, 1)
        up_kbs = round((counters.bytes_sent - _prev_net["bytes_sent"]) / delta / 1024, 1)
    else:
        down_kbs = 0.0
        up_kbs = 0.0

    _prev_net = {"bytes_recv": counters.bytes_recv, "bytes_sent": counters.bytes_sent}
    _prev_net_time = now
    return {"download_kbs": max(down_kbs, 0.0), "upload_kbs": max(up_kbs, 0.0)}


def get_listening_ports() -> list[dict]:
    """Return top-40 unique listening ports; handles AccessDenied gracefully."""
    ports = []
    try:
        connections = psutil.net_connections(kind="inet")
    except psutil.AccessDenied:
        return []

    for conn in connections:
        if conn.status != psutil.CONN_LISTEN:
            continue
        try:
            proc_name = psutil.Process(conn.pid).name() if conn.pid else None
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            proc_name = None
        ports.append({
            "port": conn.laddr.port,
            "protocol": "TCP" if conn.type == 1 else "UDP",
            "bind_ip": conn.laddr.ip,
            "pid": conn.pid,
            "process": proc_name,
        })

    # Deduplicate by (port, protocol, bind_ip)
    seen = set()
    unique = []
    for p in sorted(ports, key=lambda x: x["port"]):
        key = (p["port"], p["protocol"], p["bind_ip"])
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique[:40]


def get_processes(sort_by: str = "cpu") -> list[dict]:
    """Return top-40 processes sorted by cpu_percent or memory_percent."""
    procs = []
    attrs = ["pid", "name", "username", "cpu_percent", "memory_percent", "status"]
    for proc in psutil.process_iter(attrs):
        try:
            info = proc.info
            procs.append({
                "pid": info["pid"],
                "name": info["name"],
                "username": info["username"],
                "cpu_percent": info["cpu_percent"] or 0.0,
                "memory_percent": round(info["memory_percent"] or 0.0, 2),
                "status": info["status"],
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    key = "memory_percent" if sort_by == "memory" else "cpu_percent"
    procs.sort(key=lambda p: p[key], reverse=True)
    return procs[:40]


def get_docker_containers() -> list[dict] | None:
    """Return all containers (running + stopped) or None if Docker unavailable."""
    if not _DOCKER_OK or _docker_client is None:
        return None
    try:
        containers = _docker_client.containers.list(all=True)
        result = []
        for c in containers:
            result.append({
                "id": c.short_id,
                "name": c.name,
                "image": c.image.tags[0] if c.image.tags else c.image.short_id,
                "status": c.status,
                "ports": c.ports,
                "created": c.attrs.get("Created", ""),
            })
        return result
    except Exception:
        return None


def compute_health(cpu: dict, ram: dict, gpu: dict | None, disks: list[dict]) -> dict:
    """
    Evaluate overall server health.

    Returns:
        {
          "health_level": "LOW" | "MEDIUM" | "HIGH",
          "alerts": [str, ...]   # non-empty when MEDIUM or HIGH
        }
    """
    alerts = []
    level = "LOW"

    cpu_pct = cpu.get("total_percent", 0) or 0
    ram_pct = ram.get("percent", 0) or 0
    gpu_temp = (gpu or {}).get("temp_celsius", 0) or 0
    max_disk_pct = max((d.get("percent", 0) for d in disks), default=0)

    # HIGH conditions
    if cpu_pct > 85:
        level = "HIGH"
        alerts.append(f"CPU overloaded at {cpu_pct:.0f}%")
    if ram_pct > 90:
        level = "HIGH"
        alerts.append(f"RAM critically high at {ram_pct:.0f}%")
    if max_disk_pct > 90:
        level = "HIGH"
        alerts.append(f"Disk critically full at {max_disk_pct:.0f}%")
    if gpu_temp > 80:
        level = "HIGH"
        alerts.append(f"GPU overheating at {gpu_temp}°C")

    # MEDIUM conditions (only escalate if not already HIGH)
    if level != "HIGH":
        if cpu_pct > 70:
            level = "MEDIUM"
            alerts.append(f"CPU load elevated at {cpu_pct:.0f}%")
        if ram_pct > 80:
            level = "MEDIUM"
            alerts.append(f"RAM usage high at {ram_pct:.0f}%")
        if max_disk_pct > 80:
            level = "MEDIUM"
            alerts.append(f"Disk usage high at {max_disk_pct:.0f}%")
        if gpu_temp > 70:
            level = "MEDIUM"
            alerts.append(f"GPU temperature elevated at {gpu_temp}°C")

    return {"health_level": level, "alerts": alerts}


class SystemMonitor:
    """Aggregates all metric readers into one callable interface."""

    def snapshot_all(self) -> dict:
        """Full snapshot — used by /api/status/all."""
        cpu = get_cpu()
        ram = get_ram()
        gpu = get_gpu()
        disks = get_disks()
        health = compute_health(cpu, ram, gpu, disks)
        return {
            "system": get_system_info(),
            "cpu": cpu,
            "ram": ram,
            "gpu": gpu,
            "disks": disks,
            "network": get_network_speed(),
            "ports": get_listening_ports(),
            "processes": get_processes(),
            "docker": get_docker_containers(),
            "health": health,
        }

    def snapshot_realtime(self) -> dict:
        """Lightweight snapshot for WebSocket stream (1.5 s interval)."""
        cpu = get_cpu()
        ram = get_ram()
        gpu = get_gpu()
        disks = get_disks()
        health = compute_health(cpu, ram, gpu, disks)
        return {
            "system": get_system_info(),
            "cpu": cpu,
            "ram": ram,
            "gpu": gpu,
            "network": get_network_speed(),
            "processes": get_processes(),
            "disks": disks,
            "health": health,
        }
