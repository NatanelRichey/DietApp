import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileUp, FileText, Trash2, File } from 'lucide-react'
import type { UserData, Document } from '../types'
import { useLocalStorage } from '../hooks/useLocalStorage'

const DocViewer = () => {
  const [data, setData] = useLocalStorage<UserData>('diet-app-data', {
    weightHistory: [],
    dayPlans: {},
    activePlanId: '',
    documents: []
  })

  const [activeDocId, setActiveDocId] = useState<string | null>(
    data.documents.length > 0 ? data.documents[0].id : null
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const newDoc: Document = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace('.md', ''),
        content: content
      }
      setData({
        ...data,
        documents: [...data.documents, newDoc]
      })
      setActiveDocId(newDoc.id)
    }
    reader.readAsText(file)
  }

  const deleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updatedDocs = data.documents.filter(d => d.id !== id)
    setData({ ...data, documents: updatedDocs })
    if (activeDocId === id) {
      setActiveDocId(updatedDocs.length > 0 ? updatedDocs[0].id : null)
    }
  }

  const activeDoc = data.documents.find(d => d.id === activeDocId)

  return (
    <div className="doc-viewer" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 12rem)' }}>
      {/* Upload & List */}
      <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Documents</h3>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary" 
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
          >
            <FileUp size={16} /> Upload MD
          </button>
          <input 
            type="file" 
            accept=".md" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
        </div>

        {/* Horizontal Tabs */}
        <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {data.documents.map(doc => (
            <div 
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '1rem',
                background: activeDocId === doc.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: activeDocId === doc.id ? 'var(--bg-deep)' : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: 'var(--border-glass)',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              <FileText size={14} />
              {doc.name}
              <Trash2 
                size={14} 
                onClick={(e) => deleteDoc(doc.id, e)}
                style={{ marginLeft: '0.5rem', opacity: 0.6 }} 
              />
            </div>
          ))}
          {data.documents.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem' }}>
              No documents yet. Click upload to add Markdown files.
            </div>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div className="card glass animate-fade-in" style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        {activeDoc ? (
          <div className="prose">
            <ReactMarkdown>{activeDoc.content}</ReactMarkdown>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', gap: '1rem' }}>
            <File size={48} opacity={0.3} />
            <p>Select a document to view its content or upload a new .md file.</p>
          </div>
        )}
      </div>

      <style>{`
        .prose {
          line-height: 1.7;
          color: var(--text-main);
        }
        .prose h1, .prose h2, .prose h3 {
          color: var(--primary);
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .prose p {
          margin-bottom: 1em;
        }
        .prose code {
          background: rgba(255,255,255,0.1);
          padding: 0.2rem 0.4rem;
          border-radius: 0.4rem;
          font-family: monospace;
          font-size: 0.9em;
        }
        .prose pre {
          background: rgba(0,0,0,0.3);
          padding: 1rem;
          border-radius: 1rem;
          overflow-x: auto;
          margin: 1em 0;
        }
        .prose ul, .prose ol {
          padding-left: 1.5rem;
          margin-bottom: 1em;
        }
        .prose blockquote {
          border-left: 4px solid var(--primary);
          padding-left: 1rem;
          margin-left: 0;
          color: var(--text-muted);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}

export default DocViewer
