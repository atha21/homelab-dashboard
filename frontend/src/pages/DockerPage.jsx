import { clsx } from 'clsx'

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  running:    { label: 'RUNNING',    dot: 'bg-emerald-400 ping-dot', pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  exited:     { label: 'STOPPED',    dot: 'bg-zinc-600',             pill: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40' },
  created:    { label: 'CREATED',    dot: 'bg-zinc-600',             pill: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40' },
  restarting: { label: 'RESTARTING', dot: 'bg-amber-400 animate-pulse', pill: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  paused:     { label: 'PAUSED',     dot: 'bg-zinc-500',             pill: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40' },
}

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status.toUpperCase(), dot: 'bg-zinc-600', pill: 'bg-zinc-800 text-zinc-400 border-zinc-700/40' }
  return (
    <span className={clsx('inline-flex items-center gap-2 border rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider', cfg.pill)}>
      <span className={clsx('h-2 w-2 rounded-full shrink-0', cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

function PortChip({ host, container }) {
  return (
    <span className="font-mono text-xs bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 px-2 py-0.5 rounded">
      {host}&nbsp;→&nbsp;{container}
    </span>
  )
}

function PortMappings({ ports }) {
  const entries = Object.entries(ports ?? {})
    .flatMap(([container, bindings]) =>
      (bindings ?? []).map(b => ({ host: b.HostPort || '?', container }))
    )
    .filter(e => e.host !== '?')

  if (entries.length === 0) return <span className="text-zinc-700 text-xs">none</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(e => <PortChip key={`${e.host}-${e.container}`} {...e} />)}
    </div>
  )
}

function relativeTime(isoStr) {
  if (!isoStr) return null
  const diff = Date.now() - new Date(isoStr).getTime()
  const min  = Math.floor(diff / 60_000)
  const hr   = Math.floor(diff / 3_600_000)
  const day  = Math.floor(diff / 86_400_000)
  if (day  > 0) return `${day}d ago`
  if (hr   > 0) return `${hr}h ago`
  if (min  > 0) return `${min}m ago`
  return 'just now'
}

// ── Container list card ────────────────────────────────────────────────────────

function ContainerRow({ c }) {
  const isRunning = c.status === 'running'
  const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.exited

  return (
    <div className={clsx(
      'metric-card w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all',
      isRunning && 'border-emerald-500/20',
    )}>
      {/* Status dot */}
      <span
        className={clsx('h-3 w-3 rounded-full shrink-0', cfg.dot)}
        aria-hidden="true"
      />

      {/* Name + Image */}
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-zinc-100 truncate">{c.name}</p>
        <p className="font-mono text-xs text-zinc-600 truncate mt-0.5">{c.image}</p>
      </div>

      {/* Ports + Created — centre section */}
      <div className="hidden md:flex flex-col gap-1.5 min-w-0 flex-1">
        <PortMappings ports={c.ports} />
        {c.created && (
          <span className="text-xs text-zinc-600">
            Created {relativeTime(c.created)}
          </span>
        )}
      </div>

      {/* Container ID */}
      <span className="hidden lg:block font-mono text-xs text-zinc-700 shrink-0">
        {c.id}
      </span>

      {/* Status pill — right */}
      <StatusPill status={c.status} />
    </div>
  )
}

// ── Summary stats ──────────────────────────────────────────────────────────────

function StatTile({ label, count, color }) {
  return (
    <div className="metric-card p-4 text-center rounded-xl flex-1">
      <p className={clsx('text-2xl font-bold font-mono tabular-nums', color ?? 'text-zinc-100')}>{count}</p>
      <p className="text-xs text-zinc-600 mt-1">{label}</p>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DockerPage({ metrics }) {
  const containers = metrics?.docker

  if (containers === undefined) {
    return (
      <p className="text-zinc-600 text-sm animate-pulse" role="status">Waiting for data...</p>
    )
  }

  if (containers === null) {
    return (
      <div className="metric-card p-6 rounded-xl w-full max-w-lg space-y-2">
        <p className="text-zinc-300 text-sm font-medium">Docker socket not accessible</p>
        <p className="text-zinc-600 text-xs">
          Mount <code className="font-mono text-zinc-500">/var/run/docker.sock</code> read-only to enable Docker monitoring.
        </p>
      </div>
    )
  }

  const running    = containers.filter(c => c.status === 'running').length
  const stopped    = containers.filter(c => c.status === 'exited').length
  const restarting = containers.filter(c => c.status === 'restarting').length

  // Sort: running first
  const sorted = [...containers].sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1
    if (b.status === 'running' && a.status !== 'running') return 1
    return 0
  })

  return (
    <div className="w-full space-y-6">
      {/* Summary row */}
      <section aria-label="Container summary">
        <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-3">Summary</h2>
        <div className="flex gap-3 w-full">
          <StatTile label="Total"      count={containers.length} />
          <StatTile label="Running"    count={running}    color="text-emerald-400" />
          <StatTile label="Stopped"    count={stopped}    color="text-zinc-500" />
          <StatTile label="Restarting" count={restarting} color="text-amber-400" />
        </div>
      </section>

      {/* Container vertical list */}
      <section aria-label="Container list">
        <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-3">
          Containers
          <span className="text-zinc-600 normal-case font-normal ml-1">({containers.length})</span>
        </h2>

        {containers.length === 0 ? (
          <div className="metric-card p-8 rounded-xl text-center w-full">
            <p className="text-zinc-400 text-sm">No containers found.</p>
            <p className="text-zinc-600 text-xs mt-1">Run a container to see it here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {sorted.map(c => <ContainerRow key={c.id} c={c} />)}
          </div>
        )}
      </section>
    </div>
  )
}
