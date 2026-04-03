import { useState, useEffect } from 'react'
import { ChevronLeft, Delete, Edit2, Check, X } from 'lucide-react'

interface AppUser {
  name: string
  pin: string
}

interface LoginProps {
  onLogin: (user: string) => void
}

type Phase = 'select' | 'pin' | 'editNewPin' | 'editConfirmPin'

const FALLBACK_USERS: AppUser[] = [
  { name: 'Natan', pin: '9442' },
  { name: 'Simha', pin: '1994' }
]

const avatarColors = [
  'linear-gradient(135deg, #64ffda, #00b4d8)',
  'linear-gradient(135deg, #a78bfa, #ec4899)',
  'linear-gradient(135deg, #fb923c, #f43f5e)',
  'linear-gradient(135deg, #34d399, #059669)',
]

const Login = ({ onLogin }: LoginProps) => {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [phase, setPhase] = useState<Phase>('select')
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [editNewPin, setEditNewPin] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : FALLBACK_USERS); setLoadingUsers(false) })
      .catch(() => { setUsers(FALLBACK_USERS); setLoadingUsers(false) })
  }, [])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => { setShake(false); setPin('') }, 600)
  }

  const handleDigit = (d: string) => {
    if (shake) return
    const activePin = phase === 'editNewPin' ? editNewPin : phase === 'editConfirmPin' ? pin : pin
    if (activePin.length >= 4) return

    if (phase === 'pin') {
      const next = pin + d
      setPin(next)
      if (next.length === 4) {
        setTimeout(() => {
          if (next === selectedUser?.pin) {
            onLogin(selectedUser.name)
          } else {
            triggerShake()
          }
        }, 80)
      }
    } else if (phase === 'editNewPin') {
      const next = editNewPin + d
      setEditNewPin(next)
      if (next.length === 4) {
        // Move to confirm phase
        setTimeout(() => setPhase('editConfirmPin'), 80)
        setPin('')
      }
    } else if (phase === 'editConfirmPin') {
      const next = pin + d
      setPin(next)
      if (next.length === 4) {
        setTimeout(async () => {
          if (next === editNewPin) {
            // Save new PIN
            setEditSaving(true)
            try {
              const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'edit', name: selectedUser?.name, pin: next })
              })
              const updated = await res.json()
              setUsers(Array.isArray(updated) ? updated : users)
            } catch {
              // Fallback: update local state only
              setUsers(prev => prev.map(u => u.name === selectedUser?.name ? { ...u, pin: next } : u))
            }
            setEditSaving(false)
            setPhase('select')
            setSelectedUser(null)
            setPin('')
            setEditNewPin('')
          } else {
            triggerShake()
          }
        }, 80)
      }
    }
  }

  const handleBackspace = () => {
    if (shake) return
    if (phase === 'pin' || phase === 'editConfirmPin') setPin(p => p.slice(0, -1))
    else if (phase === 'editNewPin') setEditNewPin(p => p.slice(0, -1))
  }

  const selectUser = (user: AppUser) => {
    setSelectedUser(user)
    setPin('')
    setPhase('pin')
  }

  const goBack = () => {
    setPhase('select')
    setSelectedUser(null)
    setPin('')
    setEditNewPin('')
  }

  const startEdit = () => {
    setPin('')
    setEditNewPin('')
    setPhase('editNewPin')
  }

  // Which pin string to display in dots
  const activePinDisplay = phase === 'editNewPin' ? editNewPin : pin

  const pinLabel = phase === 'editNewPin'
    ? 'Enter new PIN'
    : phase === 'editConfirmPin'
    ? 'Confirm new PIN'
    : `Welcome, ${selectedUser?.name}`

  // Number pad layout
  const pad = ['1','2','3','4','5','6','7','8','9']

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-deep)',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 2000,
      overflowY: 'auto'
    }}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .pin-shake { animation: shake 0.5s ease; }
      `}</style>

      {/* ── User selection screen ── */}
      {phase === 'select' && (
        <div className="animate-fade-in" style={{ width: '90%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }} className="text-gradient">DietApp</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>Who's logging in?</p>
          </div>

          {loadingUsers ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', width: '100%' }}>
              {users.map((user, idx) => (
                <div key={user.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => selectUser(user)}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '28px',
                      background: avatarColors[idx % avatarColors.length],
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '2.2rem',
                      fontWeight: 800,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
                    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.94)')}
                    onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {user.name[0].toUpperCase()}
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{user.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PIN entry / Edit screens ── */}
      {(phase === 'pin' || phase === 'editNewPin' || phase === 'editConfirmPin') && (
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '0 1.5rem' }}>

          {/* Back button */}
          <button
            onClick={goBack}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: 0 }}
          >
            <ChevronLeft size={18} /> Back
          </button>

          {/* Avatar + label */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: avatarColors[users.findIndex(u => u.name === selectedUser?.name) % avatarColors.length] || avatarColors[0],
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedUser?.name[0].toUpperCase()}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)', textAlign: 'center' }}>
              {pinLabel}
            </div>
            {(phase === 'editNewPin' || phase === 'editConfirmPin') && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {phase === 'editNewPin' ? 'Choose a 4-digit PIN' : 'Re-enter to confirm'}
              </div>
            )}
          </div>

          {/* PIN dots */}
          <div
            className={shake ? 'pin-shake' : ''}
            style={{ display: 'flex', gap: '1rem' }}
          >
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: '18px',
                height: '18px',
                borderRadius: '6px',
                border: `2px solid ${shake ? 'var(--accent-pink)' : 'var(--primary)'}`,
                background: activePinDisplay.length > i
                  ? (shake ? 'var(--accent-pink)' : 'var(--primary)')
                  : 'transparent',
                transition: 'background 0.15s ease, border-color 0.15s ease'
              }} />
            ))}
          </div>

          {/* Number pad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', width: '100%' }}>
            {pad.map(d => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                style={{
                  height: '62px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-main)',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onMouseDown={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseUp={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onTouchStart={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onTouchEnd={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              >
                {d}
              </button>
            ))}

            {/* Bottom row: Edit | 0 | Backspace */}
            <button
              onClick={phase === 'pin' ? startEdit : goBack}
              style={{
                height: '62px',
                borderRadius: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {phase === 'pin' ? (
                <><Edit2 size={16} /><span>Edit PIN</span></>
              ) : (
                <><X size={16} /><span>Cancel</span></>
              )}
            </button>

            <button
              onClick={() => handleDigit('0')}
              style={{
                height: '62px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-main)',
                fontSize: '1.5rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.1s ease',
                WebkitTapHighlightColor: 'transparent'
              }}
              onMouseDown={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              onMouseUp={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onTouchStart={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              onTouchEnd={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            >
              0
            </button>

            <button
              onClick={handleBackspace}
              style={{
                height: '62px',
                borderRadius: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '1.3rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <Delete size={22} />
            </button>
          </div>

          {editSaving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem' }}>
              <Check size={16} /> Saving…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Login
