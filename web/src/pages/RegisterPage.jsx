import { useMemo, useState } from 'react'

import { createApi } from '../api/client'

export function RegisterPage({ apiBaseUrl, onRegistered, onGoLogin }) {
  const [apiUrl, setApiUrl] = useState(apiBaseUrl)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const api = useMemo(() => createApi({ baseURL: apiUrl }), [apiUrl])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!username || !password || !password2) {
      setError('Fill all fields.')
      return
    }

    setLoading(true)
    try {
      await api.register({ username, password, password2 })
      setSuccess('Account created successfully. You can now sign in.')
      onRegistered?.({ apiUrl, username, password })
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Registration failed'
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
            <h1 className="authTitle">Create account</h1>
            <p className="authSubtitle">Register to login and use the dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="authForm">
          <label className="field">
            <span>API Base URL</span>
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://127.0.0.1:8000/api"
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="choose a username"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="choose a password"
              type="password"
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="re-enter password"
              type="password"
              autoComplete="new-password"
            />
          </label>

          {error ? <div className="alert">{error}</div> : null}
          {success ? <div className="alert alert--success">{success}</div> : null}

          <button className="primaryBtn" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>

          <div className="authFooter">
            <span className="muted">Already have an account?</span>{' '}
            <button type="button" className="linkBtn" onClick={onGoLogin}>
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
