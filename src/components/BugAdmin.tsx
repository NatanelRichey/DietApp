import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Clock, Archive, Smartphone, Globe, User, Maximize2 } from 'lucide-react'
import { format } from 'date-fns'
import type { BugReport, BugStatus } from '../types'

interface BugAdminProps {
  onClose: () => void
}

const BugAdmin: React.FC<BugAdminProps> = ({ onClose }) => {
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null)
  const [filter, setFilter] = useState<'pending' | 'solved'>('pending')

  const fetchBugs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bugs')
      if (response.ok) {
        const data = await response.json()
        setBugs(data)
      }
    } catch (err) {
      console.error('Fetch bugs error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBugs()
  }, [])

  const updateBugStatus = async (id: string, status: BugStatus) => {
    try {
      const response = await fetch('/api/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })

      if (response.ok) {
        setBugs(bugs.map(b => b.id === id ? { ...b, status } : b))
        if (selectedBug?.id === id) {
          setSelectedBug({ ...selectedBug, status })
        }
      }
    } catch (err) {
      console.error('Update bug status error:', err)
    }
  }

  const filteredBugs = bugs.filter(b => b.status === filter)

  return (
    <div className="bug-admin-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg-primary)',
      zIndex: 10001,
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem'
    }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        padding: '0.5rem'
      }}>
        <div>
          <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Bug Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review and manage submitted issues</p>
        </div>
        <button onClick={onClose} className="glass-icon" style={{ 
          background: 'rgba(255,255,255,0.05)', 
          border: 'none', 
          borderRadius: '50%', 
          padding: '0.5rem', 
          cursor: 'pointer',
          color: 'white'
        }}>
          <X size={24} />
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setFilter('pending')}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '1rem',
            background: filter === 'pending' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Clock size={18} />
          Active ({bugs.filter(b => b.status === 'pending').length})
        </button>
        <button 
          onClick={() => setFilter('solved')}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '1rem',
            background: filter === 'solved' ? 'var(--secondary)' : 'rgba(255,255,255,0.05)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Archive size={18} />
          Solved ({bugs.filter(b => b.status === 'solved').length})
        </button>
      </div>

      {/* Bug List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading reports...</div>
        ) : filteredBugs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <CheckCircle size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No bugs found in this category.</p>
            </motion.div>
          </div>
        ) : (
          filteredBugs.map(bug => (
            <motion.div
              layoutId={bug.id}
              key={bug.id}
              className="glass"
              onClick={() => setSelectedBug(bug)}
              style={{
                padding: '1rem',
                borderRadius: '1.25rem',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '0.75rem', 
                overflow: 'hidden', 
                flexShrink: 0,
                background: 'rgba(0,0,0,0.2)'
              }}>
                <img src={bug.imageUrl} alt="Bug" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{bug.user}</h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9rem', 
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>{bug.report}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Clock size={12} />
                  {format(new Date(bug.timestamp), 'MMM d, HH:mm')}
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                <Maximize2 size={18} />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Bug Details Modal */}
      <AnimatePresence>
        {selectedBug && (
          <motion.div
            initial={{ y: '100vh' }}
            animate={{ y: 0 }}
            exit={{ y: '100vh' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'var(--bg-primary)',
              zIndex: 10002,
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem'
            }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button onClick={() => setSelectedBug(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <X size={24} /> Back
              </button>
              {selectedBug.status === 'pending' ? (
                <button 
                  onClick={() => updateBugStatus(selectedBug.id, 'solved')}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '2rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Mark as Solved
                </button>
              ) : (
                <button 
                  onClick={() => updateBugStatus(selectedBug.id, 'pending')}
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '2rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reopen Issue
                </button>
              )}
            </header>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
              <div style={{ 
                width: '100%', 
                borderRadius: '1.5rem', 
                overflow: 'hidden', 
                marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)'
              }}>
                <img src={selectedBug.imageUrl} alt="Full Screenshot" style={{ width: '100%', display: 'block' }} />
              </div>

              <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={20} color="var(--primary)" />
                  Report Summary
                </h3>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedBug.report}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <Smartphone size={14} /> Device
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {selectedBug.deviceInfo.viewportWidth} x {selectedBug.deviceInfo.viewportHeight}
                  </div>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <User size={14} /> Reporter
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedBug.user}</div>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1.25rem', gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <Globe size={14} /> URL / Browser
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, wordBreak: 'break-all', opacity: 0.8 }}>{selectedBug.deviceInfo.url}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{selectedBug.deviceInfo.userAgent}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const AlertCircle = ({ size, color }: { size: number, color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

export default BugAdmin
