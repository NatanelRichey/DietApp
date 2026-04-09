import { useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'

const MIN_KG = 30
const MAX_KG = 200
const TICK_PX = 10

function kgToScroll(kg: number) { return Math.round((kg - MIN_KG) * 10) * TICK_PX }
function scrollToKg(px: number) { return Math.round((MIN_KG + px / TICK_PX / 10) * 10) / 10 }

interface ManualEntryProps {
  showManualEntry: boolean
  onToggleManualEntry: () => void
  manualWeight: string
  manualDate: string
  manualTime: string
  onManualWeightChange: (v: string) => void
  onManualDateChange: (v: string) => void
  onManualTimeChange: (v: string) => void
  onAddManual: () => void
}

interface WeightRulerProps {
  currentWeight: number
  initialWeight: number
  onWeightChange: (kg: number) => void
  onAdd: () => void
  manualEntryProps: ManualEntryProps
  loading: boolean
}

const WeightRuler = ({ currentWeight, initialWeight, onWeightChange, onAdd, manualEntryProps, loading }: WeightRulerProps) => {
  const rulerRef = useRef<HTMLDivElement>(null)
  const initialisedRef = useRef(false)
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!loading && !initialisedRef.current && rulerRef.current) {
      initialisedRef.current = true
      const clamped = Math.min(Math.max(Math.round(initialWeight * 10) / 10, MIN_KG), MAX_KG)
      rulerRef.current.scrollLeft = kgToScroll(clamped)
    }
  }, [loading, initialWeight])

  const snapToNearest = (scrollLeft: number, el: HTMLDivElement) => {
    const raw     = scrollToKg(scrollLeft)
    const snapped = Math.min(Math.max(Math.round(raw * 10) / 10, MIN_KG), MAX_KG)
    onWeightChange(snapped)
    el.scrollLeft = kgToScroll(snapped)
  }

  const handleRulerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const raw = scrollToKg(e.currentTarget.scrollLeft)
    onWeightChange(Math.min(Math.max(Math.round(raw * 10) / 10, MIN_KG), MAX_KG))
    const el = e.currentTarget
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
    snapTimeoutRef.current = setTimeout(() => snapToNearest(el.scrollLeft, el), 150)
  }

  const totalTicks = (MAX_KG - MIN_KG) * 10 + 1
  const {
    showManualEntry, onToggleManualEntry,
    manualWeight, manualDate, manualTime,
    onManualWeightChange, onManualDateChange, onManualTimeChange,
    onAddManual,
  } = manualEntryProps

  return (
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

      <button className="btn-primary" onClick={onAdd} style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}>
        <Plus size={18} /> Log {currentWeight.toFixed(1)} kg
      </button>

      {/* Manual entry toggle */}
      <button
        onClick={onToggleManualEntry}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', marginTop: '0.6rem', textDecoration: 'underline' }}
      >
        {showManualEntry ? 'Cancel manual entry' : 'Log for a different date / weight'}
      </button>

      {showManualEntry && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="number"
              placeholder="Weight (kg)"
              value={manualWeight}
              onChange={e => onManualWeightChange(e.target.value)}
              step="0.1"
              className="glass"
              style={{ padding: '0.7rem 0.9rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '100px' }}
            />
            <input
              type="date"
              value={manualDate}
              onChange={e => onManualDateChange(e.target.value)}
              className="glass"
              style={{ padding: '0.7rem 0.9rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '120px' }}
            />
            <input
              type="time"
              value={manualTime}
              onChange={e => onManualTimeChange(e.target.value)}
              className="glass"
              style={{ padding: '0.7rem 0.9rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: '0 0 auto' }}
            />
          </div>
          <button className="btn-primary" onClick={onAddManual} style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={16} /> Add Entry
          </button>
        </div>
      )}
    </div>
  )
}

export default WeightRuler
