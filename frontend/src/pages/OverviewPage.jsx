import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area, Tooltip,
} from 'recharts'
import { useRef, useEffect } from 'react'

// ── Health config ─────────────────────────────────────────────────
const HEALTH_CONFIG = {
  LOW: {
    label: 'ALL SYSTEMS OPERATIONAL',
    sub: 'Beban Server Normal & Sehat',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_32px_rgba(16,185,129,0.15)]',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    bar: '#10b981',
    barTo: '#34d399',
    text: 'text-emerald-400',
  },
  MEDIUM: {
    label: 'ELEVATED SYSTEM LOAD',
    sub: 'Terdapat komponen dengan beban tinggi!',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_32px_rgba(245,158,11,0.18)]',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
    bar: '#f59e0b',
    barTo: '#fcd34d',
    text: 'text-amber-400',
  },
  HIGH: {
    label: 'CRITICAL LOAD DETECTED',
    sub: 'Peringatan! Server terindikasi high load / bottleneck!',
    border: 'border-red-500/40',
    glow: 'shadow-[0_0_40px_rgba(239,68,68,0.2)]',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    dot: 'bg-red-500',
    bar: '#ef4444',
    barTo: '#f87171',
    text: 'text-red-400',
  },
}

// ── Helpers ──────────────────────────────────────────────────────
function statusForPercent(pct, highThresh, medThresh) {
  if (pct >= highThresh) return 'HIGH'
  if (pct >= medThresh) return 'MEDIUM'
  return 'LOW'
}

function BadgeStatus({ level, size = 'sm' }) {
  const cfg = HEALTH_CONFIG[level] ?? HEALTH_CONFIG.LOW
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-semibold rounded-full border',
        cfg.badge,
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0 animate-pulse', cfg.dot)} />
      {level}
    </span>
  )
}

function MiniBar({ percent, color = '#38bdf8', bg = '#1c1c22' }) {
  const safe = Math.min(Math.max(percent ?? 0, 0), 100)
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: bg }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${safe}%`, background: color }}
      />
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────
function Skeleton({ className }) {
  return (
    <div className={clsx('animate-pulse rounded-lg bg-zinc-800/60', className)} />
  )
}

// ── Main Health Banner ────────────────────────────────────────────
function HealthBanner({ health, alerts }) {
  const level = health?.health_level ?? 'LOW'
  const cfg = HEALTH_CONFIG[level]

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={clsx(
        'relative overflow-hidden rounded-2xl border px-6 py-5',
        'bg-zinc-900/60 backdrop-blur-xl',
        cfg.border,
        cfg.glow,
      )}
    >
      {/* Background accent stripe */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${cfg.bar}, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Status dot + label */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={clsx(
              'h-3 w-3 rounded-full shrink-0 animate-pulse',
              cfg.dot,
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className={clsx('text-sm font-bold tracking-widest uppercase', cfg.text)}>
              {cfg.label}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">{cfg.sub}</p>
          </div>
        </div>

        {/* Badge */}
        <BadgeStatus level={level} size="md" />
      </div>

      {/* Alert list */}
      {alerts?.length > 0 && (
        <ul className="mt-4 space-y-1">
          {alerts.map((a, i) => (
            <li key={i} className={clsx('text-xs flex items-center gap-2', cfg.text)}>
              <span aria-hidden="true">▸</span> {a}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}

// ── Component Sub-Card ────────────────────────────────────────────
function ComponentCard({ title, icon, level, children, delay = 0 }) {
  const cfg = HEALTH_CONFIG[level ?? 'LOW']
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={clsx(
        'relative rounded-xl border p-4 space-y-3',
        'bg-zinc-900/50 backdrop-blur-xl',
        'border-white/10 hover:border-cyan-500/30 transition-colors duration-300',
        cfg.glow,
      )}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-px rounded-full opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.bar}, transparent)` }}
        aria-hidden="true"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{icon}</span>
          <span className="text-xs font-semibold tracking-widest uppercase text-zinc-400">
            {title}
          </span>
        </div>
        <BadgeStatus level={level ?? 'LOW'} />
      </div>

      <div className="space-y-2">{children}</div>
    </motion.div>
  )
}

function StatLine({ label, value, muted }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={clsx('text-xs font-mono', muted ? 'text-zinc-600' : 'text-zinc-200')}>
        {value ?? '--'}
      </span>
    </div>
  )
}

// ── Sparkline mini chart ──────────────────────────────────────────
function Sparkline({ data, dataKey, color }) {
  if (!data || data.length < 2) return null
  return (
    <div className="h-8 w-full -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${dataKey})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── CPU Card ──────────────────────────────────────────────────────
function CpuCard({ cpu, sparkData }) {
  if (!cpu) return (
    <ComponentCard title="CPU" icon="⚡" level="LOW">
      <Skeleton className="h-16" />
    </ComponentCard>
  )

  const level = statusForPercent(cpu.total_percent, 85, 70)
  const cfg = HEALTH_CONFIG[level]
  const tempLevel = cpu.temp_celsius != null
    ? (cpu.temp_celsius > 80 ? 'HIGH' : cpu.temp_celsius > 65 ? 'MEDIUM' : 'LOW')
    : 'LOW'
  const tempColor = HEALTH_CONFIG[tempLevel].bar

  return (
    <ComponentCard title="CPU" icon="⚡" level={level}>
      <StatLine label="Load" value={`${cpu.total_percent ?? 0}%`} />
      <MiniBar percent={cpu.total_percent} color={cfg.bar} />
      {cpu.freq_ghz != null && <StatLine label="Clock" value={`${cpu.freq_ghz} GHz`} />}
      {cpu.temp_celsius != null && (
        <StatLine
          label="Temp"
          value={<span style={{ color: tempColor }}>{cpu.temp_celsius}°C</span>}
        />
      )}
      <Sparkline data={sparkData} dataKey="cpu" color={cfg.bar} />
    </ComponentCard>
  )
}

// ── GPU Card ──────────────────────────────────────────────────────
function GpuCard({ gpu, sparkData }) {
  if (gpu === undefined) return (
    <ComponentCard title="GPU" icon="🎮" level="LOW">
      <Skeleton className="h-16" />
    </ComponentCard>
  )
  if (gpu === null) return (
    <ComponentCard title="GPU" icon="🎮" level="LOW">
      <p className="text-xs text-zinc-600 text-center py-3">No GPU / NVML offline</p>
    </ComponentCard>
  )

  const level = gpu.temp_celsius > 80 ? 'HIGH' : gpu.temp_celsius > 70 ? 'MEDIUM' : 'LOW'
  const cfg = HEALTH_CONFIG[level]
  const vramPct = gpu.vram_total_mb > 0 ? (gpu.vram_used_mb / gpu.vram_total_mb) * 100 : 0

  return (
    <ComponentCard title="GPU" icon="🎮" level={level}>
      <StatLine label="Model" value={gpu.name} />
      <StatLine label="Load" value={`${gpu.utilization_percent}%`} />
      <MiniBar percent={gpu.utilization_percent} color={cfg.bar} />
      <StatLine label="Temp" value={<span style={{ color: cfg.bar }}>{gpu.temp_celsius}°C</span>} />
      <StatLine label="VRAM" value={`${gpu.vram_used_mb}/${gpu.vram_total_mb} MB`} />
      <MiniBar percent={vramPct} color="#8b5cf6" />
      <Sparkline data={sparkData} dataKey="gpu" color={cfg.bar} />
    </ComponentCard>
  )
}

// ── RAM Card ──────────────────────────────────────────────────────
function RamCard({ ram, sparkData }) {
  if (!ram) return (
    <ComponentCard title="RAM" icon="🧠" level="LOW">
      <Skeleton className="h-16" />
    </ComponentCard>
  )

  const level = statusForPercent(ram.percent, 90, 80)
  const cfg = HEALTH_CONFIG[level]
  const totalGb = (ram.total_mb / 1024).toFixed(1)

  return (
    <ComponentCard title="RAM" icon="🧠" level={level}>
      <StatLine label="Usage" value={`${ram.percent}%`} />
      <MiniBar percent={ram.percent} color={cfg.bar} />
      <StatLine label="Used" value={`${(ram.used_mb / 1024).toFixed(1)} / ${totalGb} GB`} />
      <Sparkline data={sparkData} dataKey="ram" color={cfg.bar} />
    </ComponentCard>
  )
}

// ── Disk Card ─────────────────────────────────────────────────────
function DiskCard({ disks }) {
  if (!disks || disks.length === 0) return (
    <ComponentCard title="DISK" icon="💾" level="LOW">
      <p className="text-xs text-zinc-600 text-center py-3">No disk data</p>
    </ComponentCard>
  )

  const primary = disks.find(d => d.mountpoint === '/') ?? disks[0]
  const totalAll = disks.reduce((s, d) => s + d.total_gb, 0)
  const freeAll  = disks.reduce((s, d) => s + d.free_gb, 0)
  const level    = statusForPercent(primary.percent, 90, 80)
  const cfg      = HEALTH_CONFIG[level]

  return (
    <ComponentCard title="DISK" icon="💾" level={level}>
      {disks.slice(0, 3).map(d => (
        <div key={d.mountpoint} className="space-y-1">
          <StatLine label={d.mountpoint} value={`${d.percent}%`} />
          <MiniBar percent={d.percent} color={cfg.bar} />
        </div>
      ))}
      <StatLine label="Total" value={`${totalAll.toFixed(1)} GB`} muted />
      <StatLine label="Free"  value={`${freeAll.toFixed(1)} GB`} muted />
    </ComponentCard>
  )
}

// ── Network Card ──────────────────────────────────────────────────
function NetworkCard({ network, sparkData }) {
  if (!network) return (
    <ComponentCard title="NETWORK" icon="🌐" level="LOW">
      <Skeleton className="h-16" />
    </ComponentCard>
  )

  const dl = network.download_kbs ?? 0
  const ul = network.upload_kbs ?? 0
  const dlStr = dl >= 1024 ? `${(dl / 1024).toFixed(2)} MB/s` : `${dl} KB/s`
  const ulStr = ul >= 1024 ? `${(ul / 1024).toFixed(2)} MB/s` : `${ul} KB/s`

  return (
    <ComponentCard title="NETWORK" icon="🌐" level="LOW">
      <StatLine label="↓ Download" value={dlStr} />
      <StatLine label="↑ Upload"   value={ulStr} />
      <Sparkline data={sparkData} dataKey="net_dl" color="#06b6d4" />
    </ComponentCard>
  )
}

// ── Docker Quick Strip ────────────────────────────────────────────
function DockerStrip({ docker }) {
  if (!docker) return null

  const running = docker.filter(c => c.status === 'running').length
  const stopped = docker.length - running

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
      className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl px-5 py-4 flex items-center gap-6 flex-wrap"
    >
      <span className="text-xs font-semibold tracking-widest uppercase text-zinc-500">
        🐳 Docker
      </span>
      <span className="flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-zinc-300">{running} Running</span>
      </span>
      <span className="flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-zinc-600" />
        <span className="text-zinc-500">{stopped} Stopped</span>
      </span>
      <div className="flex gap-1.5 flex-wrap ml-auto">
        {docker.slice(0, 6).map(c => (
          <span
            key={c.id}
            className={clsx(
              'text-[10px] font-mono px-2 py-0.5 rounded border',
              c.status === 'running'
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-zinc-600 border-zinc-700/40 bg-zinc-800/40',
            )}
          >
            {c.name}
          </span>
        ))}
        {docker.length > 6 && (
          <span className="text-[10px] text-zinc-600 px-1 py-0.5">+{docker.length - 6} more</span>
        )}
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
const HISTORY_LEN = 30

export default function OverviewPage({ metrics }) {
  const historyRef = useRef([])

  useEffect(() => {
    if (!metrics) return
    const point = {
      t:      Date.now(),
      cpu:    metrics.cpu?.total_percent       ?? 0,
      gpu:    metrics.gpu?.utilization_percent ?? 0,
      ram:    metrics.ram?.percent             ?? 0,
      net_dl: metrics.network?.download_kbs    ?? 0,
    }
    historyRef.current = [...historyRef.current.slice(-(HISTORY_LEN - 1)), point]
  }, [metrics])

  const spark = historyRef.current
  const health = metrics?.health

  return (
    <div className="space-y-5 w-full">
      {/* Main health banner */}
      <HealthBanner health={health} alerts={health?.alerts} />

      {/* 5-card component grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <CpuCard     cpu={metrics?.cpu}           sparkData={spark} />
        <GpuCard     gpu={metrics?.gpu}           sparkData={spark} />
        <RamCard     ram={metrics?.ram}           sparkData={spark} />
        <DiskCard    disks={metrics?.disks} />
        <NetworkCard network={metrics?.network}   sparkData={spark} />
      </div>

      {/* Docker strip */}
      {metrics?.docker && <DockerStrip docker={metrics.docker} />}
    </div>
  )
}
