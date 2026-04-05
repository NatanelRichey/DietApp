import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { format, addDays, startOfDay, eachDayOfInterval, differenceInDays } from 'date-fns'
import type { UserData } from '../types'

const TDEE = 2500
const DIET_START = new Date('2026-04-03T12:00:00')
const HARDCODED_CONSUMED: Record<string, number> = {
  '2026-04-03': 600,
  '2026-04-04': 1500,
}
const KG_THRESHOLD = 7700
const MILESTONE_COLORS = ['#64FFDA', '#00BFFF', '#A855F7', '#FB7185', '#F59E0B']

const toDateKey = (d: Date) => format(d, 'yyyy-MM-dd')

interface Props {
  data: UserData
}

const DeficitSideBars = ({ data }: Props) => {
  const [now, setNow] = useState(new Date())
  const [dismissedDailyDate, setDismissedDailyDate] = useState(
    () => localStorage.getItem('deficit-banner-daily') || ''
  )
  const [dismissedKgCount, setDismissedKgCount] = useState(
    () => parseInt(localStorage.getItem('deficit-banner-1kg') || '-1', 10)
  )

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const today = startOfDay(now)
  const todayKey = toDateKey(today)

  // Cumulative deficit for all completed days before today
  const priorDeficit = useMemo(() => {
    const dietStartDay = startOfDay(DIET_START)
    const yesterday = addDays(today, -1)
    if (differenceInDays(yesterday, dietStartDay) < 0) return 0
    return eachDayOfInterval({ start: dietStartDay, end: yesterday }).reduce((total, d) => {
      const key = toDateKey(d)
      const consumed = HARDCODED_CONSUMED[key] !== undefined
        ? HARDCODED_CONSUMED[key]
        : (data.dailyLogs?.[key]?.meals ?? []).filter(m => m.completed).reduce((s, m) => s + m.calories, 0)
      return total + Math.max(0, TDEE - consumed)
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey, data.dailyLogs])

  // Today's consumed calories (live — updates as user checks meals)
  const todayConsumed = (data.dailyLogs?.[todayKey]?.meals ?? [])
    .filter(m => m.completed)
    .reduce((s, m) => s + m.calories, 0)

  const todayDeficit = Math.max(0, TDEE - todayConsumed)

  // Today's planned total (used for daily bar target)
  const todayTotalPlanned = useMemo(() => {
    const log = data.dailyLogs?.[todayKey]
    if (log) return log.meals.reduce((s, m) => s + m.calories, 0)
    const dow = today.getDay()
    const planId = data.weekSchedule?.[dow] || data.activePlanId
    const plan = data.dayPlans?.[planId]
    return plan?.meals.reduce((s, m) => s + m.calories, 0) ?? 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey, data.dailyLogs, data.weekSchedule, data.activePlanId, data.dayPlans])

  const dailyGoalDeficit = Math.max(1, TDEE - todayTotalPlanned)

  // 10am → 10pm animation factor (0 → 1)
  const barStart = new Date(today.getTime() + 10 * 3600 * 1000)
  const barEnd   = new Date(today.getTime() + 22 * 3600 * 1000)
  const elapsed  = Math.max(0, Math.min(1,
    (now.getTime() - barStart.getTime()) / (barEnd.getTime() - barStart.getTime())
  ))

  // Left bar — daily goal (today's animated deficit vs. daily goal deficit)
  const dailyBarFill = Math.min(1, elapsed * todayDeficit / dailyGoalDeficit)

  // Right bar — 1kg goal (prior + animated today, cycling per 7700 kcal)
  const animatedTotal = priorDeficit + elapsed * todayDeficit
  const kgMilestones  = Math.floor(animatedTotal / KG_THRESHOLD)
  const kgBarFill     = (animatedTotal % KG_THRESHOLD) / KG_THRESHOLD

  const barColor = MILESTONE_COLORS[kgMilestones % MILESTONE_COLORS.length]

  // Banner visibility
  const showDailyBanner = dailyBarFill >= 1 && dismissedDailyDate !== todayKey
  const showKgBanner    = kgMilestones > 0 && kgMilestones > dismissedKgCount

  const dismissDaily = () => {
    localStorage.setItem('deficit-banner-daily', todayKey)
    setDismissedDailyDate(todayKey)
  }

  const dismissKg = () => {
    localStorage.setItem('deficit-banner-1kg', String(kgMilestones))
    setDismissedKgCount(kgMilestones)
  }

  const barBase: React.CSSProperties = {
    position: 'fixed',
    top: 58,
    bottom: 80,
    width: 5,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    zIndex: 500,
  }

  const fillStyle = (fill: number): React.CSSProperties => ({
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: `${fill * 100}%`,
    background: `linear-gradient(to top, ${barColor}99, ${barColor})`,
    transition: 'height 1s linear',
    borderRadius: 3,
  })

  const bannerBase: React.CSSProperties = {
    position: 'fixed',
    top: 64,
    left: '0.75rem',
    right: '0.75rem',
    zIndex: 900,
    background: 'rgba(16, 33, 62, 0.95)',
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
      <div style={{ ...barBase, left: 0 }}>
        <div style={fillStyle(dailyBarFill)} />
      </div>

      {/* Right bar — 1kg goal */}
      <div style={{ ...barBase, right: 0 }}>
        <div style={fillStyle(kgBarFill)} />
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
              <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                Daily goal reached!
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                You hit your deficit target for today. Keep it up!
              </div>
            </div>
            <button
              onClick={dismissDaily}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', flexShrink: 0 }}
            >
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
              <div style={{ fontWeight: 700, color: barColor, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                {kgMilestones} kg burned!
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                You've crossed {kgMilestones} × 7,700 kcal in deficit. Incredible!
              </div>
            </div>
            <button
              onClick={dismissKg}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default DeficitSideBars
