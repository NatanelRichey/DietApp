import { useState, useEffect } from 'react'
import type { DayPlan, Meal, MealItem, SavedMealTemplate, UserData } from '../../types'
import PlansTab from './PlansTab'
import MealsTab from './MealsTab'

interface MealPlannerProps {
  user: string
  data: UserData
  setData: (d: UserData) => void
  loading: boolean
}

export interface ItemForm {
  name: string
  calories: string
  protein: string
}

export interface PlannerStore {
  // Data
  data: UserData
  currentPlan: DayPlan
  editingPlanId: string
  editingMealId: string | null
  newMeal: { name: string; time: string; calories: string; protein: string }
  newItem: ItemForm
  savedMealsExpanded: boolean
  addToPlanTarget: string
  expandedTemplateId: string | null
  editingTemplateId: string | null
  templateFormOpen: boolean
  templateForm: { name: string; time: string; calories: string; protein: string }
  templateItems: MealItem[]
  newTemplateItem: ItemForm
  editingItemId: string | null
  editItemForm: ItemForm
  editingTemplateItemId: string | null
  editTemplateItemForm: ItemForm
  selectedDays: number[]
  scheduleDirty: boolean
  totalCalories: number
  totalProtein: number
  // Actions
  setEditingPlanId: (id: string) => void
  setNewMeal: (m: { name: string; time: string; calories: string; protein: string }) => void
  setNewItem: (i: ItemForm) => void
  setSavedMealsExpanded: (v: boolean | ((prev: boolean) => boolean)) => void
  setAddToPlanTarget: (v: string) => void
  setExpandedTemplateId: (id: string | null) => void
  setTemplateFormOpen: (v: boolean) => void
  setTemplateForm: (f: { name: string; time: string; calories: string; protein: string } | ((prev: { name: string; time: string; calories: string; protein: string }) => { name: string; time: string; calories: string; protein: string })) => void
  setTemplateItems: (items: MealItem[]) => void
  setNewTemplateItem: (i: ItemForm | ((prev: ItemForm) => ItemForm)) => void
  setEditingItemId: (id: string | null) => void
  setEditItemForm: (f: ItemForm) => void
  setEditingTemplateItemId: (id: string | null) => void
  setEditTemplateItemForm: (f: ItemForm) => void
  updatePlan: (updatedPlan: DayPlan) => void
  saveMeal: () => void
  startEditMeal: (meal: Meal) => void
  cancelEdit: () => void
  addItemToMeal: () => void
  removeItemFromMeal: (itemId: string) => void
  deleteMeal: (id: string) => void
  startEditItem: (item: MealItem) => void
  saveEditItem: () => void
  reorderItemsInMeal: (newItems: MealItem[]) => void
  startEditTemplateItem: (item: MealItem) => void
  saveEditTemplateItem: () => void
  reorderTemplateItems: (newItems: MealItem[]) => void
  deletePlanType: (planId: string) => void
  renameDayType: (oldName: string) => void
  saveToLibrary: () => void
  addFromLibrary: (template: SavedMealTemplate, targetPlanId?: string) => void
  deleteFromLibrary: (id: string) => void
  openNewTemplate: () => void
  openEditTemplate: (t: SavedMealTemplate) => void
  addTemplateItem: () => void
  removeTemplateItem: (id: string) => void
  saveTemplate: () => void
  toggleDay: (day: number) => void
  saveSchedule: () => void
  addNewPlanType: (name: string) => void
}

const MealPlanner = ({ data, setData, loading }: MealPlannerProps) => {
  const [editingPlanId, setEditingPlanId] = useState(() => {
    const keys = Object.keys(data.dayPlans)
    return keys.includes(data.activePlanId) ? data.activePlanId : (keys[0] || '')
  })
  const currentPlan = data.dayPlans[editingPlanId] || { type: editingPlanId, meals: [], guidelines: '' }
  const [newMeal, setNewMeal] = useState({ name: '', time: '12:00', calories: '', protein: '' })
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<ItemForm>({ name: '', calories: '', protein: '' })

  const [savedMealsExpanded, setSavedMealsExpanded] = useState(false)
  const [plannerTab, setPlannerTab] = useState<'plans' | 'meals'>('plans')
  const [addToPlanTarget, setAddToPlanTarget] = useState('')
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateFormOpen, setTemplateFormOpen] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: '', time: '08:00', calories: '', protein: '' })
  const [templateItems, setTemplateItems] = useState<MealItem[]>([])
  const [newTemplateItem, setNewTemplateItem] = useState<ItemForm>({ name: '', calories: '', protein: '' })
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemForm, setEditItemForm] = useState<ItemForm>({ name: '', calories: '', protein: '' })
  const [editingTemplateItemId, setEditingTemplateItemId] = useState<string | null>(null)
  const [editTemplateItemForm, setEditTemplateItemForm] = useState<ItemForm>({ name: '', calories: '', protein: '' })

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

  const totalCalories = currentPlan.meals.reduce((sum, m) => sum + m.calories, 0)
  const totalProtein  = currentPlan.meals.reduce((sum, m) => sum + (m.protein ?? 0), 0)

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

  const startEditItem = (item: MealItem) => {
    setEditingItemId(item.id)
    setEditItemForm({ name: item.name, calories: String(item.calories), protein: item.protein !== undefined ? String(item.protein) : '' })
  }

  const saveEditItem = () => {
    if (!editingItemId || !editItemForm.name || !editItemForm.calories || !editingMealId) return
    const meal = currentPlan.meals.find(m => m.id === editingMealId)!
    const updatedItems = (meal.items || []).map(i =>
      i.id === editingItemId
        ? { ...i, name: editItemForm.name, calories: parseInt(editItemForm.calories), protein: editItemForm.protein ? parseFloat(editItemForm.protein) : undefined }
        : i
    )
    const totalCal  = updatedItems.reduce((s, it) => s + it.calories, 0)
    const totalProt = updatedItems.reduce((s, it) => s + (it.protein ?? 0), 0)
    const updatedMeals = currentPlan.meals.map(m =>
      m.id === editingMealId ? { ...m, items: updatedItems, calories: totalCal, protein: totalProt || undefined } : m
    )
    updatePlan({ ...currentPlan, meals: updatedMeals })
    setNewMeal(prev => ({ ...prev, calories: String(totalCal), protein: totalProt ? String(totalProt) : '' }))
    setEditingItemId(null)
  }

  const reorderItemsInMeal = (newItems: MealItem[]) => {
    if (!editingMealId) return
    const totalCal  = newItems.reduce((s, it) => s + it.calories, 0)
    const totalProt = newItems.reduce((s, it) => s + (it.protein ?? 0), 0)
    const updatedMeals = currentPlan.meals.map(m =>
      m.id === editingMealId
        ? { ...m, items: newItems, calories: newItems.length ? totalCal : m.calories, protein: newItems.length && totalProt ? totalProt : m.protein }
        : m
    )
    updatePlan({ ...currentPlan, meals: updatedMeals })
  }

  const startEditTemplateItem = (item: MealItem) => {
    setEditingTemplateItemId(item.id)
    setEditTemplateItemForm({ name: item.name, calories: String(item.calories), protein: item.protein !== undefined ? String(item.protein) : '' })
  }

  const saveEditTemplateItem = () => {
    if (!editingTemplateItemId || !editTemplateItemForm.name || !editTemplateItemForm.calories) return
    const updated = templateItems.map(i =>
      i.id === editingTemplateItemId
        ? { ...i, name: editTemplateItemForm.name, calories: parseInt(editTemplateItemForm.calories), protein: editTemplateItemForm.protein ? parseFloat(editTemplateItemForm.protein) : undefined }
        : i
    )
    setTemplateItems(updated)
    setTemplateForm(f => ({
      ...f,
      calories: String(updated.reduce((s, i) => s + i.calories, 0)),
      protein: String(updated.reduce((s, i) => s + (i.protein ?? 0), 0) || ''),
    }))
    setEditingTemplateItemId(null)
  }

  const reorderTemplateItems = (newItems: MealItem[]) => {
    setTemplateItems(newItems)
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
      templateId: template.id,
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

  const openEditTemplate = (t: SavedMealTemplate) => {
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
    const updatedTemplates = editingTemplateId
      ? existing.map(t => t.id === editingTemplateId ? template : t)
      : [...existing, template]

    let updatedPlans = data.dayPlans
    if (editingTemplateId) {
      const newPlans: Record<string, DayPlan> = {}
      Object.entries(data.dayPlans).forEach(([planId, plan]) => {
        const updatedMeals = plan.meals.map(m =>
          m.templateId === editingTemplateId
            ? { ...m, name: template.name, time: template.time, calories: template.calories, protein: template.protein,
                items: template.items ? template.items.map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) })) : m.items }
            : m
        )
        newPlans[planId] = { ...plan, meals: updatedMeals }
      })
      updatedPlans = newPlans
    }

    setData({ ...data, savedMealTemplates: updatedTemplates, dayPlans: updatedPlans })
    setTemplateFormOpen(false)
    setEditingTemplateId(null)
  }

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

  const addNewPlanType = (name: string) => {
    setData({
      ...data,
      dayPlans: { ...data.dayPlans, [name]: { type: name, meals: [], guidelines: '' } }
    })
    setEditingPlanId(name)
  }

  const store: PlannerStore = {
    data,
    currentPlan,
    editingPlanId,
    editingMealId,
    newMeal,
    newItem,
    savedMealsExpanded,
    addToPlanTarget,
    expandedTemplateId,
    editingTemplateId,
    templateFormOpen,
    templateForm,
    templateItems,
    newTemplateItem,
    editingItemId,
    editItemForm,
    editingTemplateItemId,
    editTemplateItemForm,
    selectedDays,
    scheduleDirty,
    totalCalories,
    totalProtein,
    setEditingPlanId,
    setNewMeal,
    setNewItem,
    setSavedMealsExpanded,
    setAddToPlanTarget,
    setExpandedTemplateId,
    setTemplateFormOpen,
    setTemplateForm,
    setTemplateItems,
    setNewTemplateItem,
    setEditingItemId,
    setEditItemForm,
    setEditingTemplateItemId,
    setEditTemplateItemForm,
    updatePlan,
    saveMeal,
    startEditMeal,
    cancelEdit,
    addItemToMeal,
    removeItemFromMeal,
    deleteMeal,
    startEditItem,
    saveEditItem,
    reorderItemsInMeal,
    startEditTemplateItem,
    saveEditTemplateItem,
    reorderTemplateItems,
    deletePlanType,
    renameDayType,
    saveToLibrary,
    addFromLibrary,
    deleteFromLibrary,
    openNewTemplate,
    openEditTemplate,
    addTemplateItem,
    removeTemplateItem,
    saveTemplate,
    toggleDay,
    saveSchedule,
    addNewPlanType,
  }

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

      {plannerTab === 'meals' && <MealsTab store={store} />}
      {plannerTab === 'plans' && <PlansTab store={store} />}
    </div>
  )
}

export default MealPlanner
