import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import {
  ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis,
} from 'recharts'

// ── Constants ─────────────────────────────────────────────────────
const HISTORY_LEN = 60

// ── Shared primitives ─────────────────────────────────────────────

function LoadingState() {
  return (
    <p className="text-zinc-600 text-sm animate-pulse" role="status" aria-live="polite">
      Waiting for data...
    </p>
  )
}

function StatRow({ label, value, unit }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-white/[0.05] last:border-0">
      <span className="text-zinc-500 text-sm">{label}</span>
      <span className="text-zinc-100 text-sm font-mono">
        {value != null ? value : <span className="text-zinc-700">--</span>}
        {unit && value != null && <span className="text-zinc-600 text-xs ml-1">{unit}</span>}
      </span>
    </div>
  )
}

function UsageBar({ percent, gradientFrom, gradientTo }) {
  const safe = Math.min(Math.max(percent ?? 0, 0), 100)
  return (
    <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden" aria-hidden="true">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${safe}%`,
          background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
        }}
      />
    </div>
  )
}

function MetricCard({ title, accentColor, children, className, span }) {
  return (
    <section
      className={clsx(
        'rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl p-5 space-y-3',
        'relative overflow-hidden hover:border-cyan-500/20 transition-colors duration-300',
        span === 'full' && 'col-span-full',
        className,
      )}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        aria-hidden="true"
      />
      <h2 className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: accentColor }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

// ── Large area chart (h-56 = 224px) ──────────────────────────────
function GradientAreaChart({
  data, dataKey, gradientId,
  strokeColor, gradientColorTop, gradientColorBot,
  label, unit = '%', domain = [0, 100],
}) {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="backdrop-blur-md bg-zinc-900/90 border border-zinc-700/60
                      rounded-lg px-3 py-1.5 text-xs text-zinc-100 shadow-lg">
        {label}:{' '}
        <span className="font-mono" style={{ color: strokeColor }}>
          {payload[0].value?.toFixed(1)}{unit}
        </span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 6, right: 0, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={gradientColorTop} stopOpacity={0.6} />
            <stop offset="100%" stopColor={gradientColorBot} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" hide />
        <YAxis domain={domain} hide tickCount={5} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── CPU widget ────────────────────────────────────────────────────
function CpuWidget({ cpu, history }) {
  if (!cpu) return <LoadingState />

  const pct = cpu.total_percent ?? 0
  const barFrom = pct > 80 ? '#f43f5e' : pct > 50 ? '#f59e0b' : '#38bdf8'
  const barTo   = pct > 80 ? '#fb7185' : pct > 50 ? '#fcd34d' : '#22d3ee'
  const tempColor = cpu.temp_celsius != null
    ? (cpu.temp_celsius > 80 ? '#f87171' : cpu.temp_celsius > 65 ? '#fbbf24' : '#34d399')
    : '#52525b'

  return (
    <div className="space-y-3">
      <StatRow label="Model"       value={cpu.model} />
      <StatRow label="Load"        value={pct}           unit="%" />
      <StatRow label="Frequency"   value={cpu.freq_ghz}  unit="GHz" />
      {cpu.temp_celsius != null && (
        <StatRow
          label="Temperature"
          value={<span style={{ color: tempColor }}>{cpu.temp_celsius}°C</span>}
        />
      )}
      <UsageBar percent={pct} gradientFrom={barFrom} gradientTo={barTo} />

      {/* Per-core bars */}
      {cpu.per_core_percent?.length > 0 && (
        <div className="pt-1">
          <p className="text-xs text-zinc-600 mb-2">Per-core</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
            {cpu.per_core_percent.map((corePct, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>C{i}</span>
                  <span className="font-mono text-zinc-300">{corePct}%</span>
                </div>
                <UsageBar percent={corePct} gradientFrom={barFrom} gradientTo={barTo} />
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="pt-2 border-t border-white/[0.05]">
          <p className="text-xs text-zinc-700 mb-1">History</p>
          <GradientAreaChart
            data={history} dataKey="cpu" gradientId="cpu-grad"
            strokeColor="#38bdf8" gradientColorTop="#38bdf8" gradientColorBot="#0ea5e9"
            label="CPU"
          />
        </div>
      )}
    </div>
  )
}

// ── GPU widget ────────────────────────────────────────────────────
function GpuWidget({ gpu, history }) {
  if (gpu === undefined) return <LoadingState />
  if (gpu === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20
                        flex items-center justify-center mb-1">
          <span className="text-violet-500 text-lg" aria-hidden="true">⬡</span>
        </div>
        <p className="text-zinc-400 text-sm font-medium">GPU Offline</p>
        <p className="text-zinc-600 text-xs">No NVML driver detected</p>
      </div>
    )
  }

  const tempColor = gpu.temp_celsius > 75 ? '#f87171'
                  : gpu.temp_celsius >= 60 ? '#fbbf24'
                  : '#34d399'
  const vramPct = gpu.vram_total_mb > 0 ? (gpu.vram_used_mb / gpu.vram_total_mb) * 100 : 0

  return (
    <div className="space-y-3">
      <StatRow label="Model"       value={gpu.name} />
      <StatRow label="GPU Load"    value={gpu.utilization_percent} unit="%" />
      <UsageBar percent={gpu.utilization_percent} gradientFrom="#8b5cf6" gradientTo="#c084fc" />
      <StatRow label="VRAM"        value={`${gpu.vram_used_mb} / ${gpu.vram_total_mb}`} unit="MB" />
      <UsageBar percent={vramPct}  gradientFrom="#7c3aed" gradientTo="#a78bfa" />
      <StatRow
        label="Temperature"
        value={<span style={{ color: tempColor }}>{gpu.temp_celsius}°C</span>}
      />
      {history.length > 1 && (
        <div className="pt-2 border-t border-white/[0.05]">
          <p className="text-xs text-zinc-700 mb-1">History</p>
          <GradientAreaChart
            data={history} dataKey="gpu" gradientId="gpu-grad"
            strokeColor="#a78bfa" gradientColorTop="#8b5cf6" gradientColorBot="#6d28d9"
            label="GPU"
          />
        </div>
      )}
    </div>
  )
}

// ── RAM widget ────────────────────────────────────────────────────
function RamWidget({ ram, history }) {
  if (!ram) return <LoadingState />

  const barFrom = ram.percent > 80 ? '#f43f5e' : '#10b981'
  const barTo   = ram.percent > 80 ? '#fb7185' : '#34d399'

  return (
    <div className="space-y-3">
      <StatRow label="Total"     value={(ram.total_mb / 1024).toFixed(1)} unit="GB" />
      <StatRow label="Used"      value={(ram.used_mb / 1024).toFixed(1)}  unit="GB" />
      <StatRow label="Available" value={(ram.available_mb / 1024).toFixed(1)} unit="GB" />
      <StatRow label="Usage"     value={ram.percent} unit="%" />
      <UsageBar percent={ram.percent} gradientFrom={barFrom} gradientTo={barTo} />
      {history.length > 1 && (
        <div className="pt-2 border-t border-white/[0.05]">
          <p className="text-xs text-zinc-700 mb-1">History</p>
          <GradientAreaChart
            data={history} dataKey="ram" gradientId="ram-grad"
            strokeColor="#34d399" gradientColorTop="#10b981" gradientColorBot="#059669"
            label="RAM"
          />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function UsagePage({ metrics }) {
  const historyRef = useRef([])

  useEffect(() => {
    if (!metrics) return
    const point = {
      t:   Date.now(),
      cpu: metrics.cpu?.total_percent        ?? 0,
      gpu: metrics.gpu?.utilization_percent  ?? 0,
      ram: metrics.ram?.percent              ?? 0,
    }
    historyRef.current = [...historyRef.current.slice(-(HISTORY_LEN - 1)), point]
  }, [metrics])

  const history = historyRef.current

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">
      <MetricCard title="CPU" accentColor="#38bdf8">
        <CpuWidget cpu={metrics?.cpu} history={history} />
      </MetricCard>

      <MetricCard title="GPU" accentColor="#a78bfa">
        <GpuWidget gpu={metrics?.gpu} history={history} />
      </MetricCard>

      <MetricCard title="RAM" accentColor="#34d399">
        <RamWidget ram={metrics?.ram} history={history} />
      </MetricCard>
    </div>
  )
}
