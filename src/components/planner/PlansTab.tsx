import { Reorder } from 'framer-motion'
import { Plus, Trash2, Calendar, Info, Edit2, Save, X, Bookmark, ChevronDown, ChevronUp } from 'lucide-react'
import type { PlannerStore } from './MealPlanner'
import MealRow from './MealRow'
import EditableItemRow from './EditableItemRow'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface PlansTabProps {
  store: PlannerStore
}

const PlansTab = ({ store }: PlansTabProps) => {
  const {
    data,
    currentPlan,
    editingPlanId,
    editingMealId,
    newMeal,
    newItem,
    savedMealsExpanded,
    editingItemId,
    editItemForm,
    selectedDays,
    scheduleDirty,
    totalCalories,
    totalProtein,
    setEditingPlanId,
    setNewMeal,
    setNewItem,
    setSavedMealsExpanded,
    setEditingItemId,
    setEditItemForm,
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
    deletePlanType,
    renameDayType,
    saveToLibrary,
    addFromLibrary,
    deleteFromLibrary,
    toggleDay,
    saveSchedule,
    addNewPlanType,
  } = store

  const otherPlanDays = new Set<number>(
    Object.entries(data.weekSchedule || {})
      .filter(([, pid]) => pid !== editingPlanId)
      .map(([day]) => Number(day))
  )

  return (
    <>
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
            if (name) addNewPlanType(name)
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
              <Reorder.Group
                axis="y" values={items} onReorder={reorderItemsInMeal}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', listStyle: 'none', padding: 0, margin: 0 }}
              >
                {items.map(item => (
                  <EditableItemRow
                    key={item.id} item={item}
                    isEditing={editingItemId === item.id}
                    editForm={editItemForm}
                    onEditFormChange={setEditItemForm}
                    onStartEdit={() => startEditItem(item)}
                    onSaveEdit={saveEditItem}
                    onCancelEdit={() => setEditingItemId(null)}
                    onDelete={() => removeItemFromMeal(item.id)}
                  />
                ))}
              </Reorder.Group>
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
              <MealRow
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
    </>
  )
}

export default PlansTab
