import { useState } from 'react'
import { clsx } from 'clsx'

const PAGE_SIZE = 30

const STATUS_COLOR = {
  running:  'bg-emerald-500/10 text-emerald-400',
  sleeping: 'bg-zinc-800/60 text-zinc-600',
  idle:     'bg-zinc-800/60 text-zinc-600',
  disk:     'bg-amber-500/10 text-amber-400',
  zombie:   'bg-rose-500/10 text-rose-400',
  stopped:  'bg-rose-500/10 text-rose-400',
}

// ── Mini inline bar ───────────────────────────────────────────────

// Static map so Tailwind JIT can see all class names at build time
const COLOR_BAR = {
  'text-amber-400':  { text: 'text-amber-400',  bar: 'bg-amber-400' },
  'text-orange-400': { text: 'text-orange-400', bar: 'bg-orange-400' },
  'text-zinc-400':   { text: 'text-zinc-400',   bar: 'bg-zinc-500' },
}

function InlineBar({ value, max = 100, colorClass }) {
  const pct    = Math.min((value / max) * 100, 100)
  const colors = COLOR_BAR[colorClass] ?? COLOR_BAR['text-zinc-400']
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('font-mono text-xs w-10 text-right', colors.text)}>
        {value.toFixed(1)}
      </span>
      <div className="h-1 w-14 bg-zinc-800 rounded-full overflow-hidden" aria-hidden="true">
        <div className={clsx('h-full rounded-full transition-all duration-300', colors.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function ProcessPage({ metrics }) {
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState('cpu')
  const [page,   setPage]     = useState(0)

  const processes = metrics?.processes

  const sortKey = sortBy === 'cpu' ? 'cpu_percent' : 'memory_percent'

  const filtered = (processes ?? [])
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortKey] - a[sortKey])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const visible    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset to page 0 when search/sort changes
  const handleSearch = v => { setSearch(v); setPage(0) }
  const handleSort   = v => { setSortBy(v);  setPage(0) }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          aria-label="Filter processes by name"
          placeholder="Filter by name..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="bg-zinc-900/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm
                     text-zinc-100 placeholder:text-zinc-600
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 w-52"
        />
        <fieldset className="flex gap-1" aria-label="Sort processes by">
          <legend className="sr-only">Sort by</legend>
          {[
            { key: 'cpu',    label: 'CPU %' },
            { key: 'memory', label: 'RAM %' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              aria-pressed={sortBy === key}
              className={clsx(
                'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors',
                sortBy === key
                  ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
              )}
            >
              {label}
            </button>
          ))}
        </fieldset>

        {processes && (
          <span className="text-xs text-zinc-600 ml-auto">
            {filtered.length} processes
          </span>
        )}
      </div>

      {/* Table */}
      {!processes ? (
        <p className="text-zinc-600 text-sm animate-pulse" role="status" aria-live="polite">
          Waiting for data...
        </p>
      ) : visible.length === 0 ? (
        <p className="text-zinc-600 text-sm">No processes match the filter.</p>
      ) : (
        <div className="metric-card overflow-x-auto scrollbar-thin rounded-xl">
          <table className="w-full text-sm text-left" aria-label="Process list">
            <thead>
              <tr className="border-b border-white/[0.06] text-zinc-600 text-xs uppercase tracking-wide">
                <th scope="col" className="px-4 py-3 font-medium w-16">PID</th>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium hidden sm:table-cell">User</th>
                <th scope="col" className="px-4 py-3 font-medium">CPU %</th>
                <th scope="col" className="px-4 py-3 font-medium">RAM %</th>
                <th scope="col" className="px-4 py-3 font-medium hidden md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(p => (
                <tr
                  key={p.pid}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-2 font-mono text-zinc-600 text-xs">{p.pid}</td>
                  <td className="px-4 py-2 text-zinc-200 max-w-[160px] truncate" title={p.name}>{p.name}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs hidden sm:table-cell">{p.username ?? '--'}</td>
                  <td className="px-4 py-2">
                    <InlineBar
                      value={p.cpu_percent}
                      colorClass={p.cpu_percent > 20 ? 'text-amber-400' : 'text-zinc-400'}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <InlineBar
                      value={p.memory_percent}
                      colorClass={p.memory_percent > 10 ? 'text-orange-400' : 'text-zinc-400'}
                    />
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded-full',
                      STATUS_COLOR[p.status] ?? 'bg-zinc-800 text-zinc-400',
                    )}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-600">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 0))}
              disabled={page === 0}
              aria-label="Previous page"
              className="px-3 py-1.5 text-xs rounded-lg text-zinc-500 hover:text-zinc-100
                         hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
              className="px-3 py-1.5 text-xs rounded-lg text-zinc-500 hover:text-zinc-100
                         hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
