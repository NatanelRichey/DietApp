import { useState } from 'react'
import { format, addDays, subDays, isToday as fnsIsToday } from 'date-fns'
import {
  ChevronLeft, ChevronRight, GripVertical, Trash2,
  ChevronDown, ChevronUp, X, BookOpen
} from 'lucide-react'
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion'
import type { SimCartData, SimMealEntry, SimMealSlotType, SimMealItem, SimSavedMeal } from '../../types'
import AddItemRow from './AddItemRow'
import { uid } from './simcartUtils'

interface Props {
  simCart: SimCartData
  onUpdate: (data: SimCartData) => void
}

const SLOT_COLOR: Record<SimMealSlotType, string> = {
  breakfast: '#fb923c',
  lunch:     '#34d399',
  dinner:    '#818cf8',
  snack:     '#64ffda',
}

const SLOT_LABEL: Record<SimMealSlotType, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snack:     'Snack',
}

/**
 * Insert a new entry at the correct position.
 * Snacks/Dinner always append. Breakfast goes before any lunch/dinner.
 * Lunch goes before dinner, or after breakfast if no dinner yet.
 * This preserves snacks that were added earlier as "before" the fixed meal.
 */
function insertEntry(entries: SimMealEntry[], entry: SimMealEntry): SimMealEntry[] {
  const arr = [...entries]

  if (entry.slotType === 'snack' || entry.slotType === 'dinner') {
    arr.push(entry)
    return arr
  }

  if (entry.slotType === 'breakfast') {
    const lIdx = arr.findIndex(e => e.slotType === 'lunch')
    const dIdx = arr.findIndex(e => e.slotType === 'dinner')
    const candidates = [lIdx, dIdx].filter(i => i !== -1)
    if (candidates.length > 0) arr.splice(Math.min(...candidates), 0, entry)
    else arr.push(entry)
    return arr
  }

  // lunch
  const dIdx = arr.findIndex(e => e.slotType === 'dinner')
  if (dIdx !== -1) {
    arr.splice(dIdx, 0, entry)
    return arr
  }
  const bIdx = arr.findIndex(e => e.slotType === 'breakfast')
  if (bIdx !== -1) arr.splice(bIdx + 1, 0, entry)
  else arr.push(entry)
  return arr
}

// ─── Meal Slot Card ───────────────────────────────────────────────────────────

function MealSlotCard({
  entry, savedMeals, foodItems,
  isExpanded, onToggleExpand, onDelete,
  onAddItem, onRemoveItem, onAddSavedMeal, onSaveAsMeal,
}: {
  entry: SimMealEntry
  savedMeals: SimSavedMeal[]
  foodItems: { id: string; name: string }[]
  isExpanded: boolean
  onToggleExpand: () => void
  onDelete: () => void
  onAddItem: (item: SimMealItem) => void
  onRemoveItem: (itemId: string) => void
  onAddSavedMeal: (meal: SimSavedMeal) => void
  onSaveAsMeal: (name: string) => void
}) {
  const dragControls = useDragControls()
  const [showPicker, setShowPicker]   = useState(false)
  const [showSaveBox, setShowSaveBox] = useState(false)
  const [saveName, setSaveName]       = useState('')

  const color = SLOT_COLOR[entry.slotType]
  const label = entry.slotType === 'snack'
    ? `Snack${entry.snackIndex ? ` ${entry.snackIndex}` : ''}`
    : SLOT_LABEL[entry.slotType]

  return (
    <Reorder.Item value={entry} dragListener={false} dragControls={dragControls} style={{ listStyle: 'none' }}>
      <div className="card" style={{ borderRadius: '1rem', marginBottom: '0.75rem', overflow: 'visible', borderLeft: `3px solid ${color}` }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 0.7rem 0.7rem 0.55rem' }}>
          <div
            onPointerDown={e => dragControls.start(e)}
            style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'flex', touchAction: 'none', flexShrink: 0 }}
          >
            <GripVertical size={18} />
          </div>

          <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: '0.92rem' }}>{label}</span>

          {entry.items.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {entry.items.length} item{entry.items.length !== 1 ? 's' : ''}
            </span>
          )}

          <button onClick={onToggleExpand} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.2rem' }}>
            {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-pink)', display: 'flex', padding: '0.2rem' }}>
            <Trash2 size={15} />
          </button>
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

                {entry.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem' }}>
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
                  accentColor={color}
                  onCommit={(name, quantity) => onAddItem({ id: uid(), name, quantity })}
                />

                <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.1rem' }}>
                  {savedMeals.length > 0 && (
                    <button
                      onClick={() => setShowPicker(v => !v)}
                      style={{ flex: 1, padding: '0.45rem 0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      <BookOpen size={12} /> Load saved meal
                    </button>
                  )}
                  {entry.items.length > 0 && (
                    <button
                      onClick={() => { setSaveName(''); setShowSaveBox(v => !v) }}
                      style={{ flex: 1, padding: '0.45rem 0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      Save as meal
                    </button>
                  )}
                </div>

                {showPicker && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.6rem', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '0.1rem', marginBottom: '0.1rem' }}>Saved Meals</div>
                    {savedMeals.map(meal => (
                      <button
                        key={meal.id}
                        onClick={() => { onAddSavedMeal(meal); setShowPicker(false) }}
                        style={{ padding: '0.5rem 0.65rem', borderRadius: '0.45rem', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-main)' }}
                      >
                        <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{meal.name}</div>
                        {meal.items.length > 0 && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {meal.items.slice(0, 3).map(i => i.name).join(', ')}{meal.items.length > 3 ? '…' : ''}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {showSaveBox && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && saveName.trim()) { onSaveAsMeal(saveName.trim()); setShowSaveBox(false) } }}
                      placeholder="Meal name to save…"
                      autoFocus
                      style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.45rem 0.6rem', color: 'var(--text-main)', fontSize: '0.84rem' }}
                    />
                    <button
                      onClick={() => { if (saveName.trim()) { onSaveAsMeal(saveName.trim()); setShowSaveBox(false) } }}
                      style={{ padding: '0.45rem 0.7rem', borderRadius: '0.5rem', background: 'var(--primary)', border: 'none', color: 'var(--bg-deep)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSaveBox(false)}
                      style={{ padding: '0.45rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const SimDailyLogger = ({ simCart, onUpdate }: Props) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = fnsIsToday(currentDate)
  const entries: SimMealEntry[] = simCart.dailyLogs[dateKey]?.entries ?? []

  // Single pass to compute all slot presence values
  let hasBreakfast = false, hasLunch = false, hasDinner = false, snackCount = 0
  for (const e of entries) {
    if      (e.slotType === 'breakfast') hasBreakfast = true
    else if (e.slotType === 'lunch')     hasLunch = true
    else if (e.slotType === 'dinner')    hasDinner = true
    else if (e.slotType === 'snack')     snackCount++
  }

  const saveEntries = (next: SimMealEntry[]) => {
    onUpdate({
      ...simCart,
      dailyLogs: { ...simCart.dailyLogs, [dateKey]: { date: dateKey, entries: next } }
    })
  }

  const addSlot = (type: SimMealSlotType) => {
    const newEntry: SimMealEntry = {
      id: uid(),
      slotType: type,
      snackIndex: type === 'snack' ? snackCount + 1 : undefined,
      addedAt: new Date().toISOString(),
      items: [],
    }
    saveEntries(insertEntry(entries, newEntry))
    setExpandedId(newEntry.id)
  }

  const removeSlot = (id: string) => {
    let snackIdx = 1
    const next = entries
      .filter(e => e.id !== id)
      .map(e => e.slotType === 'snack' ? { ...e, snackIndex: snackIdx++ } : e)
    saveEntries(next)
    if (expandedId === id) setExpandedId(null)
  }

  const addItemToEntry = (entryId: string, name: string, quantity?: string) => {
    const item: SimMealItem = { id: uid(), name, quantity }
    const exists = simCart.foodItems.some(f => f.name.toLowerCase() === name.toLowerCase())
    onUpdate({
      ...simCart,
      foodItems: exists ? simCart.foodItems : [...simCart.foodItems, { id: uid(), name }],
      dailyLogs: {
        ...simCart.dailyLogs,
        [dateKey]: {
          date: dateKey,
          entries: entries.map(e => e.id === entryId ? { ...e, items: [...e.items, item] } : e)
        }
      }
    })
  }

  const removeItemFromEntry = (entryId: string, itemId: string) => {
    saveEntries(entries.map(e => e.id === entryId ? { ...e, items: e.items.filter(i => i.id !== itemId) } : e))
  }

  const addSavedMealToEntry = (entryId: string, meal: SimSavedMeal) => {
    const newItems = meal.items.map(i => ({ ...i, id: uid() }))
    saveEntries(entries.map(e => e.id === entryId ? { ...e, items: [...e.items, ...newItems] } : e))
  }

  const saveEntryAsMeal = (entryId: string, name: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry || !entry.items.length) return
    if (simCart.savedMeals.some(m => m.name.toLowerCase() === name.toLowerCase())) return
    onUpdate({
      ...simCart,
      savedMeals: [...simCart.savedMeals, { id: uid(), name, items: entry.items.map(i => ({ ...i })), createdAt: new Date().toISOString() }]
    })
  }

  const SLOTS: { type: SimMealSlotType; disabled: boolean; label: string }[] = [
    { type: 'breakfast', disabled: hasBreakfast, label: 'Breakfast' },
    { type: 'lunch',     disabled: hasLunch,     label: 'Lunch' },
    { type: 'dinner',    disabled: hasDinner,    label: 'Dinner' },
    { type: 'snack',     disabled: false,        label: snackCount > 0 ? `Snack (${snackCount})` : 'Snack' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => setCurrentDate(d => subDays(d, 1))}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '0.6rem', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            {isToday ? 'Today' : format(currentDate, 'EEE, d MMM')}
          </div>
          {!isToday && (
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{format(currentDate, 'yyyy')}</div>
          )}
        </div>

        <button
          onClick={() => setCurrentDate(d => addDays(d, 1))}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '0.6rem', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {SLOTS.map(({ type, disabled, label }) => {
          const color = SLOT_COLOR[type]
          return (
            <button
              key={type}
              onClick={() => !disabled && addSlot(type)}
              disabled={disabled}
              style={{
                padding: '0.65rem 0.5rem',
                borderRadius: '0.75rem',
                border: `1.5px solid ${disabled ? 'rgba(255,255,255,0.08)' : color + '55'}`,
                background: disabled ? 'rgba(255,255,255,0.03)' : `${color}18`,
                color: disabled ? 'var(--text-muted)' : color,
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                opacity: disabled ? 0.45 : 1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
              {label}
            </button>
          )
        })}
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '2.5rem 0' }}>
          No meals logged yet.<br />
          <span style={{ fontSize: '0.8rem' }}>Tap a button above to add one.</span>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={entries}
          onReorder={saveEntries}
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          {entries.map(entry => (
            <MealSlotCard
              key={entry.id}
              entry={entry}
              savedMeals={simCart.savedMeals}
              foodItems={simCart.foodItems}
              isExpanded={expandedId === entry.id}
              onToggleExpand={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
              onDelete={() => removeSlot(entry.id)}
              onAddItem={item => addItemToEntry(entry.id, item.name, item.quantity)}
              onRemoveItem={itemId => removeItemFromEntry(entry.id, itemId)}
              onAddSavedMeal={meal => addSavedMealToEntry(entry.id, meal)}
              onSaveAsMeal={name => saveEntryAsMeal(entry.id, name)}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  )
}

export default SimDailyLogger