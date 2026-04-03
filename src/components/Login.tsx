import { useState } from 'react'
import { User, Lock } from 'lucide-react'

interface LoginProps {
  onLogin: (user: string) => void
}

const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const users: Record<string, string> = {
    'Natan': '9442',
    'Simha': '1994'
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (users[username] === password) {
      onLogin(username)
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-deep)',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 2000
    }}>
      <form 
        onSubmit={handleLogin}
        className="card glass animate-fade-in"
        style={{
          width: '90%',
          maxWidth: '400px',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          textAlign: 'center'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }} className="text-gradient">Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter your credentials to continue</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
              <input
                type="text"
                placeholder="User"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'var(--border-glass)',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
              <input
                type="password"
                placeholder="••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'var(--border-glass)',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>
        </div>

        {error && <p style={{ color: 'var(--accent-pink)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}

        <button 
          type="submit" 
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '1.2rem', marginTop: '0.5rem' }}
        >
          Login
        </button>
      </form>
    </div>
  )
}

export default Login
