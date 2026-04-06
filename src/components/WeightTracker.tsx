import { useState, useRef, useEffect, useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Plus, Trash2 } from 'lucide-react'
import { format, getYear, getMonth } from 'date-fns'
import type { WeightEntry, UserData } from '../types'

// ─── Ruler constants ──────────────────────────────────────────────────────────
const MIN_KG = 30
const MAX_KG = 200
const TICK_PX = 10
const DEFAULT_KG = 70

function kgToScroll(kg: number) { return Math.round((kg - MIN_KG) * 10) * TICK_PX }
function scrollToKg(px: number) { return Math.round((MIN_KG + px / TICK_PX / 10) * 10) / 10 }

// ─── Weekday colours for log circles ─────────────────────────────────────────
const DOW_COLORS = ['#F59E0B', '#3B82F6', '#06B6D4', '#10B981', '#8B5CF6', '#F43F5E', '#F97316']
const DOW_NAMES  = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Math helpers ─────────────────────────────────────────────────────────────
const movingAvg = (values: number[], idx: number, half = 3) => {
  const start = Math.max(0, idx - half)
  const end   = Math.min(values.length - 1, idx + half)
  const slice = values.slice(start, end + 1)
  return Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 10) / 10
}

const linReg = (ys: number[]) => {
  const n = ys.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }
  const xs = ys.map((_, i) => i)
  const sumX  = xs.reduce((s, x) => s + x, 0)
  const sumY  = ys.reduce((s, y) => s + y, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumXX = xs.reduce((s, x) => s + x * x, 0)
  const slope     = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WeightTrackerProps {
  user: string
  data: UserData
  setData: (d: UserData) => void
  loading: boolean
}

type ChartPoint = {
  label: string
  weight:  number | null
  smooth:  number | null
  pred:    number | null
}

// ─── Component ────────────────────────────────────────────────────────────────
const WeightTracker = ({ data, setData, loading }: WeightTrackerProps) => {
  const [currentWeight, setCurrentWeight]   = useState(DEFAULT_KG)
  const [mainTab, setMainTab]               = useState<'chart' | 'log'>('chart')
  const [logYear, setLogYear]               = useState(getYear(new Date()))
  const [logMonth, setLogMonth]             = useState(getMonth(new Date()))
  const rulerRef         = useRef<HTMLDivElement>(null)
  const initialisedRef   = useRef(false)
  const snapTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!loading && !initialisedRef.current && rulerRef.current) {
      initialisedRef.current = true
      const lastWeight = data.weightHistory?.length
        ? data.weightHistory[data.weightHistory.length - 1].weight
        : DEFAULT_KG
      const clamped = Math.min(Math.max(Math.round(lastWeight * 10) / 10, MIN_KG), MAX_KG)
      setCurrentWeight(clamped)
      rulerRef.current.scrollLeft = kgToScroll(clamped)
    }
  }, [loading, data.weightHistory])

  const snapToNearest = (scrollLeft: number, el: HTMLDivElement) => {
    const raw     = scrollToKg(scrollLeft)
    const snapped = Math.min(Math.max(Math.round(raw * 10) / 10, MIN_KG), MAX_KG)
    setCurrentWeight(snapped)
    el.scrollLeft = kgToScroll(snapped)
  }

  const handleRulerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const raw = scrollToKg(e.currentTarget.scrollLeft)
    setCurrentWeight(Math.min(Math.max(Math.round(raw * 10) / 10, MIN_KG), MAX_KG))
    const el = e.currentTarget
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
    snapTimeoutRef.current = setTimeout(() => snapToNearest(el.scrollLeft, el), 150)
  }

  const addWeight = () => {
    const entry: WeightEntry = { date: new Date().toISOString(), weight: currentWeight }
    setData({ ...data, weightHistory: [...(data.weightHistory || []), entry] })
  }

  const deleteWeight = (entry: WeightEntry) => {
    setData({ ...data, weightHistory: data.weightHistory.filter(e => e !== entry) })
  }

  // ── Chart data (smooth + prediction) ───────────────────────────────────────
  const chartData = useMemo((): ChartPoint[] => {
    const history = data.weightHistory || []
    if (!history.length) return []

    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const weights = sorted.map(e => e.weight)
    const { slope, intercept } = linReg(weights)

    // Historical points: actual dot + smoothed line
    const histPoints: ChartPoint[] = sorted.map((e, i) => ({
      label:  format(new Date(e.date), 'MMM d'),
      weight: e.weight,
      smooth: movingAvg(weights, i),
      pred:   null,
    }))

    // Prediction: start from last actual, extend 30 days
    const PRED_DAYS = 30
    const lastDate  = new Date(sorted[sorted.length - 1].date)
    const predPoints: ChartPoint[] = Array.from({ length: PRED_DAYS }, (_, j) => {
      const predX   = weights.length + j
      const predY   = Math.round((intercept + slope * predX) * 10) / 10
      const futDate = new Date(lastDate)
      futDate.setDate(futDate.getDate() + j + 1)
      return { label: format(futDate, 'MMM d'), weight: null, smooth: null, pred: predY }
    })

    // Bridge: last historical point gets a pred value to connect the lines
    histPoints[histPoints.length - 1].pred = Math.round((intercept + slope * (weights.length - 1)) * 10) / 10

    return [...histPoints, ...predPoints]
  }, [data.weightHistory])

  // ── Log view data ──────────────────────────────────────────────────────────
  const allYears = useMemo(() => {
    const history = data.weightHistory || []
    if (!history.length) return [getYear(new Date())]
    const years = [...new Set(history.map(e => getYear(new Date(e.date))))]
    return years.sort()
  }, [data.weightHistory])

  const logEntries = useMemo(() => {
    return (data.weightHistory || [])
      .filter(e => {
        const d = new Date(e.date)
        return getYear(d) === logYear && getMonth(d) === logMonth
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data.weightHistory, logYear, logMonth])

  // Month change delta for log header
  const monthDelta = useMemo(() => {
    if (logEntries.length < 2) return null
    const delta = logEntries[0].weight - logEntries[logEntries.length - 1].weight
    return Math.round(delta * 10) / 10
  }, [logEntries])

  const totalTicks = (MAX_KG - MIN_KG) * 10 + 1

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Weight selector */}
      <div className="card glass" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Current Weight</div>
        <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
          {currentWeight.toFixed(1)}
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>kg</span>
        </div>

        {/* Ruler */}
        <div style={{ position: 'relative', marginTop: '1rem' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid var(--primary)', zIndex: 10 }} />
          <div
            ref={rulerRef}
            onScroll={handleRulerScroll}
            style={{ width: '100%', height: '70px', overflowX: 'scroll', overflowY: 'hidden', display: 'flex', alignItems: 'flex-end', paddingTop: '10px', scrollbarWidth: 'none', position: 'relative' }}
          >
            <div style={{ flexShrink: 0, width: '50%' }} />
            {Array.from({ length: totalTicks }).map((_, i) => {
              const kg      = MIN_KG + i / 10
              const isMajor = i % 10 === 0
              const isHalf  = i % 5 === 0 && !isMajor
              return (
                <div key={i} style={{ flexShrink: 0, width: '1px', height: isMajor ? '36px' : isHalf ? '22px' : '12px', background: isMajor ? 'var(--text-main)' : 'var(--text-muted)', opacity: isMajor ? 0.8 : 0.35, position: 'relative', marginRight: `${TICK_PX - 1}px` }}>
                  {isMajor && (
                    <span style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {kg % 10 === 0 ? `${kg}` : ''}
                    </span>
                  )}
                </div>
              )
            })}
            <div style={{ flexShrink: 0, width: '50%' }} />
          </div>
          <div style={{ position: 'absolute', left: '50%', top: '10px', bottom: '20px', width: '2px', background: 'var(--primary)', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 5, opacity: 0.6 }} />
        </div>

        <button className="btn-primary" onClick={addWeight} style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}>
          <Plus size={18} /> Log {currentWeight.toFixed(1)} kg
        </button>
      </div>

      {/* Main tab switcher */}
      <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '1rem' }}>
        {(['chart', 'log'] as const).map(tab => (
          <button key={tab} onClick={() => setMainTab(tab)} style={{
            flex: 1, background: mainTab === tab ? 'var(--primary)' : 'transparent',
            color: mainTab === tab ? 'var(--bg-deep)' : 'var(--text-muted)',
            border: 'none', padding: '0.4rem', borderRadius: '0.8rem',
            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {tab === 'chart' ? 'Chart' : 'Log'}
          </button>
        ))}
      </div>

      {/* ── CHART TAB ─────────────────────────────────────────────────────── */}
      {mainTab === 'chart' && (
        <div className="card glass" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Progress</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg-card)' }} /> actual
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: 16, height: 2, background: 'var(--primary)' }} /> trend
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: 16, height: 2, background: 'var(--primary)', opacity: 0.4, borderTop: '2px dashed var(--primary)' }} /> forecast
              </span>
            </div>
          </div>

          {chartData.length < 2 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>
              Log at least 2 entries to see the chart.
            </div>
          ) : (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="smoothGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false}
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tickFormatter={(v: number) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: 'var(--border-glass)', borderRadius: '1rem', fontSize: '0.78rem' }}
                    itemStyle={{ color: 'var(--primary)' }}
                    formatter={(val, name) => {
                      const v = typeof val === 'number' ? val : Number(val)
                      if (name === 'weight') return [`${v} kg`, 'Actual']
                      if (name === 'smooth') return [`${v} kg`, 'Trend']
                      if (name === 'pred')   return [`${v} kg`, 'Forecast']
                      return [val, name]
                    }}
                  />

                  {/* Prediction fill area */}
                  <Area dataKey="pred" fill="url(#predGrad)" stroke="none" connectNulls={false} isAnimationActive={false} />

                  {/* Smooth trend fill (subtle) */}
                  <Area dataKey="smooth" fill="url(#smoothGrad)" stroke="none" connectNulls={false} isAnimationActive={false} />

                  {/* Prediction line (dashed) */}
                  <Line
                    dataKey="pred" stroke="var(--primary)" strokeWidth={1.5}
                    strokeDasharray="5 4" strokeOpacity={0.45}
                    dot={false} connectNulls={false} isAnimationActive={false}
                  />

                  {/* Smooth trend line */}
                  <Line
                    dataKey="smooth" stroke="var(--primary)" strokeWidth={2.5}
                    dot={false} connectNulls={false} isAnimationActive={false}
                  />

                  {/* Actual weight dots (no line, just circles) */}
                  <Line
                    dataKey="weight" stroke="transparent" strokeWidth={0}
                    dot={(props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
                      if (props.payload?.weight == null || props.cx == null || props.cy == null) return <g key={`dot-empty-${props.cx}-${props.cy}`} />
                      return (
                        <circle
                          key={`dot-${props.cx}-${props.cy}`}
                          cx={props.cx} cy={props.cy} r={4}
                          fill="var(--primary)"
                          stroke="var(--bg-card)"
                          strokeWidth={2}
                        />
                      )
                    }}
                    connectNulls={false} isAnimationActive={false}
                  />

                  {/* Today separator */}
                  <ReferenceLine
                    x={format(new Date(), 'MMM d')}
                    stroke="rgba(255,255,255,0.15)"
                    strokeDasharray="4 4"
                    label={{ value: 'today', fill: 'var(--text-muted)', fontSize: 8, position: 'insideTopRight' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── LOG TAB ───────────────────────────────────────────────────────── */}
      {mainTab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Year tabs */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {allYears.map(yr => (
              <button key={yr} onClick={() => setLogYear(yr)} style={{
                padding: '0.35rem 0.9rem', borderRadius: '2rem',
                background: logYear === yr ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                color:      logYear === yr ? 'var(--bg-deep)' : 'var(--text-muted)',
                border: logYear === yr ? 'none' : 'var(--border-glass)',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              }}>
                {yr}
              </button>
            ))}
          </div>

          {/* Month pills */}
          <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
            {MONTH_NAMES.map((m, idx) => (
              <button key={m} onClick={() => setLogMonth(idx)} style={{
                flexShrink: 0,
                padding: '0.3rem 0.75rem', borderRadius: '2rem',
                background: logMonth === idx ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color:      logMonth === idx ? 'var(--bg-deep)' : 'var(--text-muted)',
                border: logMonth === idx ? 'none' : 'var(--border-glass)',
                fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
              }}>
                {m}
              </button>
            ))}
          </div>

          {/* Month header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.2rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {MONTH_NAMES[logMonth]} {logYear}
            </span>
            {monthDelta !== null && (
              <span style={{ fontSize: '0.82rem', color: monthDelta <= 0 ? 'var(--primary)' : 'var(--accent-pink)', fontWeight: 600 }}>
                {monthDelta > 0 ? '+' : ''}{monthDelta} kg ({monthDelta > 0 ? '+' : ''}{Math.round((monthDelta / (logEntries[logEntries.length - 1]?.weight || 1)) * 1000) / 10}%)
              </span>
            )}
          </div>

          {/* Entries */}
          {logEntries.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem', fontSize: '0.85rem' }}>
              No entries for {MONTH_NAMES[logMonth]} {logYear}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {logEntries.map((entry, i) => {
                const d   = new Date(entry.date)
                const dow = d.getDay()
                const col = DOW_COLORS[dow]
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.9rem',
                    background: 'var(--bg-card)', padding: '0.75rem 1rem',
                    borderRadius: '1rem', border: 'var(--border-glass)',
                  }}>
                    {/* Weekday circle */}
                    <div style={{
                      flexShrink: 0, width: 44, height: 44, borderRadius: '50%',
                      background: `${col}22`, border: `2px solid ${col}66`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      color: col,
                    }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, lineHeight: 1 }}>{format(d, 'd')}</span>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.2 }}>{DOW_NAMES[dow]}</span>
                    </div>

                    {/* Weight */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {entry.weight}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.2rem', fontWeight: 400 }}>kg</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {format(d, 'HH:mm')}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteWeight(entry)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.55, cursor: 'pointer', padding: '0.3rem', flexShrink: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}

              {/* Footer */}
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.5rem', marginTop: '0.3rem' }}>
                {logEntries.length} {logEntries.length === 1 ? 'entry' : 'entries'} in {MONTH_NAMES[logMonth]} {logYear}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WeightTracker
