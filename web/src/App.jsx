import './App.css'
import { useMemo, useState } from 'react'

import { createApi } from './api/client'
import { Dashboard } from './pages/Dashboard'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

  const [authView, setAuthView] = useState('login')

  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('session') || 'null')
    } catch {
      return null
    }
  })

  // Keep a single configured API base URL for auth screens.
  // Login no longer shows/edits the URL, but Register does.
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl)

  const api = useMemo(() => {
    if (!session?.apiUrl || !session?.username || !session?.password) return null
    return createApi({ baseURL: session.apiUrl, username: session.username, password: session.password })
  }, [session])

  if (!session || !api) {
    if (authView === 'register') {
      return (
        <RegisterPage
          apiBaseUrl={apiBaseUrl}
          onRegistered={(info) => {
            if (info?.apiUrl) setApiBaseUrl(info.apiUrl)
            // After successful registration, bring user back to login.
            setAuthView('login')
          }}
          onGoLogin={() => setAuthView('login')}
        />
      )
    }

    return (
      <LoginPage
        apiBaseUrl={apiBaseUrl}
        onLogin={(next) => {
          localStorage.setItem('session', JSON.stringify(next))
          setSession(next)
        }}
        onGoRegister={() => setAuthView('register')}
      />
    )
  }

  return (
    <Dashboard
      api={api}
      apiBaseUrl={session.apiUrl}
      username={session.username}
      onLogout={() => {
        localStorage.removeItem('session')
        setSession(null)
      }}
    />
  )
}

export default App
