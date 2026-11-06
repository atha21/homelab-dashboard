import { useRef, useEffect, useState } from 'react'
import { clsx } from 'clsx'

// ── I/O rate tracker ──────────────────────────────────────────────
// Computes KB/s delta between consecutive disk I/O snapshots (cumulative MB -> rate)
function useDiskIoRates(disks) {
  const prevRef = useRef({})   // { device: { read_mb, write_mb, ts } }
  const [rates, setRates] = useState({})

  useEffect(() => {
    if (!disks) return
    const now = Date.now()
    const next = {}
    const nextPrev = {}

    disks.forEach(d => {
      const key  = d.device
      const prev = prevRef.current[key]
      if (
        prev &&
        d.io_read_mb  != null &&
        d.io_write_mb != null &&
        now - prev.ts > 0
      ) {
        const elapsedS = (now - prev.ts) / 1000
        next[key] = {
          read_kbs:  Math.max(((d.io_read_mb  - prev.read_mb)  * 1024) / elapsedS, 0).toFixed(1),
          write_kbs: Math.max(((d.io_write_mb - prev.write_mb) * 1024) / elapsedS, 0).toFixed(1),
        }
      } else {
        next[key] = null   // no rate yet on first tick
      }
      nextPrev[key] = {
        read_mb:  d.io_read_mb,
        write_mb: d.io_write_mb,
        ts:       now,
      }
    })

    prevRef.current = nextPrev
    setRates(next)
  }, [disks])

  return rates
}

// ── Disk card ─────────────────────────────────────────────────────

function DiskBar({ percent }) {
  // Gradient shifts from cyan-emerald (healthy) to amber (caution) to rose (critical)
  const gradFrom = percent > 85 ? '#f43f5e' : percent > 70 ? '#f59e0b' : '#06b6d4'
  const gradTo   = percent > 85 ? '#fb7185' : percent > 70 ? '#fcd34d' : '#34d399'
  const glow     = percent > 85 ? 'shadow-glow-rose' : percent > 70 ? 'shadow-glow-amber' : ''

  return (
    <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden" aria-hidden="true">
      <div
        className={clsx('h-full rounded-full transition-all duration-500', glow)}
        style={{
          width: `${percent}%`,
          background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
        }}
      />
    </div>
  )
}

function DiskCard({ disk, ioRate }) {
  const isCritical = disk.percent > 85
  const isWarning  = disk.percent > 70 && !isCritical

  return (
    <div className={clsx(
      'metric-card p-5 space-y-3 relative overflow-hidden',
      isCritical && 'border-rose-500/20',
      isWarning  && 'border-amber-500/15',
    )}>
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-50"
        style={{
          background: isCritical
            ? 'linear-gradient(90deg, transparent, #f43f5e, transparent)'
            : isWarning
            ? 'linear-gradient(90deg, transparent, #f59e0b, transparent)'
            : 'linear-gradient(90deg, transparent, #06b6d4, transparent)',
        }}
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{disk.mountpoint}</p>
          <p className="text-xs text-zinc-600 mt-0.5 truncate">{disk.device} &middot; {disk.fstype}</p>
        </div>
        <span className={clsx(
          'text-xs font-mono px-2 py-0.5 rounded-full shrink-0',
          isCritical ? 'bg-rose-500/10 text-rose-400' :
          isWarning  ? 'bg-amber-500/10 text-amber-400' :
          'bg-cyan-500/10 text-cyan-400',
        )}>
          {disk.percent}%
        </span>
      </div>

      <DiskBar percent={disk.percent} />

      {/* Capacity grid */}
      <div className="grid grid-cols-3 gap-2 text-xs text-center">
        <div>
          <p className="text-zinc-600">Total</p>
          <p className="text-zinc-100 font-mono mt-0.5">{disk.total_gb} GB</p>
        </div>
        <div>
          <p className="text-zinc-600">Used</p>
          <p className="text-zinc-100 font-mono mt-0.5">{disk.used_gb} GB</p>
        </div>
        <div>
          <p className="text-zinc-600">Free</p>
          <p className="text-zinc-100 font-mono mt-0.5">{disk.free_gb} GB</p>
        </div>
      </div>

      {/* I/O rate row */}
      <div className="flex gap-4 text-xs pt-1 border-t border-white/[0.05]">
        <span className="text-zinc-600">
          Read:{' '}
          <span className="text-cyan-300 font-mono">
            {ioRate ? `${ioRate.read_kbs} KB/s` : '--'}
          </span>
        </span>
        <span className="text-zinc-600">
          Write:{' '}
          <span className="text-violet-300 font-mono">
            {ioRate ? `${ioRate.write_kbs} KB/s` : '--'}
          </span>
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function DiskPage({ metrics }) {
  const disks   = metrics?.disks
  const ioRates = useDiskIoRates(disks)

  if (!disks) {
    return (
      <p className="text-zinc-600 text-sm animate-pulse" role="status" aria-live="polite">
        Waiting for data...
      </p>
    )
  }

  if (disks.length === 0) {
    return <p className="text-zinc-600 text-sm">No physical disks detected.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {disks.map(disk => (
        <DiskCard
          key={disk.device + disk.mountpoint}
          disk={disk}
          ioRate={ioRates[disk.device] ?? null}
        />
      ))}
    </div>
  )
}
