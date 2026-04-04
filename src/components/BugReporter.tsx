import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Camera, AlertCircle, Loader2 } from 'lucide-react'
import { toPng } from 'html-to-image'

interface BugReporterProps {
  isOpen: boolean
  onClose: () => void
  user: string
  initialScreenshot?: string | null
}

const BugReporter: React.FC<BugReporterProps> = ({ isOpen, onClose, user, initialScreenshot }) => {
  const [report, setReport] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const captureScreenshot = async () => {
    setCapturing(true)
    setError(null)
    try {
      // Small timeout to let any UI transitions finish if needed
      await new Promise(r => setTimeout(r, 300))
      const dataUrl = await toPng(document.body, {
        quality: 0.8,
        pixelRatio: 1, // Keep it light
        skipFonts: true, // Speeds up capture significantly
      })
      setScreenshot(dataUrl)
    } catch (err) {
      console.error('Screenshot error:', err)
      setError('Failed to capture screenshot.')
    } finally {
      setCapturing(false)
    }
  }

  // Use pre-captured screenshot if provided, otherwise capture now
  useEffect(() => {
    if (isOpen) {
      setReport('')
      setError(null)
      if (initialScreenshot) {
        setScreenshot(initialScreenshot)
      } else {
        captureScreenshot()
      }
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!report.trim()) return
    if (!screenshot) {
      setError('Please wait for the screenshot to be captured.')
      return
    }

    setLoading(true)
    setError(null)

    const deviceInfo = {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    try {
      const response = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report,
          deviceInfo,
          screenshot,
          user,
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to submit bug report.')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '1.5rem',
              borderRadius: '1.5rem',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(23, 23, 23, 0.95)',
              color: 'white',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
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
                    width: '100%',
                    minHeight: '100px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    padding: '0.75rem',
                    color: 'white',
                    fontSize: '1rem',
                    resize: 'none'
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
                  width: '100%', 
                  aspectRatio: '16/9', 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: '0.75rem', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {capturing ? (
                    <div style={{ textAlign: 'center' }}>
                      <Loader2 className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff4b4b', fontSize: '0.85rem' }}>
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || capturing || !report.trim()}
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: '0.8rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: (loading || capturing || !report.trim()) ? 0.6 : 1
                  }}
                >
                  {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                  Submit Report
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
