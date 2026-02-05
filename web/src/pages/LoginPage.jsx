import { useMemo, useState } from 'react'

import { createApi } from '../api/client'

export function LoginPage({ apiBaseUrl, onLogin, onGoRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const api = useMemo(
    () => createApi({ baseURL: apiBaseUrl, username, password }),
    [apiBaseUrl, username, password]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Enter username and password.')
      return
    }

    setLoading(true)
    try {
      // This endpoint requires auth. If credentials are wrong, it will 401.
      await api.listDatasets()
      onLogin({ apiUrl: apiBaseUrl, username, password })
    } catch (err) {
      const msg = err?.response?.status === 401
        ? 'Invalid credentials. Please try again.'
        : (err?.response?.data?.detail || err.message || 'Login failed')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authShell authShell--center">
      <div className="authCard">
        <div className="authBrand">
          <div className="authLogo">CE</div>
          <div>
            <h1 className="authTitle">Chemical Equipment Visualizer</h1>
            <p className="authSubtitle">Login to view dashboards and upload datasets</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="authForm">
          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your username"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="your password"
              type="password"
              autoComplete="current-password"
            />
          </label>

          {error ? <div className="alert">{error}</div> : null}

          <button className="primaryBtn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="authFooter">
            <span className="muted">No account yet?</span>{' '}
            <button type="button" className="linkBtn" onClick={onGoRegister}>
              Create one
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
