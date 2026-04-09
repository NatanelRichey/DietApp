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

const ACTIVITY_KEYS = [
  { key: 'gym',    label: 'Gym',    Icon: Dumbbell  },
  { key: 'cardio', label: 'Cardio', Icon: Wind      },
  { key: 'walk',   label: 'Walk',   Icon: Footprints },
] as const

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {DAY_LABELS.map((label, day) => {
            const d = schedule[day] ?? { gym: false, cardio: false, walk: false, notes: '' }
            const isActive = d.gym || d.cardio || d.walk
            return (
              <div
                key={day}
                style={{
                  borderRadius: '1rem',
                  background: isActive ? 'rgba(100,255,218,0.05)' : 'rgba(255,255,255,0.03)',
                  border: isActive ? '1px solid rgba(100,255,218,0.12)' : '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Top row: day label + activity toggles */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '3.2rem 1fr 1fr 1fr',
                  gap: '0.5rem',
                  padding: '0.75rem 0.85rem 0.5rem',
                  alignItems: 'center',
                }}>
                  <div style={{
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  }}>
                    {label}
                  </div>

                  {ACTIVITY_KEYS.map(({ key, label: actLabel, Icon }) => (
                    <button
                      key={key}
                      onClick={() => updateDay(day, { [key]: !d[key] })}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        padding: '0.55rem 0.25rem',
                        borderRadius: '0.75rem',
                        border: 'none',
                        background: d[key]
                          ? 'rgba(100,255,218,0.18)'
                          : 'rgba(255,255,255,0.05)',
                        color: d[key] ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <Icon size={15} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                        {d[key] ? 'ON' : 'OFF'}
                      </span>
                      <span style={{ fontSize: '0.58rem', color: 'inherit', opacity: 0.7 }}>
                        {actLabel}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Bottom row: full-width notes */}
                <div style={{ padding: '0 0.85rem 0.75rem' }}>
                  <input
                    type="text"
                    value={d.notes}
                    onChange={e => updateDay(day, { notes: e.target.value })}
                    placeholder={`${label} notes...`}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '0.6rem',
                      padding: '0.45rem 0.7rem',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WorkoutSchedule
