import { useState, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, History, Scale, Trash2 } from 'lucide-react'
import { format, startOfWeek, startOfMonth } from 'date-fns'
import type { WeightEntry } from '../types'
import useDatabase from '../hooks/useDatabase'

const WeightTracker = ({ user }: { user: string }) => {
  const { data, setData, loading } = useDatabase(user, {
    weightHistory: [],
    dayPlans: {},
    activePlanId: 'Typical',
    documents: []
  })

  const [currentWeight, setCurrentWeight] = useState(70.0)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false)
  const rulerRef = useRef<HTMLDivElement>(null)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>Loading weight data...</div>

  // Handle Ruler Scroll
  const handleRulerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft
    const weight = 40 + (scrollLeft / 10)
    setCurrentWeight(Math.round(weight * 10) / 10)
  }

  const addWeight = () => {
    const newEntry: WeightEntry = {
      date: new Date().toISOString(),
      weight: currentWeight
    }
    setData({
      ...data,
      weightHistory: [...data.weightHistory, newEntry]
    })
  }

  const deleteWeight = (index: number) => {
    const reversedIndex = data.weightHistory.length - 1 - index
    const updatedHistory = data.weightHistory.filter((_, i) => i !== reversedIndex)
    setData({
      ...data,
      weightHistory: updatedHistory
    })
  }

  const getChartData = () => {
    if (data.weightHistory.length === 0) return []
    
    const now = new Date()
    let filtered = data.weightHistory
    
    if (viewMode === 'week') {
      const start = startOfWeek(now)
      filtered = data.weightHistory.filter(e => new Date(e.date) >= start)
    } else if (viewMode === 'month') {
      const start = startOfMonth(now)
      filtered = data.weightHistory.filter(e => new Date(e.date) >= start)
    }

    return filtered.map(e => ({
      date: format(new Date(e.date), viewMode === 'day' ? 'HH:mm' : 'MMM d'),
      weight: e.weight
    }))
  }

  return (
    <div className="weight-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Weight Selector */}
      <div className="card glass" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Current Weight</h3>
        <div style={{ fontSize: '4rem', fontWeight: 800, margin: '1rem 0', color: 'var(--primary)' }}>
          {currentWeight.toFixed(1)} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>kg</span>
        </div>
        
        {/* Ruler Picker */}
        <div 
          ref={rulerRef}
          onScroll={handleRulerScroll}
          style={{
            width: '100%',
            height: '80px',
            overflowX: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '10px',
            padding: '0 50%',
            scrollbarWidth: 'none',
            position: 'relative'
          }}
        >
          {/* Indicator */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '2px',
            background: 'var(--accent-pink)',
            zIndex: 10,
            transform: 'translateX(-50%)'
          }} />
          
          {Array.from({ length: 1610 }).map((_, i) => {
            const kg = 40 + (i / 10)
            const isMajor = i % 10 === 0
            const isHalf = i % 5 === 0
            
            return (
              <div key={i} style={{ 
                flexShrink: 0, 
                width: '1px', 
                height: isMajor ? '40px' : (isHalf ? '25px' : '15px'),
                background: isMajor ? 'var(--text-main)' : 'var(--text-muted)',
                opacity: isMajor ? 0.8 : 0.4,
                position: 'relative',
                marginRight: '9px' // Total 10px per unit
              }}>
                {isMajor && (
                  <span style={{ 
                    position: 'absolute', 
                    bottom: '-25px', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)'
                  }}>
                    {kg}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <button 
          className="btn-primary" 
          onClick={addWeight}
          style={{ marginTop: '3rem', width: '100%', justifyContent: 'center' }}
        >
          <Plus size={20} /> Log Weight
        </button>
      </div>

      {/* Weight Chart */}
      <div className="card glass" style={{ padding: '1.5rem', height: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Progress</h3>
          <div className="glass" style={{ display: 'flex', gap: '0.2rem', padding: '0.2rem', borderRadius: '1rem' }}>
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? 'var(--primary)' : 'transparent',
                  color: viewMode === mode ? 'var(--bg-deep)' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '0.8rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flex: 1,
                  minWidth: '60px',
                  textAlign: 'center',
                  transition: 'background 0.2s ease'
                }}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getChartData()}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="var(--text-muted)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                hide 
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--bg-card)', 
                  border: 'var(--border-glass)', 
                  borderRadius: '1rem',
                  fontSize: '0.8rem'
                }}
                itemStyle={{ color: 'var(--primary)' }}
              />
              <Area 
                type="monotone" 
                dataKey="weight" 
                stroke="var(--primary)" 
                fillOpacity={1} 
                fill="url(#colorWeight)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
        <button 
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-main)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%',
            cursor: 'pointer',
            padding: '0.5rem 0'
          }}
        >
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} /> History
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isHistoryCollapsed ? 'Show' : 'Hide'}
          </span>
        </button>

        {!isHistoryCollapsed && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.8rem',
            maxHeight: '300px',
            overflowY: 'auto',
            paddingRight: '0.5rem'
          }}>
            {data.weightHistory.slice().reverse().map((entry, i) => (
              <div key={i} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(100,255,218,0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '0.8rem' }}>
                    <Scale size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{entry.weight} kg</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{format(new Date(entry.date), 'PPPP p')}</div>
                  </div>
                </div>
                <button 
                  onClick={() => deleteWeight(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {data.weightHistory.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No history yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WeightTracker
