import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Calendar, Info, Flame, ChevronDown, ChevronUp } from 'lucide-react'
import { format, subDays, addDays, isSameDay, differenceInDays, startOfDay, eachDayOfInterval } from 'date-fns'
import type { DailyLog, Meal, UserData } from '../types'

// ── Constants ───────────────────────────────────────────────────────────────
const DIET_START_DATE = new Date('2026-04-03')
const MILESTONE_DATE  = new Date('2026-05-21')
const TDEE            = 2500
const ISRAEL_TZ       = 'Asia/Jerusalem'
const HARDCODED_CONSUMED: Record<string, number> = {
  '2026-04-03': 600,
  '2026-04-04': 1500,
}

const toDateKey = (d: Date) => format(d, 'yyyy-MM-dd')

// Returns today's date string (YYYY-MM-DD) in Israel timezone
const getIsraelTodayKey = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ISRAEL_TZ }).format(new Date())

// Fraction of the 10am–10pm window elapsed today (Israel time): 0 before 10am, 1 at/after 10pm
const getElapsed = (): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TZ, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(new Date())
  const h = parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0')
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  const s = parseInt(parts.find(p => p.type === 'second')?.value ?? '0')
  const secs = h * 3600 + m * 60 + s
  return Math.max(0, Math.min(1, (secs - 36000) / 43200)) // (secs-10*3600)/12*3600
}

// ── Types ────────────────────────────────────────────────────────────────────
interface DashboardProps {
  user: string
  data: UserData
  setData: (d: UserData) => void
  loading: boolean
}

// ── Component ────────────────────────────────────────────────────────────────
const Dashboard = ({ data, setData, loading }: DashboardProps) => {
  const [viewDate, setViewDate] = useState(new Date())
  const [deficitExpanded, setDeficitExpanded] = useState(false)
  const [journeyExpanded, setJourneyExpanded] = useState(false)
  const [elapsed, setElapsed] = useState(getElapsed)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const seededRef   = useRef(false)

  // 1-second timer for animated deficit counter and side bar sync
  useEffect(() => {
    const id = setInterval(() => setElapsed(getElapsed()), 1000)
    return () => clearInterval(id)
  }, [])

  // Bug 4 — document-level swipe (works on all areas of the dashboard)
  useEffect(() => {
    let startX = 0
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const onEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const diff = startX - e.changedTouches[0].clientX
      if (Math.abs(diff) < 40) return
      setViewDate(d => diff > 0 ? addDays(d, 1) : subDays(d, 1))
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend',   onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend',   onEnd)
    }
  }, [])

  // Bug 3 — seed April 3 log with 600 kcal meal marked complete
  useEffect(() => {
    if (seededRef.current || loading) return
    if (data.dailyLogs?.['2026-04-03']) { seededRef.current = true; return }
    seededRef.current = true
    const fridayPlanId = data.weekSchedule?.[5] || data.activePlanId
    setData({
      ...data,
      dailyLogs: {
        ...(data.dailyLogs || {}),
        '2026-04-03': {
          date: '2026-04-03',
          planId: fridayPlanId,
          meals: [{ id: 'seed-apr3', name: 'Shabbat Dinner', time: '19:00', calories: 600, completed: true }],
        } as DailyLog,
      },
    })
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const dateKey = toDateKey(viewDate)
  const isToday = isSameDay(viewDate, new Date())

  const getOrCreateLog = useCallback((date: Date): DailyLog => {
    const key = toDateKey(date)
    const existing = data.dailyLogs?.[key]
    if (existing) {
      const plan = data.dayPlans[existing.planId]
      if (existing.meals.length === 0 && (plan?.meals.length ?? 0) > 0)
        return { ...existing, meals: plan.meals.map(m => ({ ...m, completed: false })) }
      return existing
    }
    const dayOfWeek = date.getDay()
    const resolvedId = data.weekSchedule?.[dayOfWeek] || data.activePlanId
    const planId = data.dayPlans[resolvedId] ? resolvedId : (Object.keys(data.dayPlans)[0] ?? resolvedId)
    const plan = data.dayPlans[planId] || { meals: [], type: planId, guidelines: '' }
    return { date: key, planId, meals: plan.meals.map(m => ({ ...m, completed: false })) }
  }, [data])

  const currentLog   = getOrCreateLog(viewDate)
  const currentMeals: Meal[] = currentLog.meals

  const totalCalories    = currentMeals.reduce((s, m) => s + m.calories, 0)
  const consumedCalories = currentMeals.filter(m => m.completed).reduce((s, m) => s + m.calories, 0)
  const progress         = totalCalories > 0 ? (consumedCalories / totalCalories) * 100 : 0
  const allDone          = currentMeals.length > 0 && currentMeals.every(m => m.completed)

  // Bug 3 — allow toggling any day (not just today)
  const toggleMeal = (mealId: string) => {
    const updated = currentMeals.map(m => m.id === mealId ? { ...m, completed: !m.completed } : m)
    setData({
      ...data,
      dailyLogs: { ...(data.dailyLogs || {}), [dateKey]: { ...currentLog, meals: updated } },
    })
  }

  // ── Diet Journey stats (Bug 1 — use startOfDay for correct calendar-day diff) ─
  const todayStart = startOfDay(new Date())
  const daysOnDiet    = Math.max(1, differenceInDays(todayStart, startOfDay(DIET_START_DATE)) + 1)
  const totalDietDays = differenceInDays(startOfDay(MILESTONE_DATE), startOfDay(DIET_START_DATE)) + 1
  const daysToGo      = Math.max(0, differenceInDays(startOfDay(MILESTONE_DATE), todayStart))
  const journeyPct    = Math.min(100, (daysOnDiet / totalDietDays) * 100)

  const shabbatsLeft = useMemo(() => {
    let count = 0, d = addDays(startOfDay(new Date()), 1)
    const end = startOfDay(MILESTONE_DATE)
    while (d <= end) { if (d.getDay() === 6) count++; d = addDays(d, 1) }
    return count
  }, [daysOnDiet]) // recompute when the day ticks over

  const fastsLeft = useMemo(() => {
    let count = 0, d = addDays(startOfDay(new Date()), 1)
    const end = startOfDay(MILESTONE_DATE)
    while (d <= end) {
      const planId = data.weekSchedule?.[d.getDay()] || data.activePlanId
      const planType = data.dayPlans?.[planId]?.type ?? planId ?? ''
      if (/fast/i.test(planType)) count++
      d = addDays(d, 1)
    }
    return count
  }, [daysOnDiet, data.weekSchedule, data.activePlanId, data.dayPlans])

  // Fast-day detection for the currently viewed day
  const isFastViewDay = /fast/i.test(data.dayPlans?.[currentLog.planId]?.type ?? currentLog.planId ?? '')
  // On fast days progress bar is always full (0 eaten out of 0 target = goal met)
  const displayProgress = isFastViewDay ? 100 : progress

  // ── Upcoming days for Diet Journey table ─────────────────────────────────────
  const upcomingDays = useMemo(() => {
    const rows: { date: Date; label: string; labelColor: string; calories: number }[] = []
    let d = addDays(startOfDay(new Date()), 0) // start from today
    const end = startOfDay(MILESTONE_DATE)
    while (d <= end) {
      const dow    = d.getDay()
      const planId = data.weekSchedule?.[dow] || data.activePlanId
      const plan   = data.dayPlans?.[planId]
      const type   = plan?.type ?? planId ?? ''
      const calories = plan?.meals.reduce((s, m) => s + m.calories, 0) ?? 0
      const isFast     = /fast/i.test(type)
      const isShabbat  = dow === 6
      const isErevShab = dow === 5 && !isFast
      let label = 'Regular', labelColor = 'var(--text-muted)'
      if (isFast)       { label = 'Fast';         labelColor = '#FB7185' }
      else if (isErevShab) { label = 'Erev Shabbat'; labelColor = '#A855F7' }
      else if (isShabbat)  { label = 'Shabbat';      labelColor = '#00BFFF' }
      rows.push({ date: d, label, labelColor, calories })
      d = addDays(d, 1)
    }
    return rows
  }, [daysOnDiet, data.weekSchedule, data.activePlanId, data.dayPlans])

  // ── Calorie deficit (Task 5 — today's portion animates 10am→10pm, Israel time) ─
  const israelTodayKey = getIsraelTodayKey()
  const todayConsumed = isToday
    ? consumedCalories
    : (data.dailyLogs?.[israelTodayKey]?.meals ?? []).filter(m => m.completed).reduce((s, m) => s + m.calories, 0)
  const todayMaxDeficit = Math.max(0, TDEE - todayConsumed)

  // Per-day breakdown rows (used by both the animated counter and the table)
  const deficitRows = useMemo(() => {
    const start = startOfDay(DIET_START_DATE)
    const end   = startOfDay(new Date())
    return eachDayOfInterval({ start, end }).map(d => {
      const key      = toDateKey(d)
      const isItToday = key === israelTodayKey
      const consumed = HARDCODED_CONSUMED[key] !== undefined
        ? HARDCODED_CONSUMED[key]
        : isItToday
          ? todayConsumed
          : (data.dailyLogs?.[key]?.meals ?? []).filter(m => m.completed).reduce((s, m) => s + m.calories, 0)
      const maxDeficit = Math.max(0, TDEE - consumed)
      return { key, date: d, consumed, maxDeficit, isToday: isItToday }
    })
  }, [israelTodayKey, todayConsumed, data.dailyLogs])

  // priorDeficit = full deficit for all completed days before today
  const priorDeficit = useMemo(
    () => deficitRows.filter(r => !r.isToday).reduce((s, r) => s + r.maxDeficit, 0),
    [deficitRows]
  )

  // Animated total: prior days (static) + today's portion (grows 10am→10pm)
  const animatedTotal   = priorDeficit + elapsed * todayMaxDeficit
  const kgBurned        = animatedTotal / 7700

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', touchAction: 'pan-y' }}>

      {/* ── Diet Journey Card ── */}
      <div
        className="glass"
        style={{ padding: '1.1rem 1.2rem', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setJourneyExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <Calendar size={14} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Diet Journey
          </span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            {journeyExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>On diet</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              Day {daysOnDiet}
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.3rem' }}>of {totalDietDays}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>To go</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--secondary)' }}>
              {daysToGo} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>days</span>
            </div>
          </div>
        </div>
        <div style={{ height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.65rem' }}>
          <div style={{ height: '100%', width: `${journeyPct}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '4px', transition: 'width 0.4s ease-out' }} />
        </div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.88rem' }}>🕍</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{shabbatsLeft}</span> Shabbats
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.88rem' }}>⚡</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{fastsLeft}</span> Fasts
            </span>
          </div>
        </div>

        {/* Collapsible upcoming-days table */}
        {journeyExpanded && (
          <div
            style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.9rem' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '0.25rem', marginBottom: '0.4rem' }}>
              {['Date', 'Type', 'kcal'].map(h => (
                <div key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {/* Scrollable rows — fixed height */}
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {upcomingDays.map((row, i) => {
                const isViewingDay = isSameDay(row.date, new Date())
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '0.25rem',
                      padding: '0.32rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isViewingDay ? 'rgba(100,255,218,0.04)' : 'transparent',
                      borderRadius: isViewingDay ? '0.3rem' : 0,
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: isViewingDay ? 700 : 400, color: isViewingDay ? 'var(--primary)' : 'var(--text-main)' }}>
                      {format(row.date, 'EEE d MMM')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: row.labelColor, fontWeight: 600 }}>{row.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.calories > 0 ? row.calories.toLocaleString() : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Calorie Deficit Card (Task 5 — expandable breakdown) ── */}
      <div
        className="glass"
        style={{ padding: '1.1rem 1.2rem', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setDeficitExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
          <Flame size={14} color="#FB7185" />
          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#FB7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Calorie Deficit
          </span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            {deficitExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(animatedTotal).toLocaleString()}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.3rem' }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#FB7185', fontWeight: 600, marginTop: '0.25rem' }}>
              ≈ {kgBurned.toFixed(2)} kg burned
            </div>
          </div>
          <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.6 }}>
            <div>since Apr 3</div>
            <div>{daysOnDiet} day{daysOnDiet !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Expandable per-day table */}
        {deficitExpanded && (
          <div
            style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.9rem' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.25rem', marginBottom: '0.4rem' }}>
              {['Date', 'Eaten', 'Deficit', 'Total'].map(h => (
                <div key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            {(() => {
              let running = 0
              return deficitRows.map(row => {
                const dayDeficit = row.isToday ? elapsed * row.maxDeficit : row.maxDeficit
                running += dayDeficit
                const isHardcoded = HARDCODED_CONSUMED[row.key] !== undefined
                return (
                  <div
                    key={row.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      gap: '0.25rem',
                      padding: '0.35rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: row.isToday ? 'rgba(100,255,218,0.04)' : 'transparent',
                      borderRadius: row.isToday ? '0.4rem' : 0,
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: row.isToday ? 'var(--primary)' : 'var(--text-main)', fontWeight: row.isToday ? 700 : 400 }}>
                      {format(row.date, 'EEE d')}
                      {isHardcoded && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.2rem' }}>*</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.consumed.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#FB7185', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(dayDeficit).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums', fontWeight: row.isToday ? 700 : 400 }}>
                      {Math.round(running).toLocaleString()}
                    </div>
                  </div>
                )
              })
            })()}
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              * pre-app data · today's deficit accrues 10am–10pm Israel time
            </div>
          </div>
        )}
      </div>

      {/* ── Day navigator ── */}
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
          onClick={() => setViewDate(d => addDays(d, 1))}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'var(--border-glass)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', flexShrink: 0 }}
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
          value={dateKey}
          onChange={e => e.target.value && setViewDate(new Date(e.target.value + 'T12:00:00'))}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        />
      </div>

      {/* ── Calorie progress ── */}
      <div className="glass" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.7rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              {isFastViewDay ? 'Fasting day' : isToday ? 'Consumed today' : 'Consumed that day'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isFastViewDay ? '#FB7185' : 'inherit' }}>
              {isFastViewDay ? '0' : consumedCalories}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.3rem' }}>kcal</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isFastViewDay ? 'Full deficit' : 'Daily target'}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: isFastViewDay ? '#FB7185' : 'var(--primary)' }}>
              {isFastViewDay ? `${TDEE} kcal` : totalCalories}
            </div>
          </div>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(displayProgress, 100)}%`,
            background: isFastViewDay
              ? 'linear-gradient(90deg, #FB7185, #F59E0B)'
              : 'linear-gradient(90deg, var(--primary), var(--secondary))',
            borderRadius: '4px',
            transition: 'width 0.4s ease-out',
          }} />
        </div>
      </div>

      {/* ── Plan guidelines banner ── */}
      {(() => {
        const guidelines = data.dayPlans[currentLog.planId]?.guidelines
        if (!guidelines?.trim()) return null
        return (
          <div style={{ background: 'rgba(100,255,218,0.06)', border: '1px solid rgba(100,255,218,0.2)', borderRadius: '1rem', padding: '0.9rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Info size={14} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guidelines</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{guidelines}</p>
          </div>
        )
      })()}

      {/* ── Timeline ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            {isToday ? "Today's" : format(viewDate, 'EEE d MMM')} Timeline
          </span>
        </div>

        {currentMeals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {/fast/i.test(currentLog.planId)
              ? `It's a ${currentLog.planId} day — remember to drink plenty of water!`
              : 'No meals scheduled for this plan.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {currentMeals.map((meal) => (
              <div
                key={meal.id}
                style={{
                  display: 'flex', gap: '0.8rem', alignItems: 'center',
                  background: meal.completed ? 'rgba(100,255,218,0.06)' : 'var(--bg-card)',
                  padding: '0.9rem 1rem', borderRadius: '1rem',
                  border: meal.completed ? '1px solid rgba(100,255,218,0.25)' : 'var(--border-glass)',
                  transition: 'background 0.25s ease, border 0.25s ease',
                }}
              >
                <button
                  onClick={() => toggleMeal(meal.id)}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: meal.completed ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer', flexShrink: 0, display: 'flex',
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

      {/* ── All meals complete ── */}
      {allDone && (
        <div style={{ textAlign: 'center', padding: '1.2rem', background: 'rgba(100,255,218,0.08)', border: '1px solid rgba(100,255,218,0.25)', borderRadius: '1rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>🎉</div>
          <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>All meals done!</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {isToday ? 'Great job today. Keep it up!' : 'Well done that day.'}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
