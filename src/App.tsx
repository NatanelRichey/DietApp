import { useState, useEffect } from 'react'
import { LayoutDashboard, Scale, Utensils, Files, Clock, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import WeightTracker from './components/WeightTracker'
import MealPlanner from './components/MealPlanner'
import DocViewer from './components/DocViewer'

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'weight':
        return <WeightTracker />
      case 'planner':
        return <MealPlanner />
      case 'docs':
        return <DocViewer />
      default:
        return null
    }
  }

  return (
    <div className="app-container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '1rem',
      paddingBottom: '5rem' // Space for bottom nav
    }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '0.5rem'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }} className="text-gradient">DietApp</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <Calendar size={14} />
            {format(currentTime, 'EEEE, d MMMM')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1.2rem' }}>
            <Clock size={16} color="var(--secondary)" />
            {format(currentTime, 'HH:mm:ss')}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="glass" style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        height: '4rem',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
        padding: '0 0.5rem'
      }}>
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard />} 
          label="Home" 
        />
        <NavButton 
          active={activeTab === 'weight'} 
          onClick={() => setActiveTab('weight')} 
          icon={<Scale />} 
          label="Weight" 
        />
        <NavButton 
          active={activeTab === 'planner'} 
          onClick={() => setActiveTab('planner')} 
          icon={<Utensils />} 
          label="Planner" 
        />
        <NavButton 
          active={activeTab === 'docs'} 
          onClick={() => setActiveTab('docs')} 
          icon={<Files />} 
          label="Docs" 
        />
      </nav>
    </div>
  )
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.2rem',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: active ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
      fontWeight: active ? '600' : '400',
      width: '20%'
    }}
  >
    {icon}
    <span style={{ fontSize: '0.7rem' }}>{label}</span>
  </button>
)

export default App
