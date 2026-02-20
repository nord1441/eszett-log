import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { ScrollIndicator } from './components/ScrollIndicator'
import { PageTransition } from './components/PageTransition'
import { PostList } from './components/PostList'
import { PostView } from './components/PostView'
import { Editor } from './components/Editor'
import { Login } from './components/Login'
import { checkAuth } from './lib/api'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    checkAuth().then((res) => {
      if (res) setUser(res.username)
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  const handleLogin = useCallback((username: string, token: string) => {
    localStorage.setItem('token', token)
    setUser(username)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  return (
    <>
      <ScrollIndicator />
      <div className="container">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
        />
        <main>
          <PageTransition>
            <Routes>
              <Route path="/" element={<PostList />} />
              <Route
                path="/post/:slug"
                element={<PostView user={user} />}
              />
              <Route
                path="/new"
                element={<Editor user={user} />}
              />
              <Route
                path="/edit/:slug"
                element={<Editor user={user} />}
              />
              <Route
                path="/login"
                element={<Login onLogin={handleLogin} />}
              />
            </Routes>
          </PageTransition>
        </main>
        <footer className="footer">
          eszett-log
        </footer>
      </div>
    </>
  )
}
