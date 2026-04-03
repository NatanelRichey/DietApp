import { useState, useEffect } from 'react'
import { LayoutDashboard, Scale, Utensils, Files, Clock, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import WeightTracker from './components/WeightTracker'
import MealPlanner from './components/MealPlanner'
import DocViewer from './components/DocViewer'
import Login from './components/Login'

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [user, setUser] = useState<string | null>(sessionStorage.getItem('diet-app-user'))

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handleLogin = (username: string) => {
    setUser(username)
    sessionStorage.setItem('diet-app-user', username)
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('diet-app-user')
  }

  if (!user) return <Login onLogin={handleLogin} />

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} />
      case 'weight':    return <WeightTracker user={user} />
      case 'planner':   return <MealPlanner user={user} />
      case 'docs':      return <DocViewer user={user} />
      default:          return null
    }
  }

  return (
    <div className="app-container">
      {/* Header — fixed height, no scroll */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.8rem 1rem 0.4rem',
        flexShrink: 0
      }}>
        <div onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }} className="text-gradient">DietApp</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Calendar size={12} />
            {format(currentTime, 'EEE, d MMM')} · {user}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '1.1rem' }}>
          <Clock size={15} color="var(--secondary)" />
          {format(currentTime, 'HH:mm')}
        </div>
      </header>

      {/* Scrollable main — fills remaining height */}
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

      {/* Bottom Nav — fixed, outside scroll area */}
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
              // No transform — prevents zoom flicker
              fontWeight: activeTab === tab ? 600 : 400,
              fontSize: '0.65rem',
              transition: 'color 0.2s ease'
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
