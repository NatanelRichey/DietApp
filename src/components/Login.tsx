import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Edit2, Check } from 'lucide-react'

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
  const [users, setUsers]           = useState<AppUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [phase, setPhase]           = useState<Phase>('select')
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [pin, setPin]               = useState('')
  const [editNewPin, setEditNewPin] = useState('')
  const [shake, setShake]           = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const pinInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : FALLBACK_USERS); setLoadingUsers(false) })
      .catch(() => { setUsers(FALLBACK_USERS); setLoadingUsers(false) })
  }, [])

  // Auto-focus hidden input whenever we enter a PIN phase (brings up native keyboard)
  useEffect(() => {
    if (phase !== 'select') {
      const t = setTimeout(() => pinInputRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [phase])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => {
      setShake(false)
      setPin('')
      if (pinInputRef.current) { pinInputRef.current.value = ''; pinInputRef.current.focus() }
    }, 600)
  }

  const handlePinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (shake) { e.target.value = activePinDisplay; return }
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)

    if (phase === 'pin') {
      setPin(raw)
      if (raw.length === 4) {
        setTimeout(() => {
          if (raw === selectedUser?.pin) {
            onLogin(selectedUser.name)
          } else {
            if (pinInputRef.current) pinInputRef.current.value = ''
            triggerShake()
          }
        }, 80)
      }
    } else if (phase === 'editNewPin') {
      setEditNewPin(raw)
      if (raw.length === 4) {
        setTimeout(() => {
          setPhase('editConfirmPin')
          setPin('')
          if (pinInputRef.current) { pinInputRef.current.value = ''; pinInputRef.current.focus() }
        }, 80)
      }
    } else if (phase === 'editConfirmPin') {
      setPin(raw)
      if (raw.length === 4) {
        setTimeout(async () => {
          if (raw === editNewPin) {
            setEditSaving(true)
            try {
              const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'edit', name: selectedUser?.name, pin: raw }),
              })
              const updated = await res.json()
              setUsers(Array.isArray(updated) ? updated : users)
            } catch {
              setUsers(prev => prev.map(u => u.name === selectedUser?.name ? { ...u, pin: raw } : u))
            }
            setEditSaving(false)
            goBack()
          } else {
            if (pinInputRef.current) pinInputRef.current.value = ''
            triggerShake()
          }
        }, 80)
      }
    }
  }

  const selectUser = (user: AppUser) => {
    setSelectedUser(user)
    setPin('')
    setEditNewPin('')
    setPhase('pin')
  }

  const goBack = () => {
    setPhase('select')
    setSelectedUser(null)
    setPin('')
    setEditNewPin('')
    if (pinInputRef.current) pinInputRef.current.value = ''
  }

  const startEdit = () => {
    setPin('')
    setEditNewPin('')
    setPhase('editNewPin')
    if (pinInputRef.current) pinInputRef.current.value = ''
  }

  const activePinDisplay = phase === 'editNewPin' ? editNewPin : pin
  const avatarIdx = users.findIndex(u => u.name === selectedUser?.name)

  const pinLabel =
    phase === 'editNewPin'     ? 'Enter new PIN' :
    phase === 'editConfirmPin' ? 'Confirm new PIN' :
                                 `Welcome, ${selectedUser?.name}`

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', width: '100vw',
      background: 'var(--bg-deep)',
      position: 'fixed', top: 0, left: 0, zIndex: 2000, overflowY: 'auto',
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

      {/* ── User selection ── */}
      {phase === 'select' && (
        <div style={{ width: '90%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }} className="text-gradient">DietApp</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>Who's logging in?</p>
          </div>
          {loadingUsers ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', width: '100%' }}>
              {users.map((user, idx) => (
                <div key={user.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem' }}>
                  <button
                    onClick={() => selectUser(user)}
                    style={{
                      width: '90px', height: '90px', borderRadius: '28px',
                      background: avatarColors[idx % avatarColors.length],
                      border: 'none', cursor: 'pointer',
                      fontSize: '2.2rem', fontWeight: 800, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      transition: 'transform 0.15s ease',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.93)')}
                    onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {user.name[0].toUpperCase()}
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PIN entry ── */}
      {phase !== 'select' && (
        <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '0 1.5rem' }}>

          {/* Back */}
          <button
            onClick={goBack}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: 0 }}
          >
            <ChevronLeft size={18} /> Back
          </button>

          {/* Avatar + label */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '22px',
              background: avatarColors[avatarIdx >= 0 ? avatarIdx % avatarColors.length : 0],
              fontSize: '1.8rem', fontWeight: 800, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {selectedUser?.name[0].toUpperCase()}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}>{pinLabel}</div>
            {(phase === 'editNewPin' || phase === 'editConfirmPin') && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {phase === 'editNewPin' ? 'Choose a 4-digit PIN' : 'Re-enter to confirm'}
              </div>
            )}
          </div>

          {/* PIN dots + hidden native input */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
            {/* Dots */}
            <div
              className={shake ? 'pin-shake' : ''}
              style={{ display: 'flex', gap: '1.1rem', padding: '1rem 2rem' }}
              onClick={() => pinInputRef.current?.focus()}
            >
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  width: '18px', height: '18px',
                  borderRadius: '50%',
                  border: `2.5px solid ${shake ? 'var(--accent-pink)' : 'var(--primary)'}`,
                  background: activePinDisplay.length > i
                    ? (shake ? 'var(--accent-pink)' : 'var(--primary)')
                    : 'transparent',
                  transition: 'background 0.12s ease, transform 0.12s ease',
                  transform: activePinDisplay.length === i + 1 ? 'scale(1.15)' : 'scale(1)',
                }} />
              ))}
            </div>

            {/* Hidden input — triggers native keyboard */}
            <input
              ref={pinInputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              onChange={handlePinInput}
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0,
                fontSize: '16px', // prevents iOS auto-zoom
                border: 'none', background: 'transparent',
                color: 'transparent', caretColor: 'transparent',
                zIndex: 1,
              }}
            />
          </div>

          {/* Tap to type hint */}
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Tap the dots to open keypad
          </p>

          {/* Edit PIN link (only in normal pin phase) */}
          {phase === 'pin' && (
            <button
              onClick={startEdit}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Edit2 size={13} /> Change PIN
            </button>
          )}

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
