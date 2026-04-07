import { useRef, useEffect } from 'react'
import { Dumbbell, Wind, Footprints } from 'lucide-react'
import type { UserData, WorkoutDay } from '../types'

interface WorkoutScheduleProps {
  user:    string
  data:    UserData
  setData: (d: UserData) => void
  loading: boolean
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const NATAN_SEED: Record<number, WorkoutDay> = {
  0: { gym: true,  cardio: true,  walk: false, notes: 'no protein bar' },
  1: { gym: true,  cardio: false, walk: true,  notes: 'protein bar' },
  2: { gym: false, cardio: false, walk: true,  notes: 'protein bar' },
  3: { gym: true,  cardio: true,  walk: false, notes: 'no protein bar' },
  4: { gym: true,  cardio: true,  walk: false, notes: 'no protein bar' },
  5: { gym: false, cardio: false, walk: false, notes: 'eat less' },
  6: { gym: false, cardio: false, walk: true,  notes: 'eat less' },
}

const WorkoutSchedule = ({ user, data, setData, loading }: WorkoutScheduleProps) => {
  const seedRef = useRef(false)

  useEffect(() => {
    if (user.toLowerCase() !== 'natan') { seedRef.current = true; return }
    if (seedRef.current || loading) return
    if (data.workoutSchedule) { seedRef.current = true; return }
    seedRef.current = true
    setData({ ...data, workoutSchedule: NATAN_SEED })
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateDay = (day: number, patch: Partial<WorkoutDay>) => {
    const existing = data.workoutSchedule?.[day] ?? { gym: false, cardio: false, walk: false, notes: '' }
    setData({
      ...data,
      workoutSchedule: {
        ...(data.workoutSchedule ?? {}),
        [day]: { ...existing, ...patch },
      },
    })
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>Loading schedule...</div>

  const schedule = data.workoutSchedule ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass" style={{ padding: '1.1rem 1.2rem', borderRadius: '1.2rem' }}>
        <h3 style={{ margin: '0 0 1.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
          <Dumbbell size={18} color="var(--primary)" /> Weekly Schedule
        </h3>

        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.8rem 1fr 1fr 1fr 1fr', gap: '0.4rem', marginBottom: '0.6rem', padding: '0 0.2rem' }}>
          <div />
          {[{ label: 'Gym', icon: <Dumbbell size={13} /> }, { label: 'Cardio', icon: <Wind size={13} /> }, { label: 'Walk', icon: <Footprints size={13} /> }].map(({ label, icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {icon}{label}
            </div>
          ))}
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', paddingLeft: '0.3rem' }}>Notes</div>
        </div>

        {/* Day rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {DAY_LABELS.map((label, day) => {
            const d = schedule[day] ?? { gym: false, cardio: false, walk: false, notes: '' }
            return (
              <div
                key={day}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.8rem 1fr 1fr 1fr 1fr',
                  gap: '0.4rem',
                  alignItems: 'center',
                  padding: '0.55rem 0.2rem',
                  borderRadius: '0.8rem',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</div>

                {(['gym', 'cardio', 'walk'] as const).map(key => (
                  <button
                    key={key}
                    onClick={() => updateDay(day, { [key]: !d[key] })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.35rem',
                      borderRadius: '0.6rem',
                      border: d[key] ? '2px solid var(--primary)' : 'var(--border-glass)',
                      background: d[key] ? 'rgba(100,255,218,0.15)' : 'transparent',
                      color: d[key] ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {d[key] ? '✓' : '–'}
                  </button>
                ))}

                <input
                  type="text"
                  value={d.notes}
                  onChange={e => updateDay(day, { notes: e.target.value })}
                  placeholder="Notes..."
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'var(--border-glass)',
                    borderRadius: '0.6rem',
                    padding: '0.35rem 0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.78rem',
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WorkoutSchedule
