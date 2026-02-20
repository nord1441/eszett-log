import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { login } from '../lib/api'

interface LoginProps {
  onLogin: (username: string, token: string) => void
}

export function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')
  if (token) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await login(username, password)
      onLogin(res.username, res.token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'login failed')
    }
  }

  return (
    <div className="login">
      <h2 className="login__title">login</h2>
      {error && <div className="login__error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="editor__field">
          <label>username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="editor__field">
          <label>password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn btn--primary">
          login
        </button>
      </form>
    </div>
  )
}
