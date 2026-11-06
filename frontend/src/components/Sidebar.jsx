import { motion } from 'framer-motion'
import { LayoutDashboard, Activity, HardDrive, Globe, Terminal, Layers, ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'usage',    label: 'Usage',    Icon: Activity },
  { id: 'disk',     label: 'Disk',     Icon: HardDrive },
  { id: 'network',  label: 'Network',  Icon: Globe },
  { id: 'process',  label: 'Process',  Icon: Terminal },
  { id: 'docker',   label: 'Docker',   Icon: Layers },
]

export default function Sidebar({ activePage, onNavigate, isConnected, collapsed, onToggle }) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-dvh z-30 flex flex-col
                 bg-zinc-900 border-r border-zinc-800 overflow-hidden"
      aria-label="Main navigation"
    >
      {/* Brand row */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 shrink-0">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wide text-zinc-100 whitespace-nowrap">
            HomeLab
          </span>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="ml-auto rounded-lg p-1.5 text-zinc-500 hover:text-zinc-100
                     hover:bg-white/[0.06] transition-colors"
        >
          {collapsed
            ? <ChevronRight size={15} aria-hidden="true" />
            : <ChevronLeft  size={15} aria-hidden="true" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin" aria-label="Page navigation">
        <ul role="list" className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activePage === id
            return (
              <li key={id} className="relative">
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 rounded-lg bg-sky-500/10 border border-sky-500/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <button
                  onClick={() => onNavigate(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-sky-300'
                      : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.04]',
                  )}
                >
                  <Icon
                    size={17}
                    aria-hidden="true"
                    className={clsx('shrink-0 transition-colors', isActive ? 'text-sky-400' : '')}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Live status badge */}
      <div className="px-3 py-4 border-t border-zinc-800 shrink-0">
        <div
          className="flex items-center gap-2.5"
          aria-label={isConnected ? 'Server connected' : 'Server disconnected'}
        >
          <span
            className={clsx(
              'relative h-2 w-2 rounded-full shrink-0',
              isConnected ? 'bg-emerald-400 text-emerald-400 ping-dot' : 'bg-zinc-600',
            )}
            aria-hidden="true"
          />
          {!collapsed && (
            <span className={clsx(
              'text-xs font-medium truncate',
              isConnected ? 'text-emerald-400' : 'text-zinc-600',
            )}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
