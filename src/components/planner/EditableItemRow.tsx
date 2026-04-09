import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical, Edit2, Trash2 } from 'lucide-react'
import type { MealItem } from '../../types'

interface EditableItemRowProps {
  item: MealItem
  isEditing: boolean
  editForm: { name: string; calories: string; protein: string }
  onEditFormChange: (f: { name: string; calories: string; protein: string }) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

const EditableItemRow = ({ item, isEditing, editForm, onEditFormChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: EditableItemRowProps) => {
  const controls = useDragControls()
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} as="div" style={{ listStyle: 'none' }}>
      {isEditing ? (
        <div style={{ display: 'flex', gap: '0.35rem', padding: '0.4rem 0.6rem', background: 'rgba(100,255,218,0.06)', borderRadius: '0.6rem', border: '1px solid rgba(100,255,218,0.2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input autoFocus type="text" value={editForm.name} onChange={e => onEditFormChange({ ...editForm, name: e.target.value })}
            className="glass" style={{ flex: 2, minWidth: '80px', padding: '0.3rem 0.5rem', borderRadius: '0.5rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.82rem' }} />
          <input type="number" value={editForm.calories} onChange={e => onEditFormChange({ ...editForm, calories: e.target.value })}
            placeholder="kcal" className="glass" style={{ flex: 1, minWidth: '50px', padding: '0.3rem 0.5rem', borderRadius: '0.5rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.82rem' }} />
          <input type="number" value={editForm.protein} onChange={e => onEditFormChange({ ...editForm, protein: e.target.value })}
            placeholder="g" className="glass" style={{ flex: 1, minWidth: '48px', padding: '0.3rem 0.5rem', borderRadius: '0.5rem', border: 'var(--border-glass)', color: 'var(--text-main)', fontSize: '0.82rem' }} />
          <button onClick={onSaveEdit} style={{ background: 'var(--primary)', border: 'none', color: 'var(--bg-deep)', borderRadius: '0.45rem', padding: '0.3rem 0.6rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}>✓</button>
          <button onClick={onCancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.6rem' }}>
          <div onPointerDown={e => controls.start(e)} style={{ cursor: 'grab', touchAction: 'none', color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }}>
            <GripVertical size={13} />
          </div>
          <div onClick={onStartEdit} style={{ flex: 1, fontSize: '0.85rem', cursor: 'pointer' }}>{item.name}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {item.calories} kcal{item.protein ? ` · ${item.protein}g` : ''}
          </div>
          <button onClick={onStartEdit} style={{ background: 'none', border: 'none', color: 'var(--primary)', opacity: 0.6, cursor: 'pointer', flexShrink: 0, padding: 0 }}>
            <Edit2 size={12} />
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', opacity: 0.6, cursor: 'pointer', flexShrink: 0, padding: 0 }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </Reorder.Item>
  )
}

export default EditableItemRow
