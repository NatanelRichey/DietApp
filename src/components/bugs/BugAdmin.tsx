import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Clock, Archive, Smartphone, Globe, User, ChevronRight, ChevronLeft, AlertCircle, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import type { BugReport, BugStatus } from '../../types'

interface BugAdminProps {
  onClose: () => void
}

const BugAdmin: React.FC<BugAdminProps> = ({ onClose }) => {
  const [bugs, setBugs]           = useState<BugReport[]>([])
  const [loading, setLoading]     = useState(true)
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null)
  const [filter, setFilter]       = useState<'pending' | 'solved'>('pending')
  const [resolving, setResolving] = useState<string | null>(null)

  // Local overrides persist status across re-opens even if server hasn't updated yet
  const [statusOverrides, setStatusOverrides] = useState<Record<string, BugStatus>>(() => {
    try { return JSON.parse(localStorage.getItem('bug-admin-overrides') || '{}') }
    catch { return {} }
  })

  const fetchBugs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bugs')
      if (res.ok) setBugs(await res.json())
    } catch (err) {
      console.error('Fetch bugs error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBugs() }, [])

  const updateBugStatus = async (id: string, status: BugStatus, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setResolving(id)
    // Apply locally immediately and persist override so it survives re-opens
    const newOverrides = { ...statusOverrides, [id]: status }
    setStatusOverrides(newOverrides)
    localStorage.setItem('bug-admin-overrides', JSON.stringify(newOverrides))
    setBugs(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    if (selectedBug?.id === id) setSelectedBug(prev => prev ? { ...prev, status } : null)
    try {
      await fetch('/api/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
    } catch (err) {
      console.error('Update bug status error:', err)
    } finally {
      setResolving(null)
    }
  }

  // Merge server data with local overrides
  const displayBugs = bugs.map(b => ({ ...b, status: (statusOverrides[b.id] as BugStatus) ?? b.status }))
  const filteredBugs = displayBugs.filter(b => b.status === filter)
  const isDetail = selectedBug !== null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg-deep)',
      zIndex: 10001,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 1rem 0.5rem',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {isDetail ? (
          <button
            onClick={() => setSelectedBug(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', padding: '0.3rem 0' }}
          >
            <ChevronLeft size={20} /> Back
          </button>
        ) : (
          <div>
            <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Bug Reports</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Review and manage submitted issues</p>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isDetail && (
            selectedBug!.status === 'pending' ? (
              <button
                onClick={(e) => updateBugStatus(selectedBug!.id, 'solved', e)}
                disabled={resolving === selectedBug!.id}
                style={{ background: 'var(--primary)', color: 'var(--bg-deep)', border: 'none', padding: '0.5rem 1.1rem', borderRadius: '2rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Mark Solved
              </button>
            ) : (
              <button
                onClick={(e) => updateBugStatus(selectedBug!.id, 'pending', e)}
                disabled={resolving === selectedBug!.id}
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)', border: 'none', padding: '0.5rem 1.1rem', borderRadius: '2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Reopen
              </button>
            )
          )}
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* ── Page content (list ↔ detail swap) ── */}
      <AnimatePresence mode="wait" initial={false}>
        {!isDetail ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem' }}>
              {(['pending', 'solved'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1, padding: '0.7rem', borderRadius: '1rem',
                    background: filter === f
                      ? (f === 'pending' ? 'var(--primary)' : 'var(--secondary)')
                      : 'rgba(255,255,255,0.05)',
                    color: filter === f ? 'var(--bg-deep)' : 'var(--text-muted)',
                    border: 'none', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    fontSize: '0.85rem',
                  }}
                >
                  {f === 'pending' ? <Clock size={15} /> : <Archive size={15} />}
                  {f === 'pending' ? 'Active' : 'Solved'} ({displayBugs.filter(b => b.status === f).length})
                </button>
              ))}
            </div>

            {/* Bug list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading reports…</div>
              ) : filteredBugs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                  <CheckCircle size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>No bugs in this category.</p>
                </div>
              ) : filteredBugs.map(bug => (
                <div
                  key={bug.id}
                  className="glass"
                  onClick={() => setSelectedBug(bug)}
                  style={{ padding: '0.9rem 1rem', borderRadius: '1.25rem', cursor: 'pointer', display: 'flex', gap: '0.85rem', alignItems: 'center' }}
                >
                  {/* Thumbnail */}
                  <div style={{ width: 52, height: 52, borderRadius: '0.75rem', overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,0.25)' }}>
                    <img src={bug.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem' }}>{bug.user}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bug.report}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <Clock size={10} />
                      {format(new Date(bug.timestamp), 'MMM d, HH:mm')}
                    </div>
                  </div>

                  {/* Quick resolve / reopen button */}
                  {bug.status === 'pending' ? (
                    <button
                      onClick={(e) => updateBugStatus(bug.id, 'solved', e)}
                      disabled={resolving === bug.id}
                      title="Mark as solved"
                      style={{
                        background: 'rgba(100,255,218,0.12)', border: '1px solid rgba(100,255,218,0.25)',
                        borderRadius: '50%', width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--primary)', flexShrink: 0,
                        opacity: resolving === bug.id ? 0.5 : 1,
                      }}
                    >
                      <CheckCircle size={17} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => updateBugStatus(bug.id, 'pending', e)}
                      disabled={resolving === bug.id}
                      title="Reopen"
                      style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%', width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
                        opacity: resolving === bug.id ? 0.5 : 1,
                      }}
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}

                  <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`detail-${selectedBug.id}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}
          >
            {/* Screenshot */}
            <div style={{ borderRadius: '1.25rem', overflow: 'hidden', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
              <img src={selectedBug.imageUrl} alt="Screenshot" style={{ width: '100%', display: 'block' }} />
            </div>

            {/* Report */}
            <div className="glass" style={{ padding: '1.25rem', borderRadius: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <AlertCircle size={16} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report</span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.92rem' }}>{selectedBug.report}</p>
            </div>

            {/* Device info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="glass" style={{ padding: '0.9rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <Smartphone size={12} /> Device
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{selectedBug.deviceInfo.viewportWidth} × {selectedBug.deviceInfo.viewportHeight}</div>
              </div>
              <div className="glass" style={{ padding: '0.9rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <User size={12} /> Reporter
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{selectedBug.user}</div>
              </div>
              <div className="glass" style={{ padding: '0.9rem', borderRadius: '1rem', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <Globe size={12} /> URL
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 500, wordBreak: 'break-all', opacity: 0.8 }}>{selectedBug.deviceInfo.url}</div>
                <div style={{ fontSize: '0.7rem', marginTop: '0.4rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{selectedBug.deviceInfo.userAgent}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BugAdmin
