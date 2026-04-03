import { useState, useRef, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, History, Scale, Trash2 } from 'lucide-react'
import { format, startOfWeek, startOfMonth } from 'date-fns'
import type { WeightEntry } from '../types'
import useDatabase from '../hooks/useDatabase'
import { DEFAULT_DATA } from '../hooks/useDatabase'

// Ruler range: 30–200 kg in 0.1 increments = 1700 ticks
const MIN_KG = 30
const MAX_KG = 200
const TICK_PX = 10          // pixels per tick (0.1 kg)
const DEFAULT_KG = 70

function kgToScroll(kg: number) {
  return Math.round((kg - MIN_KG) * 10) * TICK_PX
}
function scrollToKg(px: number) {
  return Math.round((MIN_KG + px / TICK_PX / 10) * 10) / 10
}

const WeightTracker = ({ user }: { user: string }) => {
  const { data, setData, loading } = useDatabase(user, DEFAULT_DATA)
  const [currentWeight, setCurrentWeight] = useState(DEFAULT_KG)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [historyOpen, setHistoryOpen] = useState(true)
  const rulerRef = useRef<HTMLDivElement>(null)
  const initialisedRef = useRef(false)

  // On first load, snap ruler to last logged weight (or default)
  useEffect(() => {
    if (!loading && !initialisedRef.current && rulerRef.current) {
      initialisedRef.current = true
      const lastWeight = data.weightHistory?.length
        ? data.weightHistory[data.weightHistory.length - 1].weight
        : DEFAULT_KG
      const clampedKg = Math.min(Math.max(lastWeight, MIN_KG), MAX_KG)
      setCurrentWeight(clampedKg)
      rulerRef.current.scrollLeft = kgToScroll(clampedKg)
    }
  }, [loading, data.weightHistory])

  const handleRulerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const kg = scrollToKg(e.currentTarget.scrollLeft)
    setCurrentWeight(Math.min(Math.max(kg, MIN_KG), MAX_KG))
  }

  const addWeight = () => {
    const entry: WeightEntry = { date: new Date().toISOString(), weight: currentWeight }
    setData({ ...data, weightHistory: [...(data.weightHistory || []), entry] })
  }

  const deleteWeight = (reversedIdx: number) => {
    const actualIdx = data.weightHistory.length - 1 - reversedIdx
    setData({ ...data, weightHistory: data.weightHistory.filter((_, i) => i !== actualIdx) })
  }

  const getChartData = () => {
    const history = data.weightHistory || []
    if (!history.length) return []
    const now = new Date()
    let filtered = history
    if (viewMode === 'week') filtered = history.filter(e => new Date(e.date) >= startOfWeek(now))
    if (viewMode === 'month') filtered = history.filter(e => new Date(e.date) >= startOfMonth(now))
    return filtered.map(e => ({ date: format(new Date(e.date), viewMode === 'day' ? 'HH:mm' : 'MMM d'), weight: e.weight }))
  }

  const totalTicks = (MAX_KG - MIN_KG) * 10 + 1  // 1701

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Weight selector card */}
      <div className="card glass" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Current Weight</div>
        <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
          {currentWeight.toFixed(1)}
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>kg</span>
        </div>

        {/* Ruler */}
        <div style={{ position: 'relative', marginTop: '1rem' }}>
          {/* Pointer arrow (fixed center) */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '8px solid var(--primary)',
            zIndex: 10
          }} />

          {/* Scrollable ruler */}
          <div
            ref={rulerRef}
            onScroll={handleRulerScroll}
            style={{
              width: '100%',
              height: '70px',
              overflowX: 'scroll',
              overflowY: 'hidden',
              display: 'flex',
              alignItems: 'flex-end',
              paddingTop: '10px',
              scrollbarWidth: 'none',
              position: 'relative'
            }}
          >
            {/* left spacer = half width so current weight is centred */}
            <div style={{ flexShrink: 0, width: '50%' }} />

            {Array.from({ length: totalTicks }).map((_, i) => {
              const kg = MIN_KG + i / 10
              const isMajor = i % 10 === 0
              const isHalf  = i % 5 === 0 && !isMajor
              return (
                <div key={i} style={{
                  flexShrink: 0,
                  width: '1px',
                  height: isMajor ? '36px' : isHalf ? '22px' : '12px',
                  background: isMajor ? 'var(--text-main)' : 'var(--text-muted)',
                  opacity: isMajor ? 0.8 : 0.35,
                  position: 'relative',
                  marginRight: `${TICK_PX - 1}px`
                }}>
                  {isMajor && (
                    <span style={{
                      position: 'absolute',
                      bottom: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.6rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap'
                    }}>
                      {kg % 10 === 0 ? `${kg}` : ''}
                    </span>
                  )}
                </div>
              )
            })}

            {/* right spacer */}
            <div style={{ flexShrink: 0, width: '50%' }} />
          </div>

          {/* Green center line */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '10px',
            bottom: '20px',
            width: '2px',
            background: 'var(--primary)',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 5,
            opacity: 0.6
          }} />
        </div>

        <button
          className="btn-primary"
          onClick={addWeight}
          style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}
        >
          <Plus size={18} /> Log {currentWeight.toFixed(1)} kg
        </button>
      </div>

      {/* Chart */}
      <div className="card glass" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Progress</h3>
          <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem', borderRadius: '1rem' }}>
            {(['day', 'week', 'month'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                background: viewMode === m ? 'var(--primary)' : 'transparent',
                color: viewMode === m ? 'var(--bg-deep)' : 'var(--text-muted)',
                border: 'none', padding: '0.3rem 0.7rem', borderRadius: '0.8rem',
                fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
              }}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getChartData()}>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: 'var(--border-glass)', borderRadius: '1rem', fontSize: '0.8rem' }} itemStyle={{ color: 'var(--primary)' }} />
              <Area type="monotone" dataKey="weight" stroke="var(--primary)" fill="url(#wg)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <button onClick={() => setHistoryOpen(o => !o)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', padding: 0 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <History size={18} /> History
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{historyOpen ? 'Hide' : 'Show'}</span>
        </button>

        {historyOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(data.weightHistory || []).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontSize: '0.85rem' }}>No logs yet.</div>
            ) : (
              [...(data.weightHistory || [])].reverse().map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-card)', padding: '0.8rem 1rem', borderRadius: '1rem', border: 'var(--border-glass)' }}>
                  <div style={{ background: 'rgba(100,255,218,0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '0.8rem', flexShrink: 0 }}>
                    <Scale size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{entry.weight} kg</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{format(new Date(entry.date), 'PPP · p')}</div>
                  </div>
                  <button onClick={() => deleteWeight(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer', padding: '0.3rem', flexShrink: 0 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WeightTracker
