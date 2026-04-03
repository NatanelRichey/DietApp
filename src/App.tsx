import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Scale, Utensils, Files, Clock, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import WeightTracker from './components/WeightTracker'
import MealPlanner from './components/MealPlanner'
import DocViewer from './components/DocViewer'
import Login from './components/Login'
import BugReporter from './components/BugReporter'
import BugAdmin from './components/BugAdmin'
import useDatabase, { DEFAULT_DATA } from './hooks/useDatabase'

const DOUBLE_TAP_MS = 300

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [user, setUser] = useState<string | null>(sessionStorage.getItem('diet-app-user'))

  // Single shared database instance — all tabs read/write the same state
  const { data, setData, loading } = useDatabase(user, DEFAULT_DATA)

  const [isBugReporterOpen, setIsBugReporterOpen] = useState(false)
  const [isBugAdminOpen, setIsBugAdminOpen] = useState(false)

  // Double-tap tracking for header gestures
  const lastLogoTapRef = useRef(0)
  const lastClockTapRef = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handleLogin = (username: string) => {
    setUser(username)
    sessionStorage.setItem('diet-app-user', username)
  }

  const handleLogoTap = () => {
    const now = Date.now()
    if (now - lastLogoTapRef.current < DOUBLE_TAP_MS) {
      setIsBugReporterOpen(true)
      lastLogoTapRef.current = 0
    } else {
      lastLogoTapRef.current = now
    }
  }

  const handleClockTap = () => {
    const now = Date.now()
    if (now - lastClockTapRef.current < DOUBLE_TAP_MS) {
      setIsBugAdminOpen(true)
      lastClockTapRef.current = 0
    } else {
      lastClockTapRef.current = now
    }
  }

  if (!user) return <Login onLogin={handleLogin} />

  const tabProps = { data, setData, loading }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} {...tabProps} />
      case 'weight':    return <WeightTracker user={user} {...tabProps} />
      case 'planner':   return <MealPlanner user={user} {...tabProps} />
      case 'docs':      return <DocViewer user={user} {...tabProps} />
      default:          return null
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.8rem 1rem 0.4rem',
        flexShrink: 0
      }}>
        {/* Double-tap → bug reporter */}
        <div onClick={handleLogoTap} style={{ cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }} className="text-gradient">DietApp</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Calendar size={12} />
            {format(currentTime, 'EEE, d MMM')} · {user}
          </div>
        </div>

        {/* Double-tap → bug admin */}
        <div
          onClick={handleClockTap}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
        >
          <Clock size={15} color="var(--secondary)" />
          {format(currentTime, 'HH:mm')}
        </div>
      </header>

      {/* Scrollable main */}
      <main className="page-scroll" style={{ paddingBottom: '5.5rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="glass" style={{
        position: 'fixed',
        bottom: '0.75rem',
        left: '0.75rem',
        right: '0.75rem',
        height: '3.8rem',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
        padding: '0 0.5rem',
        borderRadius: '1.5rem'
      }}>
        {[
          { tab: 'dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
          { tab: 'weight',    icon: <Scale size={22} />,           label: 'Weight' },
          { tab: 'planner',   icon: <Utensils size={22} />,        label: 'Planner' },
          { tab: 'docs',      icon: <Files size={22} />,           label: 'Docs' },
        ].map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.15rem',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              width: '25%',
              padding: '0.3rem 0',
              fontWeight: activeTab === tab ? 600 : 400,
              fontSize: '0.65rem',
              transition: 'color 0.2s ease',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      <BugReporter
        isOpen={isBugReporterOpen}
        onClose={() => setIsBugReporterOpen(false)}
        user={user || 'Guest'}
      />

      {isBugAdminOpen && (
        <BugAdmin onClose={() => setIsBugAdminOpen(false)} />
      )}
    </div>
  )
}

export default App
