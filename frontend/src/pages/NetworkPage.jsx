import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import {
  ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis,
} from 'recharts'

const HISTORY_LEN = 40

// ── Bandwidth sparkline ────────────────────────────────────────────────────────

function SpeedTooltip({ active, payload, unit, accentColor }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-zinc-100 shadow-lg">
      <span className="font-mono" style={{ color: accentColor }}>
        {payload[0].value?.toFixed(1)} {unit}
      </span>
    </div>
  )
}

function SparkLine({ history, dataKey, strokeColor, gradientId, unit }) {
  const kbs = history.length ? history[history.length - 1]?.[dataKey] ?? 0 : 0
  const isHigh = kbs >= 1024
  const scaledHistory = history.map(p => ({
    ...p,
    [dataKey]: isHigh ? p[dataKey] / 1024 : p[dataKey],
  }))
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={scaledHistory} margin={{ top: 2, right: 0, left: -32, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={strokeColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" hide />
        <YAxis hide />
        <Tooltip content={<SpeedTooltip unit={isHigh ? 'MB/s' : 'KB/s'} accentColor={strokeColor} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          strokeWidth={1.8}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function BandwidthCard({ net, history }) {
  const downKbs = net?.download_kbs ?? 0
  const upKbs   = net?.upload_kbs   ?? 0
  const fmt = v => v >= 1024 ? `${(v / 1024).toFixed(2)} MB/s` : `${v.toFixed(1)} KB/s`

  return (
    <div className="metric-card p-5 space-y-4 w-full">
      <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
        Live Bandwidth
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-sky-400 font-semibold tracking-widest uppercase mb-1">Download</p>
          <p className="text-2xl font-mono font-bold text-zinc-100 tabular-nums">{fmt(downKbs)}</p>
        </div>
        <div>
          <p className="text-xs text-emerald-400 font-semibold tracking-widest uppercase mb-1">Upload</p>
          <p className="text-2xl font-mono font-bold text-zinc-100 tabular-nums">{fmt(upKbs)}</p>
        </div>
      </div>

      {history.length > 1 && (
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">↓ Download</p>
            <SparkLine history={history} dataKey="down" strokeColor="#38bdf8" gradientId="net-down-grad" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">↑ Upload</p>
            <SparkLine history={history} dataKey="up" strokeColor="#34d399" gradientId="net-up-grad" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Speedtest card ─────────────────────────────────────────────────────────────

function SpeedtestCard() {
  const [result, setResult]   = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError]     = useState(null)

  // Load latest cached result on mount
  useEffect(() => {
    fetch('/api/speedtest/latest')
      .then(r => r.json())
      .then(data => { if (data.ok) setResult(data) })
      .catch(() => {})
  }, [])

  async function runSpeedtest() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/speedtest/run', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setResult(data)
      } else {
        setError(data.error ?? 'Speedtest failed')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }

  const Metric = ({ label, value, unit, color }) => (
    <div className="flex flex-col items-center justify-center bg-zinc-800/50 rounded-xl p-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-mono font-bold tabular-nums ${color}`}>{value ?? '—'}</p>
      {unit && <p className="text-xs text-zinc-600 mt-0.5">{unit}</p>}
    </div>
  )

  return (
    <div className="metric-card p-5 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Internet Speedtest
        </h2>
        {result?.timestamp && (
          <span className="text-[10px] text-zinc-600 font-mono">
            Last: {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Ping"     value={result?.ping_ms}       unit="ms"   color="text-amber-300" />
        <Metric label="Download" value={result?.download_mbps} unit="Mbps" color="text-sky-300" />
        <Metric label="Upload"   value={result?.upload_mbps}   unit="Mbps" color="text-emerald-300" />
      </div>

      {result?.server && (
        <p className="text-xs text-zinc-600 font-mono truncate">
          Server: {result.server}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={runSpeedtest}
        disabled={running}
        className={clsx(
          'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
          running
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95',
        )}
      >
        {running ? (
          <>
            <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-500 border-t-zinc-300 animate-spin" />
            Running...
          </>
        ) : (
          <>🚀 Run Speedtest</>
        )}
      </button>
    </div>
  )
}

// ── Protocol badge ─────────────────────────────────────────────────────────────

function ProtocolBadge({ protocol }) {
  return (
    <span className={clsx(
      'text-xs px-2 py-0.5 rounded-full font-medium',
      protocol === 'TCP' ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400',
    )}>
      {protocol}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function NetworkPage({ metrics }) {
  const [search, setSearch] = useState('')

  const historyRef = useRef([])
  const [history, setHistory] = useState([])

  useEffect(() => {
    const net = metrics?.network
    if (!net) return
    const point = { t: Date.now(), down: net.download_kbs ?? 0, up: net.upload_kbs ?? 0 }
    const next = [...historyRef.current.slice(-(HISTORY_LEN - 1)), point]
    historyRef.current = next
    setHistory(next)
  }, [metrics?.network])

  const net   = metrics?.network
  const ports = metrics?.ports

  const filteredPorts = (ports ?? []).filter(p =>
    String(p.port).includes(search) ||
    (p.process ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="w-full space-y-6">
      {/* Top row: Bandwidth + Speedtest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {net
          ? <BandwidthCard net={net} history={history} />
          : (
            <div className="metric-card p-5 w-full flex items-center justify-center">
              <p className="text-zinc-500 text-sm animate-pulse">Waiting for data...</p>
            </div>
          )
        }
        <SpeedtestCard />
      </div>

      {/* Listening ports table — full width */}
      <section aria-label="Listening ports" className="w-full">
        <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
          <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            Listening Ports
            {ports && (
              <span className="text-zinc-600 normal-case font-normal ml-1">({ports.length})</span>
            )}
          </h2>
          <input
            type="search"
            aria-label="Filter ports by number or process name"
            placeholder="Filter port or process..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm
                       text-zinc-100 placeholder:text-zinc-600
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 w-56"
          />
        </div>

        {!ports ? (
          <p className="text-zinc-500 text-sm animate-pulse" role="status">Waiting for data...</p>
        ) : filteredPorts.length === 0 ? (
          <p className="text-zinc-500 text-sm">
            {ports.length === 0 ? 'No listening ports detected.' : 'No ports match the filter.'}
          </p>
        ) : (
          <div className="metric-card overflow-x-auto rounded-xl w-full">
            <table className="w-full text-sm text-left" aria-label="Active listening ports">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-600 text-xs uppercase tracking-wide">
                  <th scope="col" className="px-4 py-3 font-medium">Port</th>
                  <th scope="col" className="px-4 py-3 font-medium">Protocol</th>
                  <th scope="col" className="px-4 py-3 font-medium hidden sm:table-cell">Bind IP</th>
                  <th scope="col" className="px-4 py-3 font-medium">Process</th>
                  <th scope="col" className="px-4 py-3 font-medium hidden md:table-cell">PID</th>
                </tr>
              </thead>
              <tbody>
                {filteredPorts.map((p, i) => (
                  <tr
                    key={`${p.port}-${p.protocol}-${p.bind_ip}`}
                    className={clsx(
                      'border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors',
                      i % 2 !== 0 && 'bg-white/[0.01]',
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono text-sky-300 font-semibold">{p.port}</td>
                    <td className="px-4 py-2.5"><ProtocolBadge protocol={p.protocol} /></td>
                    <td className="px-4 py-2.5 font-mono text-zinc-400 text-xs hidden sm:table-cell">{p.bind_ip}</td>
                    <td className="px-4 py-2.5 text-zinc-300">{p.process ?? <span className="text-zinc-600">--</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-500 text-xs hidden md:table-cell">{p.pid ?? '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
