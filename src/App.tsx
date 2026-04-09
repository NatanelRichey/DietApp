import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Scale, Utensils, Files, Clock, Calendar, Dumbbell } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import Dashboard from './components/Dashboard'
import WeightTracker from './components/WeightTracker'
import MealPlanner from './components/MealPlanner'
import DocViewer from './components/DocViewer'
import Login from './components/Login'
import BugReporter from './components/BugReporter'
import BugAdmin from './components/BugAdmin'
import SimCartApp from './components/simcart/SimCartApp'
import DeficitSideBars from './components/DeficitSideBars'
import WorkoutSchedule from './components/WorkoutSchedule'
import useDatabase, { DEFAULT_DATA } from './hooks/useDatabase'

const DOUBLE_TAP_MS = 500

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [user, setUser] = useState<string | null>(sessionStorage.getItem('diet-app-user'))
  const [page, setPage] = useState<'app' | 'bugadmin'>('app')

  // Single shared database instance — all tabs read/write the same state
  const { data, setData, loading, syncStatus } = useDatabase(user, DEFAULT_DATA)

  const [isBugReporterOpen, setIsBugReporterOpen] = useState(false)
  // undefined = pre-capture in-flight, null = capture failed, string = ready
  const [pendingScreenshot, setPendingScreenshot] = useState<string | null | undefined>(undefined)

  // Double-tap tracking for header gestures
  const lastLogoTapRef = useRef(0)
  const lastClockTapRef = useRef(0)
  const preCaptureRef = useRef<Promise<string | null> | null>(null)

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
      // Second tap: open modal immediately, deliver screenshot when ready
      lastLogoTapRef.current = 0
      setPendingScreenshot(undefined) // undefined = still capturing (shows spinner in BugReporter)
      setIsBugReporterOpen(true)
      preCaptureRef.current
        ?.then(dataUrl => setPendingScreenshot(dataUrl ?? null)) // null = failed
        .catch(() => setPendingScreenshot(null))
      preCaptureRef.current = null
    } else {
      // First tap: kick off capture now so it's ready (or nearly ready) by second tap
      lastLogoTapRef.current = now
      preCaptureRef.current = toPng(document.body, { quality: 0.6, pixelRatio: 0.75, skipFonts: true }).catch(() => null)
    }
  }

  const handleClockTap = () => {
    const now = Date.now()
    if (now - lastClockTapRef.current < DOUBLE_TAP_MS) {
      setPage('bugadmin')
      lastClockTapRef.current = 0
    } else {
      lastClockTapRef.current = now
    }
  }

  if (!user) return <Login onLogin={handleLogin} />

  // Simha gets the SimCart experience — completely separate shell, no dock
  if (user.toLowerCase() === 'simha') {
    return (
      <SimCartApp
        user={user}
        data={data}
        setData={setData}
        onLogout={() => { setUser(null); sessionStorage.removeItem('diet-app-user') }}
      />
    )
  }

  // Bug admin is a full standalone page — no header, no nav
  if (page === 'bugadmin') {
    return <BugAdmin onClose={() => setPage('app')} />
  }

  const tabProps = { data, setData, loading }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} {...tabProps} />
      case 'weight':    return <WeightTracker user={user} {...tabProps} />
      case 'planner':   return <MealPlanner user={user} {...tabProps} />
      case 'docs':      return <DocViewer user={user} {...tabProps} />
      case 'schedule':  return <WorkoutSchedule user={user} {...tabProps} />
      default:          return null
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        alignItems: 'center',
        padding: '0.7rem 1rem 0.4rem',
        gap: '0.8rem',
        flexShrink: 0
      }}>
        {/* Left: DietApp + date — double-tap opens bug reporter */}
        <div
          onClick={handleLogoTap}
          style={{ cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
        >
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }} className="text-gradient">DietApp</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            <Calendar size={11} />
            {format(currentTime, 'EEE, d MMM')}
          </div>
        </div>

        {/* Cloud sync status dot — always rendered to keep grid stable (4 columns) */}
        <div
          title={syncStatus === 'saving' ? 'Saving…' : syncStatus === 'saved' ? 'Saved to cloud' : syncStatus === 'error' ? 'Cloud save failed — data is safe locally' : ''}
          style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: syncStatus === 'error' ? 'var(--accent-pink)' : syncStatus === 'saving' ? 'var(--secondary)' : 'var(--primary)',
            opacity: syncStatus === 'idle' ? 0 : syncStatus === 'saving' ? 0.7 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Clock — double-tap opens bug admin page */}
        <div
          onClick={handleClockTap}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent', color: 'var(--text-main)' }}
        >
          <Clock size={14} color="var(--secondary)" />
          {format(currentTime, 'HH:mm')}
        </div>

        {/* User avatar circle — tap to log out */}
        <button
          onClick={() => {
            setUser(null)
            sessionStorage.removeItem('diet-app-user')
          }}
          title="Log out"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--bg-deep)',
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {user[0].toUpperCase()}
        </button>
      </header>

      {/* Scrollable main */}
      <main className="page-scroll" style={{ paddingBottom: '5.5rem', paddingLeft: '1.8rem', paddingRight: '1.8rem' }}>
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
          { tab: 'schedule',  icon: <Dumbbell size={22} />,        label: 'Schedule' },
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
              width: '20%',
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

      <DeficitSideBars user={user} data={data} />

      <BugReporter
        isOpen={isBugReporterOpen}
        onClose={() => { setIsBugReporterOpen(false); setPendingScreenshot(undefined) }}
        user={user || 'Guest'}
        initialScreenshot={pendingScreenshot}
      />
    </div>
  )
}

export default App
