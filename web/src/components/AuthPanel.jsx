import { useState } from 'react'

export function AuthPanel({ username, password, onChange }) {
  const [u, setU] = useState(username || '')
  const [p, setP] = useState(password || '')

  return (
    <div className="card">
      <h3>Basic Auth</h3>
      <div className="row">
        <label>
          Username
          <input value={u} onChange={(e) => setU(e.target.value)} placeholder="admin" />
        </label>
        <label>
          Password
          <input
            value={p}
            onChange={(e) => setP(e.target.value)}
            type="password"
            placeholder="your password"
          />
        </label>
        <button
          onClick={() => onChange({ username: u, password: p })}
          disabled={!u || !p}
        >
          Save
        </button>
      </div>
      <p className="muted">
        Uses HTTP Basic Auth against Django users (create via `python manage.py createsuperuser`).
      </p>
    </div>
  )
}
