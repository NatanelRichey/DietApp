import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Camera, AlertCircle, Loader2, Upload, FileWarning } from 'lucide-react'
import { toPng } from 'html-to-image'

interface BugReporterProps {
  isOpen: boolean
  onClose: () => void
  user: string
  // undefined = pre-capture in-flight (show spinner), null = failed, string = ready
  initialScreenshot?: string | null | undefined
}

interface Draft {
  id: string
  report: string
  screenshot: string
  deviceInfo: Record<string, unknown>
  timestamp: string
  user: string
}

const DRAFTS_KEY = 'bug-reporter-drafts'

const loadDrafts = (): Draft[] => {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]') } catch { return [] }
}

const saveDrafts = (drafts: Draft[]) => {
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)) } catch {}
}

const submitBug = async (draft: Omit<Draft, 'id'> & { id?: string }) => {
  const res = await fetch('/api/bugs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report: draft.report,
      deviceInfo: draft.deviceInfo,
      screenshot: draft.screenshot,
      user: draft.user,
      timestamp: draft.timestamp,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
}

const BugReporter: React.FC<BugReporterProps> = ({ isOpen, onClose, user, initialScreenshot }) => {
  const [report, setReport] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [uploadingDraftId, setUploadingDraftId] = useState<string | null>(null)

  const refreshDrafts = () => setDrafts(loadDrafts())

  const captureScreenshot = async () => {
    setCapturing(true)
    setError(null)
    try {
      await new Promise(r => setTimeout(r, 300))
      const dataUrl = await toPng(document.body, { quality: 0.6, pixelRatio: 0.75, skipFonts: true })
      setScreenshot(dataUrl)
    } catch {
      setError('Failed to capture screenshot.')
    } finally {
      setCapturing(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setReport('')
      setError(null)
      setScreenshot(null)
      refreshDrafts()
      // Don't start our own toPng — App.tsx always provides initialScreenshot.
      // undefined means capture in-flight, so show spinner.
      if (typeof initialScreenshot === 'string') {
        setScreenshot(initialScreenshot)
        setCapturing(false)
      } else {
        setCapturing(true) // wait for App.tsx to deliver; null means it failed
        if (initialScreenshot === null) setCapturing(false)
      }
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pick up screenshot once App.tsx pre-capture resolves (undefined → string | null)
  useEffect(() => {
    if (!isOpen || initialScreenshot === undefined) return
    setScreenshot(initialScreenshot)
    setCapturing(false)
  }, [initialScreenshot, isOpen])

  const saveDraft = (draftData: Omit<Draft, 'id'>) => {
    const existing = loadDrafts()
    const draft: Draft = { id: crypto.randomUUID(), ...draftData }
    saveDrafts([...existing, draft])
    refreshDrafts()
  }

  const removeDraft = (id: string) => {
    saveDrafts(loadDrafts().filter(d => d.id !== id))
    refreshDrafts()
  }

  // Upload all pending drafts, silently
  const flushDrafts = async () => {
    const pending = loadDrafts()
    for (const draft of pending) {
      try {
        await submitBug(draft)
        removeDraft(draft.id)
      } catch {
        // Leave failed drafts for next attempt
      }
    }
    refreshDrafts()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!report.trim()) return

    setLoading(true)
    setError(null)

    const deviceInfo = {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      userAgent: navigator.userAgent,
      url: window.location.href,
    }
    const timestamp = new Date().toISOString()

    // Cap screenshot at 800 KB base64 to stay well within Vercel's 4.5 MB body limit
    const MAX_SCREENSHOT_B64 = 800_000
    const screenshotPayload = screenshot && screenshot.length > MAX_SCREENSHOT_B64 ? '' : (screenshot ?? '')

    try {
      await submitBug({ report, deviceInfo, screenshot: screenshotPayload, user, timestamp })
      await flushDrafts() // upload any queued drafts on success
      onClose()
    } catch {
      // Save as draft and show feedback
      saveDraft({ report, deviceInfo, screenshot: screenshotPayload, user, timestamp })
      setError('No connection — saved as draft. It will upload next time.')
    } finally {
      setLoading(false)
    }
  }

  const uploadDraft = async (draft: Draft) => {
    setUploadingDraftId(draft.id)
    try {
      await submitBug(draft)
      removeDraft(draft.id)
    } catch {
      setError('Still offline — draft kept for later.')
    } finally {
      setUploadingDraftId(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass"
            style={{
              width: '100%', maxWidth: '500px', padding: '1.5rem', borderRadius: '1.5rem',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(23,23,23,0.95)',
              color: 'white', maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '0.75rem' }}>
                  <AlertCircle size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Report a Bug</h2>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Pending drafts */}
            {drafts.length > 0 && (
              <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileWarning size={13} color="var(--accent-pink)" /> {drafts.length} unsent draft{drafts.length > 1 ? 's' : ''}
                </div>
                {drafts.map(draft => (
                  <div key={draft.id} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,145,132,0.25)',
                    borderRadius: '0.75rem', padding: '0.7rem 0.9rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', fontWeight: 600, marginBottom: '0.15rem' }}>DRAFT</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.report}</div>
                    </div>
                    <button
                      onClick={() => uploadDraft(draft)}
                      disabled={uploadingDraftId === draft.id}
                      style={{
                        background: 'rgba(100,255,218,0.1)', border: '1px solid rgba(100,255,218,0.25)',
                        borderRadius: '0.5rem', padding: '0.35rem 0.7rem', cursor: 'pointer',
                        color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0,
                        opacity: uploadingDraftId === draft.id ? 0.5 : 1,
                      }}
                    >
                      {uploadingDraftId === draft.id ? <Loader2 size={12} /> : <Upload size={12} />}
                      Upload
                    </button>
                    <button
                      onClick={() => removeDraft(draft.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  What's the issue? <span style={{ color: '#ff4b4b' }}>*</span>
                </label>
                <textarea
                  required
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  placeholder="Tell us what's not working correctly..."
                  style={{
                    width: '100%', minHeight: '100px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem', padding: '0.75rem', color: 'white', fontSize: '1rem', resize: 'none',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Captured Scene</label>
                  <button
                    type="button"
                    onClick={captureScreenshot}
                    disabled={capturing}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Camera size={14} /> {capturing ? 'Capturing...' : 'Retake'}
                  </button>
                </div>
                <div style={{
                  width: '100%', aspectRatio: '16/9', background: 'rgba(0,0,0,0.2)',
                  borderRadius: '0.75rem', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  {capturing ? (
                    <div style={{ textAlign: 'center' }}>
                      <Loader2 style={{ margin: '0 auto 0.5rem' }} />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capturing viewport...</p>
                    </div>
                  ) : screenshot ? (
                    <img src={screenshot} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#ff4b4b' }}>
                      <Camera size={24} style={{ margin: '0 auto 0.5rem' }} />
                      <p style={{ fontSize: '0.8rem' }}>Capture failed.</p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: error.includes('draft') ? 'var(--accent-pink)' : '#ff4b4b', fontSize: '0.85rem' }}>
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '0.8rem', borderRadius: '0.75rem',
                    background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !report.trim()}
                  className="btn-primary"
                  style={{
                    flex: 2, padding: '0.8rem', borderRadius: '0.75rem', border: 'none',
                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '0.5rem',
                    opacity: (loading || !report.trim()) ? 0.6 : 1,
                  }}
                >
                  {loading ? <Loader2 size={18} /> : <Send size={18} />}
                  {capturing ? 'Submit (capturing…)' : 'Submit Report'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default BugReporter
