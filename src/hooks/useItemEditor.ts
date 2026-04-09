import { useState } from 'react'
import type { MealItem } from '../types'

interface EditForm {
  name: string
  calories: string
  protein: string
}

export function useItemEditor() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm>({ name: '', calories: '', protein: '' })

  const startEdit = (item: MealItem) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      calories: String(item.calories),
      protein: item.protein !== undefined ? String(item.protein) : '',
    })
  }

  const cancel = () => {
    setEditingId(null)
    setForm({ name: '', calories: '', protein: '' })
  }

  const buildUpdated = (items: MealItem[]): MealItem[] | null => {
    if (!editingId || !form.name || !form.calories) return null
    return items.map(i =>
      i.id === editingId
        ? {
            ...i,
            name: form.name,
            calories: parseInt(form.calories),
            protein: form.protein ? parseFloat(form.protein) : undefined,
          }
        : i
    )
  }

  return { editingId, form, setForm, startEdit, cancel, buildUpdated }
}
