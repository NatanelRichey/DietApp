import { useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Scale, TrendingDown, TrendingUp, CheckCircle2, Circle, Calendar } from 'lucide-react'
import { format, subDays, addDays, isSameDay, parseISO } from 'date-fns'
import type { DailyLog, Meal, UserData } from '../types'

const toDateKey = (d: Date) => format(d, 'yyyy-MM-dd')

interface DashboardProps {
  user: string
  data: UserData
  setData: (d: UserData) => void
  loading: boolean
}

const Dashboard = ({ data, setData, loading }: DashboardProps) => {
  const [viewDate, setViewDate] = useState(new Date())
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Swipe detection
  const touchStartX = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) < 40) return
    if (diff > 0) {
      setViewDate(d => { const next = addDays(d, 1); return next > new Date() ? d : next })
    } else {
      setViewDate(d => subDays(d, 1))
    }
  }

  const dateKey = toDateKey(viewDate)
  const isToday = isSameDay(viewDate, new Date())

  const getOrCreateLog = useCallback((date: Date): DailyLog => {
    const key = toDateKey(date)
    if (data.dailyLogs?.[key]) return data.dailyLogs[key]
    const dayOfWeek = date.getDay()
    const resolvedId = data.weekSchedule?.[dayOfWeek] || data.activePlanId
    // Fall back to first available plan if resolvedId points to a deleted/renamed plan
    const planId = data.dayPlans[resolvedId]
      ? resolvedId
      : Object.keys(data.dayPlans)[0] ?? resolvedId
    const plan = data.dayPlans[planId] || { meals: [], type: planId, guidelines: '' }
    return {
      date: key,
      planId,
      meals: plan.meals.map(m => ({ ...m, completed: false }))
    }
  }, [data])

  const currentLog = getOrCreateLog(viewDate)
  const currentMeals: Meal[] = currentLog.meals

  const totalCalories = currentMeals.reduce((s, m) => s + m.calories, 0)
  const consumedCalories = currentMeals.filter(m => m.completed).reduce((s, m) => s + m.calories, 0)
  const progress = totalCalories > 0 ? (consumedCalories / totalCalories) * 100 : 0

  const toggleMeal = (mealId: string) => {
    if (!isToday) return
    const updated = currentMeals.map(m => m.id === mealId ? { ...m, completed: !m.completed } : m)
    const key = toDateKey(viewDate)
    setData({
      ...data,
      dailyLogs: {
        ...(data.dailyLogs || {}),
        [key]: { ...currentLog, meals: updated }
      }
    })
  }

  const getWeightChange = (daysAgo: number) => {
    if (!data.weightHistory?.length) return null
    const latest = data.weightHistory[data.weightHistory.length - 1]?.weight
    const target = subDays(new Date(), daysAgo)
    const past = data.weightHistory.find(e => isSameDay(parseISO(e.date.substring(0, 10)), target))
    if (!past) return null
    return (latest - past.weight).toFixed(1)
  }

  const weekChange = getWeightChange(7)
  const monthChange = getWeightChange(30)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* Weight cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
        {[{ label: 'Vs Last Week', change: weekChange }, { label: 'Vs Last Month', change: monthChange }].map(({ label, change }) => (
          <div key={label} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Scale size={12} /> {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.3rem', fontWeight: 700 }}>
              {change ? (
                <>
                  {parseFloat(change) > 0
                    ? <TrendingUp size={18} color="var(--accent-pink)" />
                    : <TrendingDown size={18} color="var(--accent-green)" />}
                  {Math.abs(parseFloat(change))} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>kg</span>
                </>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No data</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Day navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <button
          onClick={() => setViewDate(d => subDays(d, 1))}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'var(--border-glass)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', flexShrink: 0 }}
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            {isToday ? 'Today' : format(viewDate, 'EEE, d MMM')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {isToday ? format(viewDate, 'MMMM d') : format(viewDate, 'yyyy')}
          </div>
        </div>

        <button
          onClick={() => setViewDate(d => { const next = addDays(d, 1); return next > new Date() ? d : next })}
          disabled={isToday}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'var(--border-glass)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isToday ? 'default' : 'pointer', color: isToday ? 'var(--text-muted)' : 'var(--text-main)', opacity: isToday ? 0.3 : 1, flexShrink: 0 }}
        >
          <ChevronRight size={18} />
        </button>

        <button
          onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.06)', border: 'var(--border-glass)', borderRadius: '0.8rem', padding: '0.4rem 0.7rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0 }}
        >
          <Calendar size={13} />
          <span>Date</span>
        </button>
        <input
          ref={dateInputRef}
          type="date"
          max={toDateKey(new Date())}
          value={dateKey}
          onChange={e => e.target.value && setViewDate(new Date(e.target.value + 'T12:00:00'))}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        />
      </div>

      {/* Calorie progress */}
      <div className="glass" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.7rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              {isToday ? 'Consumed today' : 'Consumed that day'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {consumedCalories} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>kcal</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily target</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{totalCalories}</div>
          </div>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '4px', transition: 'width 0.4s ease-out' }} />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            {isToday ? "Today's" : format(viewDate, 'EEE')} Timeline
          </span>
          {!isToday && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Read-only
            </span>
          )}
        </div>

        {currentMeals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No meals in this plan. Add meals in the Planner tab.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {currentMeals.map((meal) => (
              <div
                key={meal.id}
                style={{
                  display: 'flex',
                  gap: '0.8rem',
                  alignItems: 'center',
                  background: meal.completed ? 'rgba(100,255,218,0.06)' : 'var(--bg-card)',
                  padding: '0.9rem 1rem',
                  borderRadius: '1rem',
                  border: meal.completed ? '1px solid rgba(100,255,218,0.25)' : 'var(--border-glass)',
                  transition: 'background 0.25s ease, border 0.25s ease'
                }}
              >
                <button
                  onClick={() => toggleMeal(meal.id)}
                  disabled={!isToday}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: meal.completed ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: isToday ? 'pointer' : 'default',
                    flexShrink: 0, display: 'flex'
                  }}
                >
                  {meal.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meal.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)' }}>{meal.calories} kcal</div>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>{meal.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
