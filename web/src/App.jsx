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

  const api = useMemo(() => {
    if (!session?.apiUrl || !session?.username || !session?.password) return null
    return createApi({ baseURL: session.apiUrl, username: session.username, password: session.password })
  }, [session])

  if (!session || !api) {
    if (authView === 'register') {
      return (
        <RegisterPage
          apiBaseUrl={defaultApiBaseUrl}
          onRegistered={() => {
            // After successful registration, bring user back to login.
            setAuthView('login')
          }}
          onGoLogin={() => setAuthView('login')}
        />
      )
    }

    return (
      <LoginPage
        apiBaseUrl={defaultApiBaseUrl}
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
      onLogout={() => {
        localStorage.removeItem('session')
        setSession(null)
      }}
    />
  )
}

export default App
