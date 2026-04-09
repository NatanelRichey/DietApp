import { useState, useEffect } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { Plus, Trash2, Calendar, Utensils, Info, Edit2, Save, GripVertical, X, Bookmark, ChevronDown, ChevronUp } from 'lucide-react'
import type { DayPlan, Meal, MealItem, SavedMealTemplate, UserData } from '../types'

interface MealItemProps {
  meal: Meal
  isEditing: boolean
  onEdit: (meal: Meal) => void
  onDelete: (id: string) => void
}

const MealItem = ({ meal, isEditing, onEdit, onDelete }: MealItemProps) => {
  const controls = useDragControls()
  return (
    <Reorder.Item value={meal} dragListener={false} dragControls={controls} as="div" style={{ listStyle: 'none' }}>
      <div
        className="card"
        style={{
          display: 'flex', alignItems: 'center', padding: '0.9rem 1rem',
          gap: '0.8rem', overflow: 'hidden',
          border: isEditing ? '1px solid var(--primary)' : undefined,
          background: isEditing ? 'rgba(100,255,218,0.06)' : undefined,
        }}
      >
        {/* Drag handle */}
        <div
          onPointerDown={(e) => controls.start(e)}
          style={{ cursor: 'grab', touchAction: 'none', color: 'var(--text-muted)', opacity: 0.45, flexShrink: 0, display: 'flex', alignItems: 'center' }}
        >
          <GripVertical size={18} />
        </div>

        {/* Meal info — tap to edit */}
        <div
          onClick={() => onEdit(meal)}
          style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <div style={{ background: isEditing ? 'rgba(100,255,218,0.2)' : 'rgba(100,255,218,0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '0.8rem', flexShrink: 0 }}>
            <Utensils size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--primary)' }}>{meal.time}</span> · {meal.calories} kcal{meal.protein !== undefined ? ` · ${meal.protein}g protein` : ''}{(meal.items?.length ?? 0) > 0 ? ` · ${meal.items!.length} items` : ''}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(meal.id) }}
          style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer', flexShrink: 0 }}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </Reorder.Item>
  )
}

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
  const [newMeal, setNewMeal] = useState({ name: '', time: '12:00', calories: '', protein: '' })
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState({ name: '', calories: '', protein: '' })

  const [savedMealsExpanded, setSavedMealsExpanded] = useState(false)
  const [plannerTab, setPlannerTab] = useState<'plans' | 'meals'>('plans')
  const [addToPlanTarget, setAddToPlanTarget] = useState('')
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null) // null = new
  const [templateFormOpen, setTemplateFormOpen] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: '', time: '08:00', calories: '', protein: '' })
  const [templateItems, setTemplateItems] = useState<MealItem[]>([])
  const [newTemplateItem, setNewTemplateItem] = useState({ name: '', calories: '', protein: '' })

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
    setEditingMealId(null)
    setNewMeal({ name: '', time: '12:00', calories: '', protein: '' })
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

  const saveMeal = () => {
    if (!newMeal.name || !newMeal.calories) return
    const parsedProtein = newMeal.protein ? parseFloat(newMeal.protein) : undefined
    if (editingMealId) {
      const updatedMeals = currentPlan.meals.map(m =>
        m.id === editingMealId
          ? { ...m, name: newMeal.name, time: newMeal.time, calories: parseInt(newMeal.calories), protein: parsedProtein }
          : m
      )
      updatePlan({ ...currentPlan, meals: updatedMeals })
      setEditingMealId(null)
    } else {
      const meal: Meal = {
        id: Math.random().toString(36).substr(2, 9),
        name: newMeal.name,
        time: newMeal.time,
        calories: parseInt(newMeal.calories),
        protein: parsedProtein,
        completed: false
      }
      const updatedMeals = [...currentPlan.meals, meal].sort((a, b) => a.time.localeCompare(b.time))
      updatePlan({ ...currentPlan, meals: updatedMeals })
    }
    setNewMeal({ name: '', time: '12:00', calories: '', protein: '' })
  }

  const startEditMeal = (meal: Meal) => {
    setEditingMealId(meal.id)
    setNewMeal({ name: meal.name, time: meal.time, calories: String(meal.calories), protein: meal.protein !== undefined ? String(meal.protein) : '' })
  }

  const cancelEdit = () => {
    setEditingMealId(null)
    setNewMeal({ name: '', time: '12:00', calories: '', protein: '' })
    setNewItem({ name: '', calories: '', protein: '' })
  }

  const addItemToMeal = () => {
    if (!newItem.name || !newItem.calories || !editingMealId) return
    const item: MealItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      calories: parseInt(newItem.calories),
      protein: newItem.protein ? parseFloat(newItem.protein) : undefined,
    }
    const meal = currentPlan.meals.find(m => m.id === editingMealId)!
    const updatedItems = [...(meal.items || []), item]
    const totalCal  = updatedItems.reduce((s, it) => s + it.calories, 0)
    const totalProt = updatedItems.reduce((s, it) => s + (it.protein ?? 0), 0)
    const updatedMeals = currentPlan.meals.map(m =>
      m.id === editingMealId
        ? { ...m, items: updatedItems, calories: totalCal, protein: totalProt || undefined }
        : m
    )
    updatePlan({ ...currentPlan, meals: updatedMeals })
    setNewMeal(prev => ({ ...prev, calories: String(totalCal), protein: totalProt ? String(totalProt) : '' }))
    setNewItem({ name: '', calories: '', protein: '' })
  }

  const removeItemFromMeal = (itemId: string) => {
    if (!editingMealId) return
    const meal = currentPlan.meals.find(m => m.id === editingMealId)!
    const updatedItems = (meal.items || []).filter(i => i.id !== itemId)
    const totalCal  = updatedItems.reduce((s, it) => s + it.calories, 0)
    const totalProt = updatedItems.reduce((s, it) => s + (it.protein ?? 0), 0)
    const updatedMeals = currentPlan.meals.map(m =>
      m.id === editingMealId
        ? { ...m, items: updatedItems, calories: updatedItems.length ? totalCal : m.calories, protein: updatedItems.length && totalProt ? totalProt : m.protein }
        : m
    )
    updatePlan({ ...currentPlan, meals: updatedMeals })
    if (updatedItems.length) setNewMeal(prev => ({ ...prev, calories: String(totalCal), protein: totalProt ? String(totalProt) : '' }))
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

  const saveToLibrary = () => {
    if (!newMeal.name || !newMeal.calories) return
    const template: SavedMealTemplate = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMeal.name,
      time: newMeal.time,
      calories: parseInt(newMeal.calories),
      protein: newMeal.protein ? parseFloat(newMeal.protein) : undefined,
      items: editingMealId ? (currentPlan.meals.find(m => m.id === editingMealId)?.items) : undefined,
    }
    setData({ ...data, savedMealTemplates: [...(data.savedMealTemplates || []), template] })
  }

  const addFromLibrary = (template: SavedMealTemplate, targetPlanId?: string) => {
    const meal: Meal = {
      id: Math.random().toString(36).substr(2, 9),
      name: template.name,
      time: template.time,
      calories: template.calories,
      protein: template.protein,
      items: template.items ? template.items.map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) })) : undefined,
      completed: false,
    }
    const pid = targetPlanId || editingPlanId
    const plan = data.dayPlans[pid] || { type: pid, meals: [], guidelines: '' }
    const updatedMeals = [...plan.meals, meal].sort((a, b) => a.time.localeCompare(b.time))
    const updatedPlan = { ...plan, meals: updatedMeals }
    setData({ ...data, dayPlans: { ...data.dayPlans, [pid]: updatedPlan } })
  }

  const deleteFromLibrary = (id: string) => {
    setData({ ...data, savedMealTemplates: (data.savedMealTemplates || []).filter(t => t.id !== id) })
  }

  const openNewTemplate = () => {
    setEditingTemplateId(null)
    setTemplateForm({ name: '', time: '08:00', calories: '', protein: '' })
    setTemplateItems([])
    setNewTemplateItem({ name: '', calories: '', protein: '' })
    setTemplateFormOpen(true)
  }

  const openEditTemplate = (t: import('../types').SavedMealTemplate) => {
    setEditingTemplateId(t.id)
    setTemplateForm({ name: t.name, time: t.time, calories: String(t.calories), protein: t.protein !== undefined ? String(t.protein) : '' })
    setTemplateItems(t.items ? t.items.map(i => ({ ...i })) : [])
    setNewTemplateItem({ name: '', calories: '', protein: '' })
    setTemplateFormOpen(true)
  }

  const addTemplateItem = () => {
    if (!newTemplateItem.name || !newTemplateItem.calories) return
    const item: MealItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTemplateItem.name,
      calories: parseInt(newTemplateItem.calories),
      protein: newTemplateItem.protein ? parseFloat(newTemplateItem.protein) : undefined,
    }
    const updated = [...templateItems, item]
    setTemplateItems(updated)
    setTemplateForm(f => ({
      ...f,
      calories: String(updated.reduce((s, i) => s + i.calories, 0)),
      protein: String(updated.reduce((s, i) => s + (i.protein ?? 0), 0) || ''),
    }))
    setNewTemplateItem({ name: '', calories: '', protein: '' })
  }

  const removeTemplateItem = (id: string) => {
    const updated = templateItems.filter(i => i.id !== id)
    setTemplateItems(updated)
    if (updated.length) {
      setTemplateForm(f => ({
        ...f,
        calories: String(updated.reduce((s, i) => s + i.calories, 0)),
        protein: String(updated.reduce((s, i) => s + (i.protein ?? 0), 0) || ''),
      }))
    }
  }

  const saveTemplate = () => {
    if (!templateForm.name || !templateForm.calories) return
    const template: SavedMealTemplate = {
      id: editingTemplateId || Math.random().toString(36).substr(2, 9),
      name: templateForm.name,
      time: templateForm.time,
      calories: parseInt(templateForm.calories),
      protein: templateForm.protein ? parseFloat(templateForm.protein) : undefined,
      items: templateItems.length > 0 ? templateItems : undefined,
    }
    const existing = data.savedMealTemplates || []
    const updated = editingTemplateId
      ? existing.map(t => t.id === editingTemplateId ? template : t)
      : [...existing, template]
    setData({ ...data, savedMealTemplates: updated })
    setTemplateFormOpen(false)
    setEditingTemplateId(null)
  }

  const totalCalories = currentPlan.meals.reduce((sum, m) => sum + m.calories, 0)
  const totalProtein  = currentPlan.meals.reduce((sum, m) => sum + (m.protein ?? 0), 0)

  return (
    <div className="meal-planner" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '0.3rem' }}>
        {(['plans', 'meals'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setPlannerTab(tab)}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
              background: plannerTab === tab ? 'var(--primary)' : 'transparent',
              color: plannerTab === tab ? 'var(--bg-deep)' : 'var(--text-muted)',
              transition: 'all 0.15s ease', textTransform: 'capitalize',
            }}
          >
            {tab === 'plans' ? 'Plans' : `Meals${(data.savedMealTemplates?.length ?? 0) > 0 ? ` (${data.savedMealTemplates!.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── MEALS TAB ── */}
      {plannerTab === 'meals' && (() => {
        const templates = data.savedMealTemplates || []
        const planKeys = Object.keys(data.dayPlans)
        const targetPlan = addToPlanTarget || editingPlanId || planKeys[0] || ''
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Create/Edit form */}
            {templateFormOpen ? (
              <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{editingTemplateId ? 'Edit Meal' : 'New Saved Meal'}</h3>
                  <button onClick={() => setTemplateFormOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="text" placeholder="Meal name"
                    value={templateForm.name}
                    onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                    className="glass"
                    style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="time" value={templateForm.time}
                      onChange={e => setTemplateForm(f => ({ ...f, time: e.target.value }))}
                      className="glass" style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: '0 0 auto' }} />
                    <input type="number" placeholder="Calories"
                      value={templateForm.calories}
                      onChange={e => setTemplateForm(f => ({ ...f, calories: e.target.value }))}
                      className="glass" style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '80px' }} />
                    <input type="number" placeholder="Protein (g)"
                      value={templateForm.protein}
                      onChange={e => setTemplateForm(f => ({ ...f, protein: e.target.value }))}
                      className="glass" style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '80px' }} />
                  </div>
                </div>

                {/* Items */}
                {templateItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {templateItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.6rem' }}>
                        <div style={{ flex: 1, fontSize: '0.85rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.calories} kcal{item.protein ? ` · ${item.protein}g` : ''}</div>
                        <button onClick={() => removeTemplateItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer', padding: 0 }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Item name"
                    value={newTemplateItem.name}
                    onChange={e => setNewTemplateItem(i => ({ ...i, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addTemplateItem()}
                    className="glass" style={{ padding: '0.6rem 0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 2, minWidth: '100px', fontSize: '0.85rem' }} />
                  <input type="number" placeholder="kcal"
                    value={newTemplateItem.calories}
                    onChange={e => setNewTemplateItem(i => ({ ...i, calories: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addTemplateItem()}
                    className="glass" style={{ padding: '0.6rem 0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '60px', fontSize: '0.85rem' }} />
                  <input type="number" placeholder="g protein"
                    value={newTemplateItem.protein}
                    onChange={e => setNewTemplateItem(i => ({ ...i, protein: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addTemplateItem()}
                    className="glass" style={{ padding: '0.6rem 0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '70px', fontSize: '0.85rem' }} />
                  <button onClick={addTemplateItem} className="btn-primary" style={{ flexShrink: 0, padding: '0.6rem 0.9rem' }}><Plus size={16} /></button>
                </div>
                <button onClick={saveTemplate} className="btn-primary" style={{ justifyContent: 'center' }}>
                  <Save size={16} /> {editingTemplateId ? 'Save Changes' : 'Create Meal'}
                </button>
              </div>
            ) : (
              <button onClick={openNewTemplate} className="btn-primary" style={{ justifyContent: 'center', background: 'rgba(100,255,218,0.12)', border: '1px solid rgba(100,255,218,0.3)', color: 'var(--primary)' }}>
                <Plus size={18} /> New Saved Meal
              </button>
            )}

            {templates.length === 0 && !templateFormOpen && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No saved meals yet. Create one above or bookmark a meal from the Plans tab.
              </div>
            )}

            {templates.length > 0 && !templateFormOpen && (
              <>
                {/* Plan target selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span style={{ flexShrink: 0 }}>Add to:</span>
                  <select
                    value={targetPlan}
                    onChange={e => setAddToPlanTarget(e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.07)', border: 'var(--border-glass)', borderRadius: '0.6rem', color: 'var(--text-main)', fontSize: '0.82rem' }}
                  >
                    {planKeys.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                {/* Template cards */}
                {templates.map(template => {
                  const isExpanded = expandedTemplateId === template.id
                  return (
                    <div key={template.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.85rem 1rem' }}>
                        <div
                          style={{ background: 'rgba(100,255,218,0.1)', color: 'var(--primary)', padding: '0.45rem', borderRadius: '0.7rem', flexShrink: 0, cursor: (template.items?.length ?? 0) > 0 ? 'pointer' : 'default' }}
                          onClick={() => (template.items?.length ?? 0) > 0 && setExpandedTemplateId(isExpanded ? null : template.id)}
                        >
                          <Utensils size={16} />
                        </div>
                        <div
                          style={{ flex: 1, minWidth: 0, cursor: (template.items?.length ?? 0) > 0 ? 'pointer' : 'default' }}
                          onClick={() => (template.items?.length ?? 0) > 0 && setExpandedTemplateId(isExpanded ? null : template.id)}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.name}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--primary)' }}>{template.time}</span> · {template.calories} kcal
                            {template.protein !== undefined ? ` · ${template.protein}g protein` : ''}
                            {(template.items?.length ?? 0) > 0 ? ` · ${template.items!.length} items` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => addFromLibrary(template, targetPlan)}
                          title={`Add to ${targetPlan}`}
                          style={{ background: 'rgba(100,255,218,0.12)', border: '1px solid rgba(100,255,218,0.3)', color: 'var(--primary)', borderRadius: '0.6rem', padding: '0.35rem 0.65rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}
                        >
                          + Add
                        </button>
                        <button
                          onClick={() => openEditTemplate(template)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', opacity: 0.7, cursor: 'pointer', flexShrink: 0, padding: 0 }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => deleteFromLibrary(template.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer', flexShrink: 0, padding: 0 }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {isExpanded && (template.items?.length ?? 0) > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.5rem 1rem 0.75rem' }}>
                          {template.items!.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-main)' }}>{item.name}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{item.calories} kcal{item.protein ? ` · ${item.protein}g` : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )
      })()}

      {/* ── PLANS TAB ── */}
      {plannerTab === 'plans' && <>
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
            {totalProtein > 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalProtein}g protein</div>}
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

      {/* Add / Edit Meal Form */}
      <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: editingMealId ? '1px solid var(--primary)' : undefined }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {editingMealId ? 'Edit Meal' : 'Add Scheduled Meal'}
          {editingMealId && (
            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
              <X size={18} />
            </button>
          )}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Meal name (e.g. Smoothie)"
            value={newMeal.name}
            onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
            className="glass"
            style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', width: '100%' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
              style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '80px' }}
            />
            <input
              type="number"
              placeholder="Protein (g)"
              value={newMeal.protein}
              onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
              className="glass"
              style={{ padding: '0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '80px' }}
            />
            <button onClick={saveMeal} className="btn-primary" style={{ flexShrink: 0, flex: '1 0 auto' }}>
              {editingMealId ? <Save size={18} /> : <Plus size={18} />}
              {editingMealId ? 'Save' : 'Add'}
            </button>
            <button
              onClick={saveToLibrary}
              title="Save to meal library"
              style={{ flexShrink: 0, background: 'rgba(100,255,218,0.1)', border: '1px solid rgba(100,255,218,0.3)', color: 'var(--primary)', borderRadius: '0.8rem', padding: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Bookmark size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Food Items (shown when editing a meal) */}
      {editingMealId && (() => {
        const editingMeal = currentPlan.meals.find(m => m.id === editingMealId)
        const items = editingMeal?.items || []
        return (
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--primary)' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary)' }}>Food Items</h3>
            {items.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.6rem' }}>
                    <div style={{ flex: 1, fontSize: '0.85rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {item.calories} kcal{item.protein ? ` · ${item.protein}g` : ''}
                    </div>
                    <button onClick={() => removeItemFromMeal(item.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Item name"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addItemToMeal()}
                className="glass"
                style={{ padding: '0.6rem 0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 2, minWidth: '100px', fontSize: '0.85rem' }}
              />
              <input
                type="number"
                placeholder="kcal"
                value={newItem.calories}
                onChange={e => setNewItem({ ...newItem, calories: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addItemToMeal()}
                className="glass"
                style={{ padding: '0.6rem 0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '60px', fontSize: '0.85rem' }}
              />
              <input
                type="number"
                placeholder="g protein"
                value={newItem.protein}
                onChange={e => setNewItem({ ...newItem, protein: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addItemToMeal()}
                className="glass"
                style={{ padding: '0.6rem 0.8rem', borderRadius: '0.8rem', border: 'var(--border-glass)', color: 'var(--text-main)', flex: 1, minWidth: '70px', fontSize: '0.85rem' }}
              />
              <button onClick={addItemToMeal} className="btn-primary" style={{ flexShrink: 0, padding: '0.6rem 0.9rem' }}>
                <Plus size={16} />
              </button>
            </div>
            {items.length > 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Total: {items.reduce((s, i) => s + i.calories, 0)} kcal · {items.reduce((s, i) => s + (i.protein ?? 0), 0)}g protein
              </div>
            )}
          </div>
        )
      })()}

      {/* Saved Meal Library */}
      {(data.savedMealTemplates?.length ?? 0) > 0 && (
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => setSavedMealsExpanded(e => !e)}
            style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: 0, color: 'var(--text-main)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
              <Bookmark size={16} color="var(--primary)" /> Saved Meals ({data.savedMealTemplates!.length})
            </div>
            {savedMealsExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
          </button>
          {savedMealsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.savedMealTemplates!.map(template => (
                <div key={template.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.8rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--primary)' }}>{template.time}</span> · {template.calories} kcal{template.protein !== undefined ? ` · ${template.protein}g protein` : ''}{(template.items?.length ?? 0) > 0 ? ` · ${template.items!.length} items` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => addFromLibrary(template)}
                    title="Add to this plan"
                    style={{ background: 'rgba(100,255,218,0.12)', border: '1px solid rgba(100,255,218,0.3)', color: 'var(--primary)', borderRadius: '0.6rem', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}
                  >
                    + Add
                  </button>
                  <button
                    onClick={() => deleteFromLibrary(template.id)}
                    title="Remove from library"
                    style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer', flexShrink: 0, padding: 0 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scheduled Meals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Schedule</h3>
        {currentPlan.meals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No meals scheduled for this day type.</div>
        ) : (
          <Reorder.Group
            axis="y"
            values={currentPlan.meals}
            onReorder={(newOrder) => updatePlan({ ...currentPlan, meals: newOrder })}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', listStyle: 'none', padding: 0, margin: 0 }}
          >
            {currentPlan.meals.map(meal => (
              <MealItem
                key={meal.id}
                meal={meal}
                isEditing={editingMealId === meal.id}
                onEdit={startEditMeal}
                onDelete={deleteMeal}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      </>}
    </div>
  )
}

export default MealPlanner
