import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { SimCartData, SimSavedMeal, SimMealItem } from '../../types'
import AddItemRow from './AddItemRow'
import { uid } from './simcartUtils'

interface Props {
  simCart: SimCartData
  onUpdate: (data: SimCartData) => void
}

// ─── Meal Card ────────────────────────────────────────────────────────────────

function SavedMealCard({
  meal, foodItems, isExpanded, isEditing, editName,
  onToggle, onStartEdit, onEditNameChange, onSaveEdit, onCancelEdit, onDelete,
  onAddItem, onRemoveItem,
}: {
  meal: SimSavedMeal
  foodItems: { id: string; name: string }[]
  isExpanded: boolean
  isEditing: boolean
  editName: string
  onToggle: () => void
  onStartEdit: () => void
  onEditNameChange: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onAddItem: (item: SimMealItem) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
    <div className="card" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}>
        {isEditing ? (
          <>
            <input
              value={editName}
              onChange={e => onEditNameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit() }}
              autoFocus
              style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--primary)', borderRadius: '0.5rem', padding: '0.35rem 0.6rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}
            />
            <button onClick={onSaveEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', padding: '0.2rem' }}>
              <Check size={17} />
            </button>
            <button onClick={onCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.2rem' }}>
              <X size={17} />
            </button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontWeight: 600, fontSize: '0.93rem' }}>{meal.name}</span>
            {meal.items.length > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {meal.items.length} item{meal.items.length !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={onStartEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.2rem' }}>
              <Edit2 size={14} />
            </button>
            <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.2rem' }}>
              {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-pink)', display: 'flex', padding: '0.2rem' }}>
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 0.75rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>

              {meal.items.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
                  No items yet. Add some below.
                </div>
              )}

              {meal.items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.38rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem' }}>
                  <span style={{ flex: 1, fontSize: '0.87rem' }}>
                    {item.name}
                    {item.quantity && <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{item.quantity}</span>}
                  </span>
                  <button onClick={() => onRemoveItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}

              <AddItemRow
                foodItems={foodItems}
                onCommit={(name, quantity) => onAddItem({ id: uid(), name, quantity })}
              />

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const SimPlanner = ({ simCart, onUpdate }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName]       = useState('')
  const [newItems, setNewItems]     = useState<SimMealItem[]>([])

  const { savedMeals, foodItems } = simCart

  const updateMeals = (meals: SimSavedMeal[]) =>
    onUpdate({ ...simCart, savedMeals: meals })

  const createMeal = () => {
    if (!newName.trim()) return
    const updatedFoodItems = [...foodItems]
    newItems.forEach(item => {
      if (!updatedFoodItems.some(f => f.name.toLowerCase() === item.name.toLowerCase())) {
        updatedFoodItems.push({ id: uid(), name: item.name })
      }
    })
    onUpdate({
      ...simCart,
      savedMeals: [...savedMeals, { id: uid(), name: newName.trim(), items: newItems, createdAt: new Date().toISOString() }],
      foodItems: updatedFoodItems,
    })
    setNewName('')
    setNewItems([])
    setShowCreate(false)
  }

  const deleteMeal = (id: string) => updateMeals(savedMeals.filter(m => m.id !== id))

  const saveEdit = (id: string) => {
    if (!editName.trim()) return
    updateMeals(savedMeals.map(m => m.id === id ? { ...m, name: editName.trim() } : m))
    setEditingId(null)
  }

  const addItemToMeal = (mealId: string, item: SimMealItem) => {
    const exists = foodItems.some(f => f.name.toLowerCase() === item.name.toLowerCase())
    onUpdate({
      ...simCart,
      foodItems: exists ? foodItems : [...foodItems, { id: uid(), name: item.name }],
      savedMeals: savedMeals.map(m => m.id === mealId ? { ...m, items: [...m.items, item] } : m),
    })
  }

  const removeItemFromMeal = (mealId: string, itemId: string) =>
    updateMeals(savedMeals.map(m =>
      m.id === mealId ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m
    ))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Saved Meals</h2>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.85rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none', color: 'var(--bg-deep)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <Plus size={15} /> New Meal
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="card" style={{ borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>New Saved Meal</div>

              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Meal name…"
                autoFocus
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.6rem', padding: '0.55rem 0.7rem', color: 'var(--text-main)', fontSize: '0.9rem' }}
              />

              {newItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.38rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ flex: 1 }}>
                    {item.name}
                    {item.quantity && <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{item.quantity}</span>}
                  </span>
                  <button onClick={() => setNewItems(p => p.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}

              <AddItemRow
                foodItems={foodItems}
                onCommit={(name, quantity) => setNewItems(p => [...p, { id: uid(), name, quantity }])}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); setNewItems([]) }}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  onClick={createMeal}
                  disabled={!newName.trim()}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '0.6rem', background: newName.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.06)', border: 'none', color: newName.trim() ? 'var(--bg-deep)' : 'var(--text-muted)', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {savedMeals.length === 0 && !showCreate ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '2.5rem 0' }}>
          No saved meals yet.<br />
          <span style={{ fontSize: '0.8rem' }}>Create one to reuse across your daily logs.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {savedMeals.map(meal => (
            <SavedMealCard
              key={meal.id}
              meal={meal}
              foodItems={foodItems}
              isExpanded={expandedId === meal.id}
              isEditing={editingId === meal.id}
              editName={editingId === meal.id ? editName : meal.name}
              onToggle={() => setExpandedId(prev => prev === meal.id ? null : meal.id)}
              onStartEdit={() => { setEditingId(meal.id); setEditName(meal.name) }}
              onEditNameChange={setEditName}
              onSaveEdit={() => saveEdit(meal.id)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => deleteMeal(meal.id)}
              onAddItem={item => addItemToMeal(meal.id, item)}
              onRemoveItem={itemId => removeItemFromMeal(meal.id, itemId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default SimPlanner