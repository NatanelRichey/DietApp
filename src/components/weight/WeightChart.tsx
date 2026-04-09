import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'
import { Plus, Trash2, Flag } from 'lucide-react'
import { format } from 'date-fns'
import type { ChartSegment, ChartMilestone } from '../../types'

// Neon green → neon blue palette for segments
const SEGMENT_PALETTE = [
  '#64FFDA', '#4DFFD4', '#38D9FF', '#1AC8FF', '#00AAFF',
  '#0088FF', '#0066FF', '#3A5EFF',
]
const segmentColor = (index: number) => SEGMENT_PALETTE[index % SEGMENT_PALETTE.length]

// Pink → orange palette for milestones
const MILESTONE_PALETTE = [
  '#FB7185', '#F97316', '#FBBF24', '#FB7185', '#F97316',
]
const milestoneColor = (index: number) => MILESTONE_PALETTE[index % MILESTONE_PALETTE.length]

type ChartView = 'day' | 'week' | 'month'

type ChartPoint = {
  label: string
  weight:  number | null
  smooth:  number | null
  pred:    number | null
}

interface AddSegmentProps {
  show: boolean
  onToggle: () => void
  label: string
  start: string
  end: string
  color: string
  onLabelChange: (v: string) => void
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  onColorChange: (v: string) => void
  onAdd: () => void
}

interface AddMilestoneProps {
  show: boolean
  onToggle: () => void
  label: string
  date: string
  target: string
  onLabelChange: (v: string) => void
  onDateChange: (v: string) => void
  onTargetChange: (v: string) => void
  onAdd: () => void
}

interface WeightChartProps {
  chartView: ChartView
  setChartView: (v: ChartView) => void
  activeChartData: ChartPoint[]
  totalEntries: number  // raw entry count (for better empty state messages)
  chartSegments: ChartSegment[]
  chartMilestones: ChartMilestone[]
  onDeleteSegment: (id: string) => void
  onDeleteMilestone: (id: string) => void
  addSegmentProps: AddSegmentProps
  addMilestoneProps: AddMilestoneProps
  getMilestoneAnalysis: (ms: ChartMilestone) => { predictedWeight: number; onTrack: boolean; calToGo: number | null } | null
}

// ── Gesture state ─────────────────────────────────────────────────────────────
interface GestureState {
  type: 'pan' | 'pinch'
  startX: number
  startY: number
  startDist?: number
  startWindow: [number, number]
  startYRange?: [number, number]
}

const getDist = (t0: React.Touch, t1: React.Touch) =>
  Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)

const getDataYRange = (data: ChartPoint[], start: number, end: number): [number, number] => {
  let lo = Infinity, hi = -Infinity
  for (let i = start; i <= end; i++) {
    const p = data[i]
    if (p.weight != null) { lo = Math.min(lo, p.weight); hi = Math.max(hi, p.weight) }
    if (p.smooth != null) { lo = Math.min(lo, p.smooth); hi = Math.max(hi, p.smooth) }
    if (p.pred   != null) { lo = Math.min(lo, p.pred);   hi = Math.max(hi, p.pred)   }
  }
  return [isFinite(lo) ? lo : 0, isFinite(hi) ? hi : 0]
}

const WeightChart = ({
  chartView,
  setChartView,
  activeChartData,
  totalEntries,
  chartSegments,
  chartMilestones,
  onDeleteSegment,
  onDeleteMilestone,
  addSegmentProps,
  addMilestoneProps,
  getMilestoneAnalysis,
}: WeightChartProps) => {
  const n = activeChartData.length

  // Gesture-controlled window [start, end] into activeChartData
  const [window, setWindow] = useState<[number, number]>([0, Math.max(0, n - 1)])
  const [yDomain, setYDomain] = useState<[number | string, number | string]>(['dataMin - 0.5', 'dataMax + 0.5'])
  const gesture = useRef<GestureState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastPxPerPoint = useRef(1)

  // Reset window when data changes (e.g., view switch)
  useEffect(() => {
    setWindow([0, Math.max(0, n - 1)])
    setYDomain(['dataMin - 0.5', 'dataMax + 0.5'])
  }, [n, chartView])

  const clampWindow = useCallback((start: number, end: number, total: number): [number, number] => {
    const size = Math.max(2, end - start)
    const s = Math.max(0, Math.min(total - 1 - size, Math.round(start)))
    const e = Math.min(total - 1, s + size)
    return [s, e]
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      gesture.current = {
        type: 'pan',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startWindow: [...window] as [number, number],
      }
    } else if (e.touches.length === 2) {
      const [y0, y1] = getDataYRange(activeChartData, window[0], window[1])
      gesture.current = {
        type: 'pinch',
        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        startDist: getDist(e.touches[0], e.touches[1]),
        startWindow: [...window] as [number, number],
        startYRange: [y0, y1],
      }
    }
  }, [window, activeChartData])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const g = gesture.current
    if (!g || !n) return

    if (g.type === 'pan' && e.touches.length === 1) {
      e.preventDefault()
      const dx = e.touches[0].clientX - g.startX
      const pxPerPoint = lastPxPerPoint.current
      const shift = Math.round(-dx / pxPerPoint)
      const [s, en] = clampWindow(g.startWindow[0] + shift, g.startWindow[1] + shift, n)
      setWindow([s, en])

    } else if (g.type === 'pinch' && e.touches.length === 2) {
      e.preventDefault()
      const dist = getDist(e.touches[0], e.touches[1])
      const dx0 = e.touches[0].clientX - e.touches[1].clientX
      const dy0 = e.touches[0].clientY - e.touches[1].clientY
      const isVertical = Math.abs(dy0) > Math.abs(dx0)

      if (!isVertical) {
        // Horizontal pinch → zoom X
        const ratio = (g.startDist ?? dist) / Math.max(dist, 1)
        const cx = (g.startWindow[0] + g.startWindow[1]) / 2
        const halfSpan = Math.max(1, Math.round(((g.startWindow[1] - g.startWindow[0]) / 2) * ratio))
        const [s, en] = clampWindow(Math.round(cx - halfSpan), Math.round(cx + halfSpan), n)
        setWindow([s, en])
      } else {
        // Vertical pinch → zoom Y
        const ratio = (g.startDist ?? dist) / Math.max(dist, 1)
        const [y0, y1] = g.startYRange ?? getDataYRange(activeChartData, window[0], window[1])
        const mid = (y0 + y1) / 2
        const halfSpan = Math.max(0.3, ((y1 - y0) / 2) * ratio)
        setYDomain([+(mid - halfSpan).toFixed(1), +(mid + halfSpan).toFixed(1)])
      }
    }
  }, [n, clampWindow, activeChartData, window])

  const onTouchEnd = useCallback(() => {
    gesture.current = null
  }, [])

  // Track px-per-point for pan calculation
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 300
      const pts = window[1] - window[0] + 1
      lastPxPerPoint.current = pts > 1 ? width / (pts - 1) : width
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [window])

  const visibleData = n > 0 ? activeChartData.slice(window[0], window[1] + 1) : activeChartData

  return (
    <div className="card glass" style={{ padding: '1.2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Progress</h3>
        <div style={{ display: 'flex', gap: '0.15rem', background: 'rgba(255,255,255,0.05)', padding: '0.15rem', borderRadius: '0.6rem' }}>
          {(['day', 'week', 'month'] as ChartView[]).map(v => (
            <button key={v} onClick={() => setChartView(v)} style={{
              padding: '0.18rem 0.55rem', borderRadius: '0.45rem', border: 'none', cursor: 'pointer',
              background: chartView === v ? 'var(--primary)' : 'transparent',
              color: chartView === v ? 'var(--bg-deep)' : 'var(--text-muted)',
              fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize',
            }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg-card)' }} /> Actual
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ display: 'inline-block', width: 16, height: 2, background: 'var(--primary)' }} /> Trend
        </span>
        {chartView === 'day' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: 16, height: 0, borderTop: '2px dashed var(--primary)', opacity: 0.5 }} /> Forecast
          </span>
        )}
        {n > 0 && chartView === 'day' && (
          <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: 'var(--text-muted)', opacity: 0.6 }}>
            slide · pinch
          </span>
        )}
      </div>

      {n < 2 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>
          {totalEntries < 2
            ? 'Log at least 2 entries to see the chart.'
            : chartView === 'week'
              ? 'Need entries across multiple weeks to show week view.'
              : 'Need entries across multiple months to show month view.'}
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{ height: chartView === 'day' ? '260px' : '220px', touchAction: 'none' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visibleData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
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

              {/* Segments — auto-colored neon green→blue */}
              {chartView === 'day' && chartSegments.map((seg, idx) => (
                <ReferenceArea
                  key={seg.id}
                  x1={format(new Date(seg.startDate), 'MMM d')}
                  x2={format(new Date(seg.endDate), 'MMM d')}
                  fill={segmentColor(idx)} fillOpacity={0.08}
                  stroke={segmentColor(idx)} strokeOpacity={0.25} strokeWidth={1}
                />
              ))}

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} domain={yDomain} tickFormatter={(v: number) => `${v}`} />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const seen = new Set<string>()
                  const items = payload.filter(p => {
                    const dk = String(p.dataKey)
                    if (!['weight', 'smooth', 'pred'].includes(dk)) return false
                    if (p.value == null) return false
                    if (seen.has(dk)) return false
                    seen.add(dk)
                    return true
                  })
                  if (!items.length) return null
                  return (
                    <div style={{ background: 'var(--bg-card)', border: 'var(--border-glass)', borderRadius: '1rem', padding: '0.5rem 0.75rem', fontSize: '0.78rem' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
                      {items.map((item, i) => {
                        const v = typeof item.value === 'number' ? item.value : null
                        if (v == null) return null
                        const name = item.dataKey === 'weight' ? 'Actual' : item.dataKey === 'smooth' ? 'Trend' : 'Forecast'
                        return <div key={i} style={{ color: 'var(--primary)' }}>{name}: {v} kg</div>
                      })}
                    </div>
                  )
                }}
              />

              {chartView === 'day' && <Area dataKey="pred" fill="url(#predGrad)" stroke="none" connectNulls={false} isAnimationActive={false} />}
              <Area dataKey="smooth" fill="url(#smoothGrad)" stroke="none" connectNulls={false} isAnimationActive={false} />

              {chartView === 'day' && (
                <Line dataKey="pred" stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.45} dot={false} connectNulls={false} isAnimationActive={false} />
              )}
              <Line dataKey="smooth" stroke="var(--primary)" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
              <Line
                dataKey="weight" stroke="transparent" strokeWidth={0}
                dot={(props: { cx?: number; cy?: number; payload?: ChartPoint; yAxis?: { scale?: (v: number) => number } }) => {
                  const { cx, cy, payload } = props
                  if (payload?.weight == null || cx == null || cy == null) return <g key={`dot-empty-${cx}-${cy}`} />
                  const isOutlier = payload.smooth != null && Math.abs(payload.weight - payload.smooth) > 1.5
                  // Draw vertical line from dot to trend line when there's a gap
                  const smoothCy = payload.smooth != null && props.yAxis?.scale
                    ? props.yAxis.scale(payload.smooth)
                    : null
                  return (
                    <g key={`dot-${cx}-${cy}`}>
                      {smoothCy != null && Math.abs(cy - smoothCy) > 2 && (
                        <line x1={cx} y1={cy} x2={cx} y2={smoothCy}
                          stroke={isOutlier ? '#F97316' : 'var(--primary)'}
                          strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2 2" />
                      )}
                      <circle cx={cx} cy={cy} r={isOutlier ? 5 : 4}
                        fill={isOutlier ? '#F97316' : 'var(--primary)'}
                        stroke="var(--bg-card)" strokeWidth={2} />
                    </g>
                  )
                }}
                connectNulls={false} isAnimationActive={false}
              />

              {/* Today line (day view) */}
              {chartView === 'day' && (
                <ReferenceLine x={format(new Date(), 'MMM d')} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4"
                  label={{ value: 'Today', fill: 'var(--text-muted)', fontSize: 8, position: 'insideTopRight' }}
                />
              )}

              {/* Milestones (day view) — pink→orange palette */}
              {chartView === 'day' && chartMilestones.map((ms, idx) => (
                <ReferenceLine key={ms.id} x={format(new Date(ms.date), 'MMM d')}
                  stroke={milestoneColor(idx)} strokeWidth={1.5} strokeDasharray="4 3"
                  label={{ value: ms.label, fill: milestoneColor(idx), fontSize: 8, position: 'insideTopLeft' }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Segments management (day view) ── */}
      {chartView === 'day' && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Segments</span>
            <button onClick={addSegmentProps.onToggle} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={13} /> Add
            </button>
          </div>
          {chartSegments.length === 0 && !addSegmentProps.show && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.5, padding: '0.3rem 0' }}>
              No segments yet — add one to highlight date ranges.
            </div>
          )}
          {chartSegments.map((seg, idx) => (
            <div key={seg.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: segmentColor(idx), flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.78rem' }}>{seg.label}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{format(new Date(seg.startDate), 'MMM d')} – {format(new Date(seg.endDate), 'MMM d')}</span>
              <button onClick={() => onDeleteSegment(seg.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', padding: '0.1rem', opacity: 0.6 }}><Trash2 size={12} /></button>
            </div>
          ))}
          {addSegmentProps.show && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.6rem' }}>
              <input placeholder="Label (e.g. Aggressive Cut)" value={addSegmentProps.label} onChange={e => addSegmentProps.onLabelChange(e.target.value)} className="glass"
                style={{ padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="date" value={addSegmentProps.start} onChange={e => addSegmentProps.onStartChange(e.target.value)} className="glass"
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                <input type="date" value={addSegmentProps.end} onChange={e => addSegmentProps.onEndChange(e.target.value)} className="glass"
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
              </div>
              <button onClick={addSegmentProps.onAdd} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={14} /> Add Segment
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Milestones management (day view) ── */}
      {chartView === 'day' && (
        <div style={{ marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Milestones</span>
            <button onClick={addMilestoneProps.onToggle} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={13} /> Add
            </button>
          </div>
          {chartMilestones.length === 0 && !addMilestoneProps.show && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.5, padding: '0.3rem 0' }}>
              No milestones yet — add one to track a goal or event.
            </div>
          )}
          {chartMilestones.map((ms, idx) => {
            const analysis = getMilestoneAnalysis(ms)
            const mColor = milestoneColor(idx)
            return (
              <div key={ms.id} style={{ padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flag size={11} color={mColor} />
                  <span style={{ flex: 1, fontSize: '0.78rem' }}>{ms.label}</span>
                  {ms.targetWeight != null && (
                    <span style={{ fontSize: '0.68rem', color: mColor, fontWeight: 600 }}>{ms.targetWeight} kg</span>
                  )}
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{format(new Date(ms.date), 'MMM d')}</span>
                  <button onClick={() => onDeleteMilestone(ms.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', padding: '0.1rem', opacity: 0.6 }}><Trash2 size={12} /></button>
                </div>
                {analysis && (
                  <div style={{ marginTop: '0.2rem', marginLeft: '1.4rem', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>Predicted: <span style={{ color: analysis.onTrack ? 'var(--primary)' : '#F97316' }}>{analysis.predictedWeight} kg</span></span>
                    <span style={{ color: analysis.onTrack ? 'var(--primary)' : '#F97316', fontWeight: 700 }}>
                      {analysis.onTrack ? '✓ On track' : '⚠ Off track'}
                    </span>
                    {!analysis.onTrack && analysis.calToGo != null && (
                      <span>cut ~{analysis.calToGo} kcal/day</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {addMilestoneProps.show && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.6rem' }}>
              <input placeholder="Label (e.g. Shavuot)" value={addMilestoneProps.label} onChange={e => addMilestoneProps.onLabelChange(e.target.value)} className="glass"
                style={{ padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="date" value={addMilestoneProps.date} onChange={e => addMilestoneProps.onDateChange(e.target.value)} className="glass"
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                <input type="number" placeholder="Target weight (kg)" value={addMilestoneProps.target} onChange={e => addMilestoneProps.onTargetChange(e.target.value)} step="0.1" className="glass"
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
              </div>
              <button onClick={addMilestoneProps.onAdd} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Flag size={14} /> Add Milestone
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WeightChart
