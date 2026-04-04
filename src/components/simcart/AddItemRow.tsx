import { useState } from 'react'
import { Plus } from 'lucide-react'

interface Props {
  foodItems: { id: string; name: string }[]
  onCommit: (name: string, quantity?: string) => void
  accentColor?: string
  placeholder?: string
}

const AddItemRow = ({ foodItems, onCommit, accentColor = 'var(--primary)', placeholder = 'Add food item…' }: Props) => {
  const [item, setItem] = useState('')
  const [qty, setQty]   = useState('')
  const [showAC, setShowAC] = useState(false)

  const suggestions = item.length >= 1
    ? foodItems.filter(f => f.name.toLowerCase().includes(item.toLowerCase())).slice(0, 6)
    : []

  const commit = () => {
    if (!item.trim()) return
    onCommit(item.trim(), qty.trim() || undefined)
    setItem('')
    setQty('')
    setShowAC(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          value={item}
          onChange={e => { setItem(e.target.value); setShowAC(true) }}
          onKeyDown={handleKey}
          onBlur={() => setTimeout(() => setShowAC(false), 150)}
          placeholder={placeholder}
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.45rem 0.6rem', color: 'var(--text-main)', fontSize: '0.84rem' }}
        />
        {showAC && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#142338', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', zIndex: 50, marginTop: '2px', overflow: 'hidden' }}>
            {suggestions.map(f => (
              <button
                key={f.id}
                onMouseDown={() => { setItem(f.name); setShowAC(false) }}
                style={{ display: 'block', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-main)', fontSize: '0.84rem', cursor: 'pointer', textAlign: 'left' }}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        value={qty}
        onChange={e => setQty(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Qty"
        style={{ width: '66px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.84rem' }}
      />

      <button
        onClick={commit}
        style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: accentColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <Plus size={18} color="var(--bg-deep)" />
      </button>
    </div>
  )
}

export default AddItemRow