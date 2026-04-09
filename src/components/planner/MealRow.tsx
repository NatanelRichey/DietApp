import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical, Utensils, Trash2 } from 'lucide-react'
import type { Meal } from '../../types'

interface MealRowProps {
  meal: Meal
  isEditing: boolean
  onEdit: (meal: Meal) => void
  onDelete: (id: string) => void
}

const MealRow = ({ meal, isEditing, onEdit, onDelete }: MealRowProps) => {
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

export default MealRow
