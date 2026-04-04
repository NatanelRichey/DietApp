import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import SimDailyLogger from './SimDailyLogger'
import SimPlanner from './SimPlanner'
import BugReporter from '../BugReporter'
import BugAdmin from '../BugAdmin'
import type { UserData, SimCartData } from '../../types'

interface Props {
  user: string
  data: UserData
  setData: (d: UserData) => void
  loading: boolean
  onLogout: () => void
}

const DOUBLE_TAP_MS = 300

const SimCartApp = ({ user, data, setData, loading, onLogout }: Props) => {
  const [activeTab, setActiveTab] = useState<'today' | 'planner'>('today')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isBugReporterOpen, setIsBugReporterOpen] = useState(false)
  const [page, setPage] = useState<'app' | 'bugadmin'>('app')
  const lastLogoTapRef = useRef(0)
  const lastClockTapRef = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

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
      setPage('bugadmin')
      lastClockTapRef.current = 0
    } else {
      lastClockTapRef.current = now
    }
  }

  if (page === 'bugadmin') {
    return <BugAdmin onClose={() => setPage('app')} />
  }

  const simCart: SimCartData = data.simCart ?? { foodItems: [], savedMeals: [], dailyLogs: {} }

  const updateSimCart = (updated: SimCartData) => {
    setData({ ...data, simCart: updated })
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        alignItems: 'center',
        padding: '0.7rem 1rem 0.4rem',
        gap: '0.8rem',
        flexShrink: 0
      }}>
        <div
          onClick={handleLogoTap}
          style={{ cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
        >
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }} className="text-gradient">SimCart</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            <Calendar size={11} />
            {format(currentTime, 'EEE, d MMM')}
          </div>
        </div>

        <div
          onClick={handleClockTap}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent', color: 'var(--text-main)' }}
        >
          <Clock size={14} color="var(--secondary)" />
          {format(currentTime, 'HH:mm')}
        </div>

        <button
          onClick={onLogout}
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

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 0.75rem', flexShrink: 0 }}>
        {(['today', 'planner'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              height: '2.4rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeTab === tab
                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                : 'rgba(255,255,255,0.07)',
              color: activeTab === tab ? 'var(--bg-deep)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            {tab === 'today' ? 'Today' : 'Planner'}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="page-scroll" style={{ paddingBottom: '1rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'today' ? (
              <SimDailyLogger simCart={simCart} onUpdate={updateSimCart} />
            ) : (
              <SimPlanner simCart={simCart} onUpdate={updateSimCart} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BugReporter
        isOpen={isBugReporterOpen}
        onClose={() => setIsBugReporterOpen(false)}
        user={user}
      />
    </div>
  )
}

export default SimCartApp
