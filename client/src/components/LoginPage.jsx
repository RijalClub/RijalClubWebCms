import { useState } from 'react'

export function LoginPage({ onSubmit, loading }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setError('Enter both username and password.')
      return
    }

    setError('')

    try {
      await onSubmit({ username: username.trim(), password })
    } catch (apiError) {
      setError(apiError.message || 'Login failed.')
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Rijal Club</p>
        <h1>Content Admin</h1>
        <p className="muted">Master and editor access only. No public registration.</p>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              required
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
