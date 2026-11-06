import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import { useMetrics } from './hooks/useMetrics.js'

import OverviewPage from './pages/OverviewPage.jsx'
import UsagePage    from './pages/UsagePage.jsx'
import DiskPage     from './pages/DiskPage.jsx'
import NetworkPage  from './pages/NetworkPage.jsx'
import ProcessPage  from './pages/ProcessPage.jsx'
import DockerPage   from './pages/DockerPage.jsx'

const PAGES = {
  overview: OverviewPage,
  usage:    UsagePage,
  disk:     DiskPage,
  network:  NetworkPage,
  process:  ProcessPage,
  docker:   DockerPage,
}

const pageVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -6, transition: { duration: 0.12 } },
}

export default function App() {
  const [activePage, setActivePage] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const { metrics, isConnected, error, clock } = useMetrics()

  const PageComponent = PAGES[activePage]
  const sidebarWidth = collapsed ? 64 : 220

  return (
    <div className="flex h-dvh bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isConnected={isConnected}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />

      <motion.div
        animate={{ marginLeft: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex flex-col flex-1 min-w-0 overflow-hidden"
      >
        <Header
          metrics={metrics}
          isConnected={isConnected}
          clock={clock}
        />

        <main className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-zinc-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <PageComponent metrics={metrics} isConnected={isConnected} />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  )
}
