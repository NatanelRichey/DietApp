import { useMemo } from 'react'
import type { WeightEntry, ChartMilestone } from '../types'

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

// Re-export helpers for use by WeightTracker (chart data computation)
export { movingAvg, linReg }

interface WeightTrend {
  slope: number
  intercept: number
  n: number
  lastDate: Date
}

export function useWeightTrend(weightHistory: WeightEntry[]) {
  const trend = useMemo((): WeightTrend | null => {
    if (weightHistory.length < 2) return null
    const sorted = [...weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const weights = sorted.map(e => e.weight)
    const { slope, intercept } = linReg(weights)
    const lastDate = new Date(sorted[sorted.length - 1].date)
    return { slope, intercept, n: weights.length, lastDate }
  }, [weightHistory])

  const getMilestoneAnalysis = (ms: ChartMilestone) => {
    if (!trend || ms.targetWeight == null) return null
    const { slope, intercept, n, lastDate } = trend
    const msDate = new Date(ms.date)
    const daysToMs = Math.round((msDate.getTime() - lastDate.getTime()) / 86400000)
    const predictedWeight = Math.round((intercept + slope * (n - 1 + Math.max(0, daysToMs))) * 10) / 10
    const onTrack = slope <= 0 ? predictedWeight <= ms.targetWeight : predictedWeight >= ms.targetWeight
    const calToGo = daysToMs > 0 ? Math.round(Math.abs(predictedWeight - ms.targetWeight) * 7700 / daysToMs) : null
    return { predictedWeight, onTrack, calToGo }
  }

  return { trend, getMilestoneAnalysis }
}
