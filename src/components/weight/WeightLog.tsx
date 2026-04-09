import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import type { WeightEntry } from '../../types'

const DOW_COLORS = ['#F59E0B', '#3B82F6', '#06B6D4', '#10B981', '#8B5CF6', '#F43F5E', '#F97316']
const DOW_NAMES  = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface WeightLogProps {
  weightHistory: WeightEntry[]
  logYear: number
  logMonth: number
  allYears: number[]
  logEntries: WeightEntry[]
  monthDelta: number | null
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  onDelete: (entry: WeightEntry) => void
}

const WeightLog = ({
  logYear,
  logMonth,
  allYears,
  logEntries,
  monthDelta,
  onYearChange,
  onMonthChange,
  onDelete,
}: WeightLogProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Year tabs */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {allYears.map(yr => (
          <button key={yr} onClick={() => onYearChange(yr)} style={{
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
          <button key={m} onClick={() => onMonthChange(idx)} style={{
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
                  onClick={() => onDelete(entry)}
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
  )
}

export default WeightLog
