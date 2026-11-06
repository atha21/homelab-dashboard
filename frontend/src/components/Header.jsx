function pad2(n) { return String(n).padStart(2, '0') }

function formatClock(date) {
  if (!date) return '--'
  const Y = date.getFullYear()
  const M = pad2(date.getMonth() + 1)
  const D = pad2(date.getDate())
  const h = pad2(date.getHours())
  const m = pad2(date.getMinutes())
  const s = pad2(date.getSeconds())
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

function Chip({ icon, label, value, accent }) {
  const accentClass = {
    cyan:    'border-cyan-500/30 text-cyan-300',
    emerald: 'border-emerald-500/30 text-emerald-300',
    default: 'border-zinc-700/50 text-zinc-200',
  }[accent ?? 'default']

  return (
    <span className={`inline-flex items-center gap-1.5 bg-zinc-800/80 border rounded-lg px-3 py-1 text-xs whitespace-nowrap ${accentClass}`}>
      <span>{icon}</span>
      {label && <span className="text-zinc-500">{label}:</span>}
      <span className="font-mono">{value}</span>
    </span>
  )
}

/**
 * Header — top navbar with chip-based info layout.
 *
 * Props:
 *   metrics      object | null
 *   isConnected  boolean
 *   clock        Date — live clock from useMetrics
 */
export default function Header({ metrics, isConnected, clock }) {
  const hostname    = metrics?.system?.hostname    ?? '—'
  const ipLocal     = metrics?.system?.ip_local     ?? '—'
  const ipTailscale = metrics?.system?.ip_tailscale ?? '—'
  const uptime      = metrics?.system?.uptime       ?? '—'

  return (
    <header className="w-full shrink-0 bg-zinc-900 border-b border-zinc-800 z-20">
      <div className="flex items-center justify-between px-6 py-3 gap-3 overflow-x-auto scrollbar-none">
        {/* Left group */}
        <div className="flex items-center gap-2 flex-nowrap">
          <Chip icon="🖥️" label="Host" value={hostname} />
          <Chip icon="🌐" label="LAN" value={ipLocal} accent="cyan" />
          <Chip icon="🔒" label="Tailscale" value={ipTailscale} accent="emerald" />
        </div>

        {/* Right group */}
        <div className="flex items-center gap-2 flex-nowrap">
          <span className={`inline-flex items-center gap-1.5 border rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap
            ${isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-500'
            }`}>
            <span className={`h-2 w-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
          <Chip icon="⏱️" label="Uptime" value={uptime} />
          <Chip icon="🕒" value={formatClock(clock)} />
        </div>
      </div>
    </header>
  )
}
