import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileText, File, Plus, Edit2, Save, X } from 'lucide-react'
import type { Document, UserData } from '../types'

interface DocViewerProps {
  user: string
  data: UserData
  setData: (d: UserData) => void
  loading: boolean
}

const DocViewer = ({ data, setData, loading }: DocViewerProps) => {
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newIsMarkdown, setNewIsMarkdown] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editIsMarkdown, setEditIsMarkdown] = useState(false)

  useEffect(() => {
    if (data.documents.length > 0 && !activeDocId) {
      setActiveDocId(data.documents[0].id)
    }
  }, [data.documents])

  const addDoc = () => {
    if (!newName.trim() || !newContent.trim()) return
    const doc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
      content: newContent,
      isMarkdown: newIsMarkdown,
    }
    setData({ ...data, documents: [...data.documents, doc] })
    setActiveDocId(doc.id)
    setIsAdding(false)
    setNewName('')
    setNewContent('')
    setNewIsMarkdown(false)
  }

  const deleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = data.documents.filter(d => d.id !== id)
    setData({ ...data, documents: updated })
    if (activeDocId === id) setActiveDocId(updated.length > 0 ? updated[0].id : null)
  }

  const startEdit = (doc: Document) => {
    setEditContent(doc.content)
    setEditIsMarkdown(doc.isMarkdown ?? true)
    setIsEditing(true)
  }

  const saveEdit = () => {
    if (!activeDoc) return
    setData({
      ...data,
      documents: data.documents.map(d =>
        d.id === activeDoc.id ? { ...d, content: editContent, isMarkdown: editIsMarkdown } : d
      ),
    })
    setIsEditing(false)
  }

  const activeDoc = data.documents.find(d => d.id === activeDocId)
  const renderAsMarkdown = activeDoc ? (activeDoc.isMarkdown ?? true) : false

  return (
    <div className="doc-viewer" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 12rem)' }}>

      {/* Header + tabs */}
      <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Documents</h3>
          <button
            onClick={() => { setIsAdding(v => !v); setIsEditing(false) }}
            className="btn-primary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
            {isAdding ? 'Cancel' : 'Add Document'}
          </button>
        </div>

        {/* Add form */}
        {isAdding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.8rem', border: 'var(--border-glass)' }}>
            <input
              autoFocus
              type="text"
              placeholder="Document title"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: '0.6rem', border: 'var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
            <textarea
              placeholder="Paste content here…"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: '0.6rem', border: 'var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', minHeight: '120px', resize: 'vertical', fontSize: '0.88rem', fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={newIsMarkdown}
                  onChange={e => setNewIsMarkdown(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                />
                Render as Markdown
              </label>
              <button onClick={addDoc} className="btn-primary" style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}>
                <Plus size={15} /> Add
              </button>
            </div>
          </div>
        )}

        {/* Document tabs */}
        <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {data.documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => { setActiveDocId(doc.id); setIsEditing(false); setIsAdding(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '1rem',
                background: activeDocId === doc.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: activeDocId === doc.id ? 'var(--bg-deep)' : 'var(--text-muted)',
                cursor: 'pointer', whiteSpace: 'nowrap',
                border: activeDocId === doc.id ? 'none' : 'var(--border-glass)',
                fontWeight: 600, fontSize: '0.83rem',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <FileText size={13} />
              {doc.name}
              <X
                size={13}
                onClick={(e) => deleteDoc(doc.id, e)}
                style={{ marginLeft: '0.2rem', opacity: 0.65 }}
              />
            </div>
          ))}
          {data.documents.length === 0 && !loading && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '0.4rem 0.2rem' }}>
              No documents yet.
            </div>
          )}
        </div>
      </div>

      {/* Viewer / Editor */}
      <div className="card glass" style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading…</div>
        ) : activeDoc ? (
          <>
            {/* Viewer toolbar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
              {isEditing ? (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                    <input
                      type="checkbox"
                      checked={editIsMarkdown}
                      onChange={e => setEditIsMarkdown(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Markdown
                  </label>
                  <button onClick={saveEdit} className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Save size={13} /> Save
                  </button>
                  <button onClick={() => setIsEditing(false)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: 'none', border: 'var(--border-glass)', borderRadius: '0.6rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => startEdit(activeDoc)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: 'none', border: 'var(--border-glass)', borderRadius: '0.6rem', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Edit2 size={13} /> Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                style={{
                  flex: 1, minHeight: '55vh', width: '100%',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--primary)',
                  borderRadius: '0.8rem', padding: '1rem',
                  color: 'var(--text-main)', fontSize: '0.88rem',
                  fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical',
                }}
              />
            ) : renderAsMarkdown ? (
              <div className="prose">
                <ReactMarkdown>{activeDoc.content}</ReactMarkdown>
              </div>
            ) : (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-main)', fontFamily: 'inherit' }}>
                {activeDoc.content}
              </pre>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', gap: '1rem' }}>
            <File size={48} opacity={0.3} />
            <p style={{ margin: 0 }}>Select a document or add a new one.</p>
          </div>
        )}
      </div>

      <style>{`
        .prose { line-height: 1.7; color: var(--text-main); }
        .prose h1, .prose h2, .prose h3 { color: var(--primary); margin-top: 1.5em; margin-bottom: 0.5em; }
        .prose p { margin-bottom: 1em; }
        .prose code { background: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; border-radius: 0.4rem; font-family: monospace; font-size: 0.9em; }
        .prose pre { background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 1rem; overflow-x: auto; margin: 1em 0; }
        .prose ul, .prose ol { padding-left: 1.5rem; margin-bottom: 1em; }
        .prose blockquote { border-left: 4px solid var(--primary); padding-left: 1rem; margin-left: 0; color: var(--text-muted); font-style: italic; }
      `}</style>
    </div>
  )
}

export default DocViewer
