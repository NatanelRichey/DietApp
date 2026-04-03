import { CheckCircle2, Circle, Scale, TrendingDown, TrendingUp, Calendar } from 'lucide-react'
import { subDays, isSameDay } from 'date-fns'
import type { UserData } from '../types'
import { useLocalStorage } from '../hooks/useLocalStorage'

const Dashboard = () => {
  const [data] = useLocalStorage<UserData>('diet-app-data', {
    weightHistory: [],
    dayPlans: {
      'Typical': {
        type: 'Typical',
        meals: [
          { id: '1', name: 'Breakfast', time: '08:00', calories: 450, completed: false },
          { id: '2', name: 'Lunch', time: '13:00', calories: 700, completed: false },
          { id: '3', name: 'Dinner', time: '19:30', calories: 600, completed: false }
        ],
        guidelines: 'Drink 2L water.'
      }
    },
    activePlanId: 'Typical',
    documents: []
  })

  const getWeightChange = (daysAgo: number) => {
    if (data.weightHistory.length === 0) return null
    const todayWeight = data.weightHistory[data.weightHistory.length - 1]?.weight
    const targetDate = subDays(new Date(), daysAgo)
    const pastWeightEntry = data.weightHistory.find(entry => isSameDay(new Date(entry.date), targetDate))
    
    if (!pastWeightEntry) return null
    const diff = todayWeight - pastWeightEntry.weight
    return diff.toFixed(1)
  }

  const lastWeekChange = getWeightChange(7)
  const lastMonthChange = getWeightChange(30)
  
  const currentPlan = data.dayPlans[data.activePlanId]
  const totalCalories = currentPlan.meals.reduce((sum, meal) => sum + meal.calories, 0)

  return (
    <div className="dashboard-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Weight Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Scale size={14} /> Vs Last Week
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', fontWeight: 700 }}>
            {lastWeekChange ? (
              <>
                {parseFloat(lastWeekChange) > 0 ? <TrendingUp color="var(--accent-pink)" /> : <TrendingDown color="var(--accent-green)" />}
                {Math.abs(parseFloat(lastWeekChange))} <span style={{ fontSize: '0.8rem' }}>kg</span>
              </>
            ) : (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No data</span>
            )}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> Vs Last Month
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', fontWeight: 700 }}>
            {lastMonthChange ? (
              <>
                {parseFloat(lastMonthChange) > 0 ? <TrendingUp color="var(--accent-pink)" /> : <TrendingDown color="var(--accent-green)" />}
                {Math.abs(parseFloat(lastMonthChange))} <span style={{ fontSize: '0.8rem' }}>kg</span>
              </>
            ) : (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No data</span>
            )}
          </div>
        </div>
      </div>

      {/* Calorie Progress */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 700 }}>Goal: {totalCalories} kcal</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily planned calories</p>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)' }}>
            0 <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>consumed</span>
          </div>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '0%', background: 'var(--accent-green)', borderRadius: '4px' }} />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Today's Timeline
        </h3>
        <div style={{ position: 'relative', paddingLeft: '1rem' }}>
          {/* Vertical Line */}
          <div style={{ 
            position: 'absolute', 
            left: 'calc(1.5rem + 1px)', 
            top: '0', 
            bottom: '0', 
            width: '2px', 
            background: 'linear-gradient(to bottom, var(--primary), var(--secondary))',
            opacity: 0.3
          }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {currentPlan.meals.map((meal) => (
              <div key={meal.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-card)', padding: '1rem', borderRadius: '1rem', border: 'var(--border-glass)' }}>
                <div style={{ color: 'var(--primary)', zIndex: 1, background: 'var(--bg-deep)', borderRadius: '50%' }}>
                  {meal.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{meal.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{meal.time}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>{meal.calories} kcal</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
