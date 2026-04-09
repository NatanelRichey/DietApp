import { Reorder } from 'framer-motion'
import { Plus, Trash2, Utensils, Edit2, Save, X } from 'lucide-react'
import type { PlannerStore } from './MealPlanner'
import EditableItemRow from './EditableItemRow'

interface MealsTabProps {
  store: PlannerStore
}

const MealsTab = ({ store }: MealsTabProps) => {
  const {
    data,
    editingPlanId,
    templateFormOpen,
    editingTemplateId,
    templateForm,
    templateItems,
    newTemplateItem,
    editingTemplateItemId,
    editTemplateItemForm,
    expandedTemplateId,
    addToPlanTarget,
    setTemplateFormOpen,
    setTemplateForm,
    setNewTemplateItem,
    setEditingTemplateItemId,
    setEditTemplateItemForm,
    setExpandedTemplateId,
    setAddToPlanTarget,
    openNewTemplate,
    openEditTemplate,
    addTemplateItem,
    removeTemplateItem,
    saveTemplate,
    reorderTemplateItems,
    startEditTemplateItem,
    saveEditTemplateItem,
    addFromLibrary,
    deleteFromLibrary,
  } = store

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

          {/* Items — draggable + click-to-edit */}
          {templateItems.length > 0 && (
            <Reorder.Group
              axis="y" values={templateItems} onReorder={reorderTemplateItems}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', listStyle: 'none', padding: 0, margin: 0 }}
            >
              {templateItems.map(item => (
                <EditableItemRow
                  key={item.id} item={item}
                  isEditing={editingTemplateItemId === item.id}
                  editForm={editTemplateItemForm}
                  onEditFormChange={setEditTemplateItemForm}
                  onStartEdit={() => startEditTemplateItem(item)}
                  onSaveEdit={saveEditTemplateItem}
                  onCancelEdit={() => setEditingTemplateItemId(null)}
                  onDelete={() => removeTemplateItem(item.id)}
                />
              ))}
            </Reorder.Group>
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
}

export default MealsTab
