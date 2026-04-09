import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Brush,
} from 'recharts'
import { Plus, Trash2, Flag } from 'lucide-react'
import { format } from 'date-fns'
import type { ChartSegment, ChartMilestone } from '../../types'

const PALETTE = ['#64FFDA', '#7C3AED', '#FB7185', '#F59E0B', '#3B82F6', '#10B981', '#F97316', '#EF4444']

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
  chartSegments: ChartSegment[]
  chartMilestones: ChartMilestone[]
  onDeleteSegment: (id: string) => void
  onDeleteMilestone: (id: string) => void
  addSegmentProps: AddSegmentProps
  addMilestoneProps: AddMilestoneProps
  getMilestoneAnalysis: (ms: ChartMilestone) => { predictedWeight: number; onTrack: boolean; calToGo: number | null } | null
}

const WeightChart = ({
  chartView,
  setChartView,
  activeChartData,
  chartSegments,
  chartMilestones,
  onDeleteSegment,
  onDeleteMilestone,
  addSegmentProps,
  addMilestoneProps,
  getMilestoneAnalysis,
}: WeightChartProps) => {
  return (
    <div className="card glass" style={{ padding: '1.2rem' }}>
      {/* Header: title + Day/Week/Month toggle */}
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
      </div>

      {activeChartData.length < 2 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>
          Log at least 2 entries to see the chart.
        </div>
      ) : (
        <div style={{ height: chartView === 'day' ? '260px' : '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={activeChartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
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

              {/* Plan segments (day view only) */}
              {chartView === 'day' && chartSegments.map(seg => (
                <ReferenceArea
                  key={seg.id}
                  x1={format(new Date(seg.startDate), 'MMM d')}
                  x2={format(new Date(seg.endDate), 'MMM d')}
                  fill={seg.color} fillOpacity={0.1}
                  stroke={seg.color} strokeOpacity={0.3} strokeWidth={1}
                />
              ))}

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v: number) => `${v}`} />

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
                        const name = item.dataKey === 'weight' ? 'Actual' : item.dataKey === 'smooth' ? 'Trend' : item.dataKey === 'pred' ? 'Forecast' : String(item.dataKey)
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
                dot={(props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
                  const { cx, cy, payload } = props
                  if (payload?.weight == null || cx == null || cy == null) return <g key={`dot-empty-${cx}-${cy}`} />
                  const isOutlier = payload.smooth != null && Math.abs(payload.weight - payload.smooth) > 1.5
                  return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={isOutlier ? 5 : 4}
                    fill={isOutlier ? '#F97316' : 'var(--primary)'}
                    stroke="var(--bg-card)" strokeWidth={2} />
                }}
                connectNulls={false} isAnimationActive={false}
              />

              {/* Today line (day view) */}
              {chartView === 'day' && (
                <ReferenceLine x={format(new Date(), 'MMM d')} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4"
                  label={{ value: 'Today', fill: 'var(--text-muted)', fontSize: 8, position: 'insideTopRight' }}
                />
              )}

              {/* Milestones (day view) */}
              {chartView === 'day' && chartMilestones.map(ms => (
                <ReferenceLine key={ms.id} x={format(new Date(ms.date), 'MMM d')} stroke="#F59E0B" strokeDasharray="3 3"
                  label={{ value: ms.label, fill: '#F59E0B', fontSize: 8, position: 'insideTopLeft' }}
                />
              ))}

              {/* Brush for zoom/scroll (day view, >10 points) */}
              {chartView === 'day' && activeChartData.length > 10 && (
                <Brush
                  dataKey="label" height={18}
                  stroke="rgba(100,255,218,0.3)" fill="rgba(0,0,0,0.2)"
                  travellerWidth={6}
                  startIndex={Math.max(0, activeChartData.length - 60)}
                  endIndex={activeChartData.length - 1}
                />
              )}
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
          {chartSegments.map(seg => (
            <div key={seg.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: seg.color, flexShrink: 0 }} />
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
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => addSegmentProps.onColorChange(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: addSegmentProps.color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
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
          {chartMilestones.map(ms => {
            const analysis = getMilestoneAnalysis(ms)
            return (
              <div key={ms.id} style={{ padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flag size={11} color="#F59E0B" />
                  <span style={{ flex: 1, fontSize: '0.78rem' }}>{ms.label}</span>
                  {ms.targetWeight != null && (
                    <span style={{ fontSize: '0.68rem', color: '#F59E0B', fontWeight: 600 }}>{ms.targetWeight} kg</span>
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
              <input placeholder="Label (e.g. Event / Goal)" value={addMilestoneProps.label} onChange={e => addMilestoneProps.onLabelChange(e.target.value)} className="glass"
                style={{ padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="date" value={addMilestoneProps.date} onChange={e => addMilestoneProps.onDateChange(e.target.value)} className="glass"
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                <input type="number" placeholder="Target kg (opt.)" value={addMilestoneProps.target} onChange={e => addMilestoneProps.onTargetChange(e.target.value)} step="0.1" className="glass"
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
