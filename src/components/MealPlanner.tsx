import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, Calendar, Utensils, Info, Edit2, Save } from 'lucide-react'
import type { DayPlan, Meal, UserData } from '../types'

interface MealPlannerProps {
  user: string
  data: UserData
  setData: (d: UserData) => void
  loading: boolean
}

const MealPlanner = ({ data, setData, loading }: MealPlannerProps) => {
  const [editingPlanId, setEditingPlanId] = useState(() => {
    const keys = Object.keys(data.dayPlans)
    return keys.includes(data.activePlanId) ? data.activePlanId : (keys[0] || '')
  })
  const currentPlan = data.dayPlans[editingPlanId] || { type: editingPlanId, meals: [], guidelines: '' }
  const [newMeal, setNewMeal] = useState({ name: '', time: '12:00', calories: '' })

  const [selectedDays, setSelectedDays] = useState<number[]>(() =>
    Object.entries(data.weekSchedule || {})
      .filter(([, pid]) => pid === editingPlanId)
      .map(([day]) => Number(day))
  )
  const [scheduleDirty, setScheduleDirty] = useState(false)

  useEffect(() => {
    const days = Object.entries(data.weekSchedule || {})
      .filter(([, pid]) => pid === editingPlanId)
      .map(([day]) => Number(day))
    setSelectedDays(days)
    setScheduleDirty(false)
  }, [editingPlanId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>Loading planner...</div>

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const otherPlanDays = new Set<number>(
    Object.entries(data.weekSchedule || {})
      .filter(([, pid]) => pid !== editingPlanId)
      .map(([day]) => Number(day))
  )

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
    setScheduleDirty(true)
  }

  const saveSchedule = () => {
    const cleared = Object.fromEntries(
      Object.entries(data.weekSchedule || {}).filter(([, pid]) => pid !== editingPlanId)
    ) as Record<number, string>
    const newSchedule: Record<number, string> = { ...cleared }
    selectedDays.forEach(day => { newSchedule[day] = editingPlanId })
    setData({ ...data, weekSchedule: newSchedule })
    setScheduleDirty(false)
  }

  const updatePlan = (updatedPlan: DayPlan) => {
    const syncedLogs: Record<string, typeof data.dailyLogs[string]> = {}
    Object.entries(data.dailyLogs || {}).forEach(([key, log]) => {
      if (log.planId === editingPlanId && !log.meals.some(m => m.completed)) {
        syncedLogs[key] = { ...log, meals: updatedPlan.meals.map(m => ({ ...m, completed: false })) }
      }
    })
    setData({
      ...data,
      dayPlans: { ...data.dayPlans, [editingPlanId]: updatedPlan },
      dailyLogs: { ...(data.dailyLogs || {}), ...syncedLogs }
    })
  }

  const addMeal = () => {
    if (!newMeal.name || !newMeal.calories) return
    const meal: Meal = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMeal.name,
      time: newMeal.time,
      calories: parseInt(newMeal.calories),
      completed: false
    }
    const updatedMeals = [...currentPlan.meals, meal].sort((a, b) => a.time.localeCompare(b.time))
    updatePlan({ ...currentPlan, meals: updatedMeals })
    setNewMeal({ name: '', time: '12:00', calories: '' })
  }

  const deleteMeal = (id: string) => {
    const updatedMeals = currentPlan.meals.filter(m => m.id !== id)
    updatePlan({ ...currentPlan, meals: updatedMeals })
  }

  const deletePlanType = (planId: string) => {
    const planCount = Object.keys(data.dayPlans).length
    if (planCount <= 1) { alert('Cannot delete the only plan.'); return }
    if (!confirm(`Delete plan "${planId}"? This cannot be undone.`)) return

    const { [planId]: _removed, ...remainingPlans } = data.dayPlans
    const newActivePlan = data.activePlanId === planId ? Object.keys(remainingPlans)[0] : data.activePlanId
    const updatedSchedule = Object.fromEntries(
      Object.entries(data.weekSchedule || {}).filter(([, pid]) => pid !== planId)
    ) as Record<number, string>

    setData({ ...data, dayPlans: remainingPlans, activePlanId: newActivePlan, weekSchedule: updatedSchedule })
    setEditingPlanId(newActivePlan)
  }

  const renameDayType = (oldName: string) => {
    const newName = prompt('Enter new name:', oldName)
    if (!newName || newName === oldName) return

    const { [oldName]: planToRename, ...otherPlans } = data.dayPlans
    const updatedPlans = {
      ...otherPlans,
      [newName]: { ...planToRename, type: newName }
    }
    const updatedSchedule: Record<number, string> = {}
    Object.entries(data.weekSchedule || {}).forEach(([day, pid]) => {
      updatedSchedule[Number(day)] = pid === oldName ? newName : pid
    })

    setData({
      ...data,
      dayPlans: updatedPlans,
      activePlanId: data.activePlanId === oldName ? newName : data.activePlanId,
      weekSchedule: updatedSchedule
    })
    setEditingPlanId(newName)
  }

  const totalCalories = currentPlan.meals.reduce((sum, m) => sum + m.calories, 0)

  return (
    <div className="meal-planner" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Day Type Selector */}
      <div className="glass" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: '1.5rem', overflowX: 'auto' }}>
        {Object.keys(data.dayPlans).map(planId => (
          <button
            key={planId}
            onClick={() => setEditingPlanId(planId)}
            className={editingPlanId === planId ? 'btn-primary' : ''}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '1rem',
              border: editingPlanId === planId ? 'none' : 'var(--border-glass)',
              background: editingPlanId === planId ? 'var(--primary)' : 'transparent',
              color: editingPlanId === planId ? 'var(--bg-deep)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: 600,
              flexShrink: 0,
              fontSize: '0.9rem'
            }}
          >
            {planId}
          </button>
        ))}
        <button
          onClick={() => {
            const name = prompt('Enter new day type name (e.g. Vacation):')
            if (name) {
              setData({
                ...data,
                dayPlans: { ...data.dayPlans, [name]: { type: name, meals: [], guidelines: '' } }
              })
              setEditingPlanId(name)
            }
          }}
          style={{ background: 'none', border: 'var(--border-glass)', color: 'var(--text-muted)', padding: '0 1rem', borderRadius: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          + Add Type
        </button>
      </div>

      {/* Daily Guidelines */}
      <div className="card glass">
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} color="var(--primary)" /> Guidelines for {editingPlanId}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => renameDayType(editingPlanId)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <Edit2 size={14} /> Rename
            </button>
            <button
              onClick={() => deletePlanType(editingPlanId)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </h3>
        <textarea
          value={currentPlan.guidelines}
          onChange={(e) => updatePlan({ ...currentPlan, guidelines: e.target.value })}
          placeholder="Enter guidelines for this type of day..."
          style={{
            width: '100%',
            maxWidth: '100%',
            minHeight: '80px',
            background: 'rgba(255,255,255,0.05)',
            border: 'var(--border-glass)',
            borderRadius: '1rem',
            padding: '0.8rem',
            color: 'var(--text-main)',
            fontSize: '0.9rem',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Statistics */}
      <div className="card" style={{ background: 'var(--bg-deep)', border: '2px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Planned Total</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalCalories} <span style={{ fontSize: '0.8rem' }}>kcal</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Meals Scheduled</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{currentPlan.meals.length}</div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--primary)" /> Weekly Schedule
        </h3>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {DAY_LABELS.map((label, day) => {
            const isSelected = selectedDays.includes(day)
            const isOther = otherPlanDays.has(day)
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '2rem',
                  border: isSelected
                    ? '2px solid var(--primary)'
                    : isOther
                      ? '2px solid var(--accent-pink)'
                      : 'var(--border-glass)',
                  background: isSelected ? 'rgba(100,255,218,0.15)' : 'transparent',
                  color: isSelected ? 'var(--primary)' : isOther ? 'var(--accent-pink)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  opacity: isOther && !isSelected ? 0.55 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {selectedDays.some(d => otherPlanDays.has(d)) && (
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', opacity: 0.85 }}>
            Some selected days are currently assigned to another plan and will be reassigned on save.
          </div>
        )}

        {scheduleDirty && (
          <button
            onClick={saveSchedule}
            className="btn-primary"
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Save size={16} /> Save Schedule
          </button>
        )}
      </div>

      {/* Add Meal Form */}
      <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Add Scheduled Meal</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Meal name (e.g. Smoothie)"
            value={newMeal.name}
            onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
            className="glass"
            style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', width: '100%' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="time"
              value={newMeal.time}
              onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
              className="glass"
              style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: '0 0 auto' }}
            />
            <input
              type="number"
              placeholder="Calories"
              value={newMeal.calories}
              onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
              className="glass"
              style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: 0 }}
            />
            <button onClick={addMeal} className="btn-primary" style={{ flexShrink: 0 }}>
              <Plus size={18} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled Meals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Schedule</h3>
        {currentPlan.meals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No meals scheduled for this day type.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {currentPlan.meals.map(meal => (
              <div key={meal.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', gap: '0.8rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ background: 'rgba(100,255,218,0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '0.8rem', flexShrink: 0 }}>
                    <Utensils size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--primary)' }}>{meal.time}</span> · {meal.calories} kcal
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteMeal(meal.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Set as Active */}
      {data.activePlanId !== editingPlanId && (
        <button
          onClick={() => {
            const todayKey = format(new Date(), 'yyyy-MM-dd')
            const todayLog = data.dailyLogs?.[todayKey]
            const plan = data.dayPlans[editingPlanId]
            const newData: UserData = { ...data, activePlanId: editingPlanId }
            // Update today's log only if no meals have been completed yet
            if (!todayLog || !todayLog.meals.some(m => m.completed)) {
              newData.dailyLogs = {
                ...(data.dailyLogs || {}),
                [todayKey]: {
                  date: todayKey,
                  planId: editingPlanId,
                  meals: plan.meals.map(m => ({ ...m, completed: false }))
                }
              }
            }
            setData(newData)
          }}
          className="btn-primary"
          style={{ position: 'sticky', bottom: '1rem', width: '100%', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
        >
          <Calendar size={20} /> Set as Today's Plan
        </button>
      )}
    </div>
  )
}

export default MealPlanner
