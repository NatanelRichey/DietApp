import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { format, addDays, startOfDay, eachDayOfInterval, differenceInDays } from 'date-fns'
import type { UserData } from '../types'

const TDEE = 2500
const DIET_START = new Date('2026-04-03')
const ISRAEL_TZ  = 'Asia/Jerusalem'
const HARDCODED_CONSUMED: Record<string, number> = {
  '2026-04-03': 600,
  '2026-04-04': 1500,
}
const KG_THRESHOLD    = 7700
const MILESTONE_COLORS = ['#64FFDA', '#00BFFF', '#A855F7', '#FB7185', '#F59E0B']

const toDateKey = (d: Date) => format(d, 'yyyy-MM-dd')

const getIsraelTodayKey = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ISRAEL_TZ }).format(new Date())

// Fraction of 10am–10pm window elapsed in Israel time (0 before 10am, 1 at/after 10pm)
const getElapsed = (): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TZ, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(new Date())
  const h = parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0')
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  const s = parseInt(parts.find(p => p.type === 'second')?.value ?? '0')
  const secs = h * 3600 + m * 60 + s
  return Math.max(0, Math.min(1, (secs - 36000) / 43200))
}

interface Props {
  data: UserData
}

const DeficitSideBars = ({ data }: Props) => {
  const [elapsed, setElapsed] = useState(getElapsed)
  const [dismissedDailyDate, setDismissedDailyDate] = useState(
    () => localStorage.getItem('deficit-banner-daily') || ''
  )
  const [dismissedKgCount, setDismissedKgCount] = useState(
    () => parseInt(localStorage.getItem('deficit-banner-1kg') || '-1', 10)
  )

  useEffect(() => {
    const id = setInterval(() => setElapsed(getElapsed()), 1000)
    return () => clearInterval(id)
  }, [])

  const israelTodayKey = getIsraelTodayKey()

  // Prior days cumulative deficit (all days before today, full value)
  const priorDeficit = useMemo(() => {
    const dietStart  = startOfDay(DIET_START)
    const yesterday  = addDays(startOfDay(new Date()), -1)
    if (differenceInDays(yesterday, dietStart) < 0) return 0
    return eachDayOfInterval({ start: dietStart, end: yesterday }).reduce((total, d) => {
      const key      = toDateKey(d)
      const consumed = HARDCODED_CONSUMED[key] !== undefined
        ? HARDCODED_CONSUMED[key]
        : (data.dailyLogs?.[key]?.meals ?? []).filter(m => m.completed).reduce((s, m) => s + m.calories, 0)
      return total + Math.max(0, TDEE - consumed)
    }, 0)
  }, [israelTodayKey, data.dailyLogs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Today's consumed and max deficit
  const todayConsumed   = (data.dailyLogs?.[israelTodayKey]?.meals ?? []).filter(m => m.completed).reduce((s, m) => s + m.calories, 0)
  const todayMaxDeficit = Math.max(0, TDEE - todayConsumed)

  // Today's planned total (for daily bar 100% target)
  const todayTotalPlanned = useMemo(() => {
    const log = data.dailyLogs?.[israelTodayKey]
    if (log) return log.meals.reduce((s, m) => s + m.calories, 0)
    const dow    = new Date().getDay()
    const planId = data.weekSchedule?.[dow] || data.activePlanId
    return data.dayPlans?.[planId]?.meals.reduce((s, m) => s + m.calories, 0) ?? 0
  }, [israelTodayKey, data.dailyLogs, data.weekSchedule, data.activePlanId, data.dayPlans])

  const dailyGoalDeficit = Math.max(1, TDEE - todayTotalPlanned)

  // Left bar — today's animated deficit vs daily goal
  const dailyBarFill = Math.min(1, elapsed * todayMaxDeficit / dailyGoalDeficit)
  const dailyPct     = Math.round(dailyBarFill * 100)

  // Right bar — cumulative toward 7700 kcal (cycles each kg milestone)
  const animatedTotal = priorDeficit + elapsed * todayMaxDeficit
  const kgMilestones  = Math.floor(animatedTotal / KG_THRESHOLD)
  const kgBarFill     = (animatedTotal % KG_THRESHOLD) / KG_THRESHOLD
  const kgPct         = Math.round(kgBarFill * 100)

  const barColor = MILESTONE_COLORS[kgMilestones % MILESTONE_COLORS.length]

  // Banners
  const showDailyBanner = dailyBarFill >= 1 && dismissedDailyDate !== israelTodayKey
  const showKgBanner    = kgMilestones > 0 && kgMilestones > dismissedKgCount

  const dismissDaily = () => {
    localStorage.setItem('deficit-banner-daily', israelTodayKey)
    setDismissedDailyDate(israelTodayKey)
  }
  const dismissKg = () => {
    localStorage.setItem('deficit-banner-1kg', String(kgMilestones))
    setDismissedKgCount(kgMilestones)
  }

  // Bar container (fixed vertical strip on left or right edge)
  const barContainer = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'fixed',
    top: 58,
    bottom: 80,
    [side]: 0,
    width: 22,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    zIndex: 500,
  })

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    width: 12,
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    borderRadius: 6,
    overflow: 'hidden',
    margin: '4px 0',
  }

  const fillStyle = (fill: number): React.CSSProperties => ({
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: `${fill * 100}%`,
    background: `linear-gradient(to top, ${barColor}88, ${barColor})`,
    transition: 'height 1s linear',
    borderRadius: 6,
  })

  const labelStyle: React.CSSProperties = {
    fontSize: '0.55rem',
    fontWeight: 700,
    color: barColor,
    letterSpacing: '0.03em',
    lineHeight: 1.2,
    textAlign: 'center',
  }

  const pctStyle: React.CSSProperties = {
    fontSize: '0.5rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  }

  const bannerBase: React.CSSProperties = {
    position: 'fixed',
    top: 64,
    left: '0.75rem',
    right: '0.75rem',
    zIndex: 900,
    background: 'rgba(16, 33, 62, 0.96)',
    borderRadius: '1rem',
    padding: '1rem 1.1rem',
    backdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.8rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  }

  return (
    <>
      {/* Left bar — Daily goal */}
      <div style={barContainer('left')}>
        <div style={pctStyle}>{dailyPct}%</div>
        <div style={trackStyle}>
          <div style={fillStyle(dailyBarFill)} />
        </div>
        <div style={labelStyle}>D<br/>A<br/>I<br/>L<br/>Y</div>
      </div>

      {/* Right bar — 1kg goal */}
      <div style={barContainer('right')}>
        <div style={pctStyle}>{kgPct}%</div>
        <div style={trackStyle}>
          <div style={fillStyle(kgBarFill)} />
        </div>
        <div style={labelStyle}>1<br/>K<br/>G</div>
      </div>

      {/* Banners */}
      <AnimatePresence>
        {showDailyBanner && (
          <motion.div
            key="daily-banner"
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ ...bannerBase, border: '1px solid rgba(100,255,218,0.35)' }}
          >
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🎯</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', marginBottom: '0.2rem' }}>Daily goal reached!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>You hit your deficit target for today. Keep it up!</div>
            </div>
            <button onClick={dismissDaily} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', flexShrink: 0 }}>
              <X size={18} />
            </button>
          </motion.div>
        )}

        {showKgBanner && !showDailyBanner && (
          <motion.div
            key={`kg-banner-${kgMilestones}`}
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ ...bannerBase, border: `1px solid ${barColor}60` }}
          >
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🏆</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: barColor, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{kgMilestones} kg burned!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>You've crossed {kgMilestones} × 7,700 kcal in deficit. Incredible!</div>
            </div>
            <button onClick={dismissKg} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', flexShrink: 0 }}>
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default DeficitSideBars
