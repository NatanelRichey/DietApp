import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Calendar, Info, Flame, ChevronDown, ChevronUp } from 'lucide-react'
import { format, subDays, addDays, isSameDay, differenceInDays, startOfDay, eachDayOfInterval } from 'date-fns'
import type { DailyLog, Meal, UserData } from '../types'

// ── Per-user config ──────────────────────────────────────────────────────────
const ISRAEL_TZ = 'Asia/Jerusalem'

interface UserConfig {
  tdee: number
  dietStart: Date
  milestone: Date | null
  hardcodedConsumed: Record<string, number>
  showFasts: boolean
}
const USER_CONFIGS: Record<string, UserConfig> = {
  natan: {
    tdee: 2500,
    dietStart: new Date('2026-04-03'),
    milestone: new Date('2026-05-21'),
    hardcodedConsumed: { '2026-04-03': 600, '2026-04-04': 1500 },
    showFasts: true,
  },
  sara: {
    tdee: 1750,
    dietStart: new Date('2026-04-09'),
    milestone: new Date('2026-06-09'),
    hardcodedConsumed: {},
    showFasts: false,
  },
}
const DEFAULT_CONFIG: UserConfig = { tdee: 2000, dietStart: new Date(), milestone: null, hardcodedConsumed: {}, showFasts: false }
const getUserConfig = (u: string): UserConfig => USER_CONFIGS[u.toLowerCase()] ?? DEFAULT_CONFIG

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
const Dashboard = ({ user, data, setData, loading }: DashboardProps) => {
  const { tdee: configTdee, dietStart: DIET_START_DATE, milestone: MILESTONE_DATE, hardcodedConsumed: HARDCODED_CONSUMED, showFasts } = getUserConfig(user)
  const TDEE = data.tdee ?? configTdee
  const [viewDate, setViewDate] = useState(new Date())
  const [deficitExpanded, setDeficitExpanded] = useState(false)
  const [journeyExpanded, setJourneyExpanded] = useState(false)
  const [elapsed, setElapsed] = useState(getElapsed)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const seededRef       = useRef(false)
  const saraSeedRef     = useRef(false)
  const natanWeightRef  = useRef(false)
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null)
  const [editingTdee, setEditingTdee] = useState(false)
  const [tdeeInput, setTdeeInput] = useState('')
  const [showPlanPicker, setShowPlanPicker] = useState(false)

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

  // Seed April 3 log for Natan only (pre-app Shabbat meal)
  useEffect(() => {
    if (user.toLowerCase() !== 'natan') { seededRef.current = true; return }
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

  // Seed Natan's 97.5 kg weigh-in for 2026-04-06 at 10:00 AM
  useEffect(() => {
    if (user.toLowerCase() !== 'natan') { natanWeightRef.current = true; return }
    if (natanWeightRef.current || loading) return
    if (data.weightHistory?.some(e => e.date.startsWith('2026-04-06'))) { natanWeightRef.current = true; return }
    natanWeightRef.current = true
    setData({
      ...data,
      weightHistory: [...(data.weightHistory || []), { date: '2026-04-06T07:00:00.000Z', weight: 97.5 }],
    })
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Seed Sara's meal plans on first load
  useEffect(() => {
    if (user.toLowerCase() !== 'sara') { saraSeedRef.current = true; return }
    if (saraSeedRef.current || loading) return
    if ((data.dayPlans?.['Plan 1']?.meals?.length ?? 0) >= 2) { saraSeedRef.current = true; return }
    saraSeedRef.current = true
    setData({
      ...data,
      activePlanId: 'Plan 1',
      dayPlans: {
        'Plan 1': {
          type: 'Plan 1',
          guidelines: '── Path 1 · High Protein / Lean Days ──\nBreakfast 1 + Lunch 1 + Protein Bar\nPre-dinner: ~902 kcal / ~82g protein\nWith dinner: ~1,402 kcal / ~97g protein',
          meals: [
            {
              id: 'sara-b1', name: 'Breakfast 1', time: '08:00', calories: 455, protein: 51.5, completed: false,
              items: [
                { id: 'sara-b1-eggs',    name: '2 Eggs',               calories: 140, protein: 12  },
                { id: 'sara-b1-oil',     name: '1/2 tsp Oil',           calories: 20,  protein: 0   },
                { id: 'sara-b1-cottage', name: '2 tbsp Cottage Cheese', calories: 25,  protein: 3   },
                { id: 'sara-b1-pita',    name: '1 Spelt Pita',          calories: 100, protein: 5   },
                { id: 'sara-b1-tuna',    name: 'Tuna (can in water)',   calories: 105, protein: 25  },
                { id: 'sara-b1-pmilk',   name: 'Protein Milk',          calories: 65,  protein: 6.5 },
              ],
            },
            {
              id: 'sara-l1', name: 'Lunch 1', time: '12:30', calories: 379, protein: 27, completed: false,
              items: [
                { id: 'sara-l1-protein', name: 'Protein Source',        calories: 130, protein: 25 },
                { id: 'sara-l1-corn',    name: 'Cornflakes',             calories: 117, protein: 2  },
                { id: 'sara-l1-blue',    name: 'Blueberries (30g)',      calories: 11,  protein: 0  },
                { id: 'sara-l1-honey',   name: 'Honey (1 tsp)',          calories: 21,  protein: 0  },
                { id: 'sara-l1-apple',   name: '1/2 Apple (optional)',   calories: 50,  protein: 0  },
                { id: 'sara-l1-banana',  name: '1/2 Banana (optional)',  calories: 50,  protein: 0  },
              ],
            },
          ],
        },
        'Plan 2': {
          type: 'Plan 2',
          guidelines: '── Path 2 · Dense Nutritive Days ──\nBreakfast 2 + Lunch 2\nPre-dinner: ~758 kcal / ~86g protein\nWith dinner: ~1,258 kcal / ~101g protein',
          meals: [
            {
              id: 'sara-b2', name: 'Breakfast 2', time: '08:00', calories: 230, protein: 33, completed: false,
              items: [
                { id: 'sara-b2-cottage', name: 'Cottage Cheese', calories: 25,  protein: 3  },
                { id: 'sara-b2-pita',    name: 'Pita',           calories: 100, protein: 5  },
                { id: 'sara-b2-tuna',    name: 'Tuna',           calories: 105, protein: 25 },
              ],
            },
            {
              id: 'sara-l2', name: 'Lunch 2', time: '12:30', calories: 508, protein: 53, completed: false,
              items: [
                { id: 'sara-l2-protein', name: '1/2 Protein Source', calories: 65,  protein: 12  },
                { id: 'sara-l2-powder',  name: 'Protein Powder',     calories: 143, protein: 26  },
                { id: 'sara-l2-blue',    name: 'Blueberries (30g)',  calories: 11,  protein: 0   },
                { id: 'sara-l2-corn',    name: 'Cornflakes (15g)',   calories: 58,  protein: 1   },
                { id: 'sara-l2-honey',   name: 'Honey (1 tsp)',      calories: 21,  protein: 0   },
                { id: 'sara-l2-flour',   name: 'Flour (2 tbsp)',     calories: 55,  protein: 1.5 },
                { id: 'sara-l2-egg',     name: '1 Egg',              calories: 70,  protein: 6   },
                { id: 'sara-l2-oil',     name: '1/2 tsp Oil',        calories: 20,  protein: 0   },
                { id: 'sara-l2-pmilk',   name: 'Protein Milk',       calories: 65,  protein: 6.5 },
              ],
            },
          ],
        },
        'General': {
          type: 'General',
          guidelines: `Dinner: ~500 kcal / 15g protein\nProtein Bar (snack): 215 kcal / 20g protein\nExtra #1: 100 kcal buffer\nExtra #2: 250 kcal buffer\n\n── Path 1 · High Protein / Lean Days ──\nBreakfast 1 + Lunch 1 + Protein Bar\nPre-dinner:  ~902 kcal / ~82g protein\nWith dinner: ~1,402 kcal / ~97g protein\n\n── Path 2 · Dense Nutritive Days ──\nBreakfast 2 + Lunch 2\nPre-dinner:  ~758 kcal / ~86g protein\nWith dinner: ~1,258 kcal / ~101g protein`,
          meals: [],
        },
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
  const totalProtein     = currentMeals.reduce((s, m) => s + (m.protein ?? 0), 0)
  const consumedProtein  = currentMeals.filter(m => m.completed).reduce((s, m) => s + (m.protein ?? 0), 0)
  const progress         = totalCalories > 0 ? (consumedCalories / totalCalories) * 100 : 0
  const allDone          = currentMeals.length > 0 && currentMeals.every(m => m.completed)

  const assignPlanToDate = (planId: string) => {
    const plan = data.dayPlans[planId]
    if (!plan) return
    const existingLog = data.dailyLogs?.[dateKey]
    const hasCompleted = existingLog?.meals.some(m => m.completed)
    setData({
      ...data,
      dailyLogs: {
        ...(data.dailyLogs || {}),
        [dateKey]: {
          date: dateKey,
          planId,
          meals: hasCompleted ? existingLog!.meals : plan.meals.map(m => ({ ...m, completed: false })),
        },
      },
    })
    setShowPlanPicker(false)
  }

  // Bug 3 — allow toggling any day (not just today)
  const toggleMeal = (mealId: string) => {
    const updated = currentMeals.map(m => m.id === mealId ? { ...m, completed: !m.completed } : m)
    setData({
      ...data,
      dailyLogs: { ...(data.dailyLogs || {}), [dateKey]: { ...currentLog, meals: updated } },
    })
  }

  // ── Diet Journey stats ────────────────────────────────────────────────────
  const todayStart     = startOfDay(new Date())
  const dietStartDay   = startOfDay(DIET_START_DATE)
  const dietStarted    = todayStart >= dietStartDay
  const daysUntilStart = dietStarted ? 0 : differenceInDays(dietStartDay, todayStart)
  const daysOnDiet     = dietStarted ? Math.max(1, differenceInDays(todayStart, dietStartDay) + 1) : 0
  const totalDietDays  = MILESTONE_DATE ? differenceInDays(startOfDay(MILESTONE_DATE), dietStartDay) + 1 : null
  const daysToGo       = MILESTONE_DATE ? Math.max(0, differenceInDays(startOfDay(MILESTONE_DATE), todayStart)) : null
  const journeyPct     = totalDietDays ? Math.min(100, (daysOnDiet / totalDietDays) * 100) : null

  const shabbatsLeft = useMemo(() => {
    if (!MILESTONE_DATE) return null
    let count = 0, d = addDays(startOfDay(new Date()), 1)
    const end = startOfDay(MILESTONE_DATE)
    while (d <= end) { if (d.getDay() === 6) count++; d = addDays(d, 1) }
    return count
  }, [daysOnDiet, MILESTONE_DATE]) // eslint-disable-line react-hooks/exhaustive-deps

  const fastsLeft = useMemo(() => {
    if (!MILESTONE_DATE || !showFasts) return null
    let count = 0, d = addDays(startOfDay(new Date()), 1)
    const end = startOfDay(MILESTONE_DATE)
    while (d <= end) {
      const planId = data.weekSchedule?.[d.getDay()] || data.activePlanId
      const planType = data.dayPlans?.[planId]?.type ?? planId ?? ''
      if (/fast/i.test(planType)) count++
      d = addDays(d, 1)
    }
    return count
  }, [daysOnDiet, MILESTONE_DATE, data.weekSchedule, data.activePlanId, data.dayPlans]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fast-day detection for the currently viewed day
  const isFastViewDay = /fast/i.test(data.dayPlans?.[currentLog.planId]?.type ?? currentLog.planId ?? '')
  // On fast days progress bar is always full (0 eaten out of 0 target = goal met)
  const displayProgress = isFastViewDay ? 100 : progress

  // ── Upcoming days for Diet Journey table ─────────────────────────────────────
  const upcomingDays = useMemo(() => {
    const rows: { date: Date; label: string; labelColor: string; calories: number }[] = []
    let d = addDays(startOfDay(new Date()), 0)
    const end = MILESTONE_DATE ? startOfDay(MILESTONE_DATE) : addDays(startOfDay(new Date()), 30)
    while (d <= end) {
      const dow    = d.getDay()
      const planId = data.weekSchedule?.[dow] || data.activePlanId
      const plan   = data.dayPlans?.[planId]
      const type   = plan?.type ?? ''
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
    if (start > end) return [] // diet hasn't started yet
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
            {dietStarted ? (
              <>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>On diet</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  Day {daysOnDiet}
                  {totalDietDays !== null && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.3rem' }}>of {totalDietDays}</span>}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Diet starts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {format(DIET_START_DATE, 'MMM d')}
                  <span style={{ fontSize: '0.78rem', color: 'var(--secondary)', fontWeight: 600, marginLeft: '0.5rem' }}>in {daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''}</span>
                </div>
              </>
            )}
          </div>
          {daysToGo !== null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>To go</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--secondary)' }}>
                {daysToGo} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>days</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.65rem' }}>
          <div style={{ height: '100%', width: `${journeyPct ?? 100}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '4px', transition: 'width 0.4s ease-out' }} />
        </div>
        {(shabbatsLeft !== null || fastsLeft !== null) && (
          <div style={{ display: 'flex', gap: '1.2rem' }}>
            {shabbatsLeft !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.88rem' }}>🕍</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{shabbatsLeft}</span> Shabbats
                </span>
              </div>
            )}
            {fastsLeft !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.88rem' }}>⚡</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{fastsLeft}</span> Fasts
                </span>
              </div>
            )}
          </div>
        )}

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
      {!dietStarted ? null : <div
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
            <div>since {format(DIET_START_DATE, 'MMM d')}</div>
            <div>{daysOnDiet} day{daysOnDiet !== 1 ? 's' : ''}</div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}
              onClick={e => { e.stopPropagation(); setTdeeInput(String(TDEE)); setEditingTdee(true) }}
            >
              {editingTdee ? (
                <input
                  autoFocus
                  type="number"
                  value={tdeeInput}
                  onChange={e => setTdeeInput(e.target.value)}
                  onBlur={() => {
                    const v = parseInt(tdeeInput)
                    if (v > 0) setData({ ...data, tdee: v })
                    setEditingTdee(false)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { const v = parseInt(tdeeInput); if (v > 0) setData({ ...data, tdee: v }); setEditingTdee(false) }
                    if (e.key === 'Escape') setEditingTdee(false)
                  }}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '70px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--primary)', borderRadius: '0.4rem', padding: '0.1rem 0.3rem', color: 'var(--text-main)', fontSize: '0.75rem', textAlign: 'right' }}
                />
              ) : (
                <span style={{ cursor: 'pointer', borderBottom: '1px dotted rgba(255,255,255,0.3)' }} title="Tap to edit TDEE">TDEE {TDEE} kcal</span>
              )}
            </div>
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
      </div>}

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
        {totalProtein > 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Protein: {consumedProtein}g / {totalProtein}g
          </div>
        )}
      </div>

      {/* ── Plan picker ── */}
      {Object.keys(data.dayPlans).length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>
              Plan: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{currentLog.planId}</span>
            </span>
            <button
              onClick={() => setShowPlanPicker(v => !v)}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.18rem 0.55rem', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Change
            </button>
          </div>
          {showPlanPicker && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {Object.keys(data.dayPlans).map(planId => (
                <button
                  key={planId}
                  onClick={() => assignPlanToDate(planId)}
                  style={{
                    padding: '0.32rem 0.8rem', borderRadius: '2rem',
                    background: currentLog.planId === planId ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                    color: currentLog.planId === planId ? 'var(--bg-deep)' : 'var(--text-muted)',
                    border: currentLog.planId === planId ? 'none' : 'var(--border-glass)',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {planId}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
            {currentMeals.map((meal) => {
              const isExpanded = expandedMealId === meal.id
              const hasItems = (meal.items?.length ?? 0) > 0
              return (
                <div key={meal.id} style={{ borderRadius: '1rem', overflow: 'hidden', border: meal.completed ? '1px solid rgba(100,255,218,0.25)' : 'var(--border-glass)', transition: 'border 0.25s ease' }}>
                  <div
                    style={{
                      display: 'flex', gap: '0.8rem', alignItems: 'center',
                      background: meal.completed ? 'rgba(100,255,218,0.06)' : 'var(--bg-card)',
                      padding: '0.9rem 1rem',
                      transition: 'background 0.25s ease',
                    }}
                  >
                    <button
                      onClick={() => toggleMeal(meal.id)}
                      style={{ background: 'none', border: 'none', padding: 0, color: meal.completed ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, display: 'flex' }}
                    >
                      {meal.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div
                      onClick={() => hasItems && setExpandedMealId(isExpanded ? null : meal.id)}
                      style={{ flex: 1, minWidth: 0, cursor: hasItems ? 'pointer' : 'default' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)' }}>
                        {meal.calories} kcal{meal.protein ? ` · ${meal.protein}g protein` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{meal.time}</div>
                      {hasItems && (
                        <button onClick={() => setExpandedMealId(isExpanded ? null : meal.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && hasItems && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.6rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {meal.items!.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-main)' }}>{item.name}</span>
                          <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.5rem' }}>
                            {item.calories} kcal{item.protein ? ` · ${item.protein}g` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
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
