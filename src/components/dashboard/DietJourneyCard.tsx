import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { format, isSameDay, addDays } from 'date-fns'
import type { UserData } from '../../types'

interface UpcomingDay {
  date: Date
  label: string
  labelColor: string
  calories: number
}

interface DietJourneyCardProps {
  dietStarted: boolean
  daysOnDiet: number
  daysUntilStart: number
  totalDietDays: number | null
  daysToGo: number | null
  journeyPct: number | null
  shabbatsLeft: number | null
  fastsLeft: number | null
  DIET_START_DATE: Date
  MILESTONE_DATE: Date | null
  journeyExpanded: boolean
  onToggle: () => void
  upcomingDays: UpcomingDay[]
}

const DietJourneyCard = ({
  dietStarted,
  daysOnDiet,
  daysUntilStart,
  totalDietDays,
  daysToGo,
  journeyPct,
  shabbatsLeft,
  fastsLeft,
  DIET_START_DATE,
  journeyExpanded,
  onToggle,
  upcomingDays,
}: DietJourneyCardProps) => {
  return (
    <div
      className="glass"
      style={{ padding: '1.1rem 1.2rem', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
      onClick={onToggle}
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
  )
}

export default DietJourneyCard
