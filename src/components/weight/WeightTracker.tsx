import { useState, useMemo } from 'react'
import { format, getYear, getMonth, startOfWeek } from 'date-fns'
import type { WeightEntry, UserData, ChartSegment, ChartMilestone } from '../../types'
import { useWeightTrend, movingAvg, linReg } from '../../hooks/useWeightTrend'
import WeightRuler from './WeightRuler'
import WeightChart from './WeightChart'
import WeightLog from './WeightLog'

const MIN_KG = 30
const MAX_KG = 200
const DEFAULT_KG = 70
const PALETTE = ['#64FFDA', '#7C3AED', '#FB7185', '#F59E0B', '#3B82F6', '#10B981', '#F97316', '#EF4444']

type ChartView = 'day' | 'week' | 'month'

type ChartPoint = {
  label: string
  weight:  number | null
  smooth:  number | null
  pred:    number | null
}

interface WeightTrackerProps {
  user: string
  data: UserData
  setData: (d: UserData) => void
  loading: boolean
}

const WeightTracker = ({ data, setData, loading }: WeightTrackerProps) => {
  const [currentWeight, setCurrentWeight]   = useState(DEFAULT_KG)
  const [mainTab, setMainTab]               = useState<'chart' | 'log'>('chart')
  const [logYear, setLogYear]               = useState(getYear(new Date()))
  const [logMonth, setLogMonth]             = useState(getMonth(new Date()))
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualDate, setManualDate]           = useState(format(new Date(), 'yyyy-MM-dd'))
  const [manualTime, setManualTime]           = useState('10:00')
  const [manualWeight, setManualWeight]       = useState('')
  const [chartView, setChartView]             = useState<ChartView>('day')
  const [showAddSegment, setShowAddSegment]   = useState(false)
  const [segLabel, setSegLabel]               = useState('')
  const [segStart, setSegStart]               = useState('')
  const [segEnd, setSegEnd]                   = useState('')
  const [segColor, setSegColor]               = useState(PALETTE[0])
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [msLabel, setMsLabel]                 = useState('')
  const [msDate, setMsDate]                   = useState('')
  const [msTarget, setMsTarget]               = useState('')

  const { getMilestoneAnalysis } = useWeightTrend(data.weightHistory || [])

  const addWeight = () => {
    const entry: WeightEntry = { date: new Date().toISOString(), weight: currentWeight }
    setData({ ...data, weightHistory: [...(data.weightHistory || []), entry] })
  }

  const addManualWeight = () => {
    const kg = parseFloat(manualWeight)
    if (!manualDate || isNaN(kg) || kg < MIN_KG || kg > MAX_KG) return
    const date = new Date(`${manualDate}T${manualTime || '00:00'}:00`).toISOString()
    const entry: WeightEntry = { date, weight: kg }
    setData({ ...data, weightHistory: [...(data.weightHistory || []), entry] })
    setShowManualEntry(false)
    setManualWeight('')
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

    const histPoints: ChartPoint[] = sorted.map((e, i) => ({
      label:  format(new Date(e.date), 'MMM d'),
      weight: e.weight,
      smooth: movingAvg(weights, i),
      pred:   null,
    }))

    const PRED_DAYS = 30
    const lastDate  = new Date(sorted[sorted.length - 1].date)
    const predPoints: ChartPoint[] = Array.from({ length: PRED_DAYS }, (_, j) => {
      const predX   = weights.length + j
      const predY   = Math.round((intercept + slope * predX) * 10) / 10
      const futDate = new Date(lastDate)
      futDate.setDate(futDate.getDate() + j + 1)
      return { label: format(futDate, 'MMM d'), weight: null, smooth: null, pred: predY }
    })

    histPoints[histPoints.length - 1].pred = Math.round((intercept + slope * (weights.length - 1)) * 10) / 10

    return [...histPoints, ...predPoints]
  }, [data.weightHistory])

  // ── Week aggregated chart data ─────────────────────────────────────────────
  const weekChartData = useMemo((): ChartPoint[] => {
    const history = data.weightHistory || []
    if (!history.length) return []
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const weekMap = new Map<string, { weights: number[]; date: Date }>()
    for (const e of sorted) {
      const ws  = startOfWeek(new Date(e.date), { weekStartsOn: 0 })
      const key = format(ws, 'MMM d')
      if (!weekMap.has(key)) weekMap.set(key, { weights: [], date: ws })
      weekMap.get(key)!.weights.push(e.weight)
    }
    const weeks = Array.from(weekMap.values()).map(({ weights, date }) => ({
      label: format(date, 'MMM d'),
      avg:   Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10,
    }))
    const avgs = weeks.map(w => w.avg)
    const { slope, intercept } = linReg(avgs)
    return weeks.map((w, i) => ({
      label: w.label,
      weight: w.avg,
      smooth: Math.round((intercept + slope * i) * 10) / 10,
      pred: null,
    }))
  }, [data.weightHistory])

  // ── Month aggregated chart data ────────────────────────────────────────────
  const monthChartData = useMemo((): ChartPoint[] => {
    const history = data.weightHistory || []
    if (!history.length) return []
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const monthMap = new Map<string, number[]>()
    const monthOrder: string[] = []
    for (const e of sorted) {
      const key = format(new Date(e.date), "MMM ''yy")
      if (!monthMap.has(key)) { monthMap.set(key, []); monthOrder.push(key) }
      monthMap.get(key)!.push(e.weight)
    }
    const months = monthOrder.map(key => {
      const weights = monthMap.get(key)!
      return { label: key, avg: Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10 }
    })
    const avgs = months.map(m => m.avg)
    const { slope, intercept } = linReg(avgs)
    return months.map((m, i) => ({
      label: m.label,
      weight: m.avg,
      smooth: Math.round((intercept + slope * i) * 10) / 10,
      pred: null,
    }))
  }, [data.weightHistory])

  const activeChartData = chartView === 'day' ? chartData : chartView === 'week' ? weekChartData : monthChartData

  // ── Segment / milestone management ─────────────────────────────────────────
  const addSegment = () => {
    if (!segLabel || !segStart || !segEnd) return
    const seg: ChartSegment = { id: Date.now().toString(), label: segLabel, startDate: segStart, endDate: segEnd, color: segColor }
    setData({ ...data, chartSegments: [...(data.chartSegments || []), seg] })
    setSegLabel(''); setSegStart(''); setSegEnd(''); setSegColor(PALETTE[0]); setShowAddSegment(false)
  }
  const deleteSegment = (id: string) =>
    setData({ ...data, chartSegments: (data.chartSegments || []).filter(s => s.id !== id) })

  const addMilestone = () => {
    if (!msLabel || !msDate) return
    const targetWeight = parseFloat(msTarget)
    const ms: ChartMilestone = {
      id: Date.now().toString(), label: msLabel, date: msDate,
      ...(isNaN(targetWeight) ? {} : { targetWeight }),
    }
    setData({ ...data, chartMilestones: [...(data.chartMilestones || []), ms] })
    setMsLabel(''); setMsDate(''); setMsTarget(''); setShowAddMilestone(false)
  }
  const deleteMilestone = (id: string) =>
    setData({ ...data, chartMilestones: (data.chartMilestones || []).filter(m => m.id !== id) })

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

  const monthDelta = useMemo(() => {
    if (logEntries.length < 2) return null
    const delta = logEntries[0].weight - logEntries[logEntries.length - 1].weight
    return Math.round(delta * 10) / 10
  }, [logEntries])

  // Initial weight for ruler
  const initialWeight = useMemo(() => {
    return data.weightHistory?.length
      ? data.weightHistory[data.weightHistory.length - 1].weight
      : DEFAULT_KG
  }, [data.weightHistory])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <WeightRuler
        currentWeight={currentWeight}
        initialWeight={initialWeight}
        onWeightChange={setCurrentWeight}
        onAdd={addWeight}
        loading={loading}
        manualEntryProps={{
          showManualEntry,
          onToggleManualEntry: () => setShowManualEntry(v => !v),
          manualWeight,
          manualDate,
          manualTime,
          onManualWeightChange: setManualWeight,
          onManualDateChange: setManualDate,
          onManualTimeChange: setManualTime,
          onAddManual: addManualWeight,
        }}
      />

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

      {mainTab === 'chart' && (
        <WeightChart
          chartView={chartView}
          setChartView={setChartView}
          activeChartData={activeChartData}
          totalEntries={data.weightHistory?.length ?? 0}
          chartSegments={data.chartSegments || []}
          chartMilestones={data.chartMilestones || []}
          onDeleteSegment={deleteSegment}
          onDeleteMilestone={deleteMilestone}
          getMilestoneAnalysis={getMilestoneAnalysis}
          addSegmentProps={{
            show: showAddSegment,
            onToggle: () => setShowAddSegment(v => !v),
            label: segLabel,
            start: segStart,
            end: segEnd,
            color: segColor,
            onLabelChange: setSegLabel,
            onStartChange: setSegStart,
            onEndChange: setSegEnd,
            onColorChange: setSegColor,
            onAdd: addSegment,
          }}
          addMilestoneProps={{
            show: showAddMilestone,
            onToggle: () => setShowAddMilestone(v => !v),
            label: msLabel,
            date: msDate,
            target: msTarget,
            onLabelChange: setMsLabel,
            onDateChange: setMsDate,
            onTargetChange: setMsTarget,
            onAdd: addMilestone,
          }}
        />
      )}

      {mainTab === 'log' && (
        <WeightLog
          weightHistory={data.weightHistory || []}
          logYear={logYear}
          logMonth={logMonth}
          allYears={allYears}
          logEntries={logEntries}
          monthDelta={monthDelta}
          onYearChange={setLogYear}
          onMonthChange={setLogMonth}
          onDelete={deleteWeight}
        />
      )}
    </div>
  )
}

export default WeightTracker
