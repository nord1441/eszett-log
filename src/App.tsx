import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { ScrollIndicator } from './components/ScrollIndicator'
import { PageTransition } from './components/PageTransition'
import { PostList } from './components/PostList'
import { PostView } from './components/PostView'
import { Editor } from './components/Editor'
import { Login } from './components/Login'
import { AdminSettings } from './components/AdminSettings'
import { checkAuth, fetchSettings, SiteSettings, FontFamily } from './lib/api'

type Theme = 'light' | 'dark'
type FontSize = 'small' | 'medium' | 'large'

const FONT_SIZES: Record<FontSize, number> = {
  small: 16,
  medium: 18,
  large: 20,
}

const FONT_FAMILY_CSS: Record<FontFamily, string> = {
  doto: "'Doto', monospace",
  'helvetica-ultra-compressed': "'Helvetica Ultra Compressed', 'Arial Narrow', sans-serif",
}

const VALID_FONT_FAMILIES: FontFamily[] = ['doto', 'helvetica-ultra-compressed']

function getSavedTheme(): Theme | null {
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  return null
}

function getSavedFontSize(): FontSize | null {
  const saved = localStorage.getItem('fontSize') as FontSize | null
  if (saved && saved in FONT_SIZES) return saved
  return null
}

function getSavedFontFamily(): FontFamily | null {
  const saved = localStorage.getItem('fontFamily') as FontFamily | null
  if (saved && VALID_FONT_FAMILIES.includes(saved)) return saved
  return null
}

export function App() {
  const [theme, setTheme] = useState<Theme>(getSavedTheme() ?? 'light')
  const [fontSize, setFontSize] = useState<FontSize>(getSavedFontSize() ?? 'medium')
  const [fontFamily, setFontFamily] = useState<FontFamily>(getSavedFontFamily() ?? 'doto')
  const [user, setUser] = useState<string | null>(null)
  const [siteTitle, setSiteTitle] = useState('eszett-log')

  // Apply theme to DOM (no localStorage write here)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Apply font size to DOM (no localStorage write here)
  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[fontSize]}px`
  }, [fontSize])

  // Apply font family to DOM (no localStorage write here)
  useEffect(() => {
    document.documentElement.style.setProperty('--font-family', FONT_FAMILY_CSS[fontFamily])
  }, [fontFamily])

  // Load auth + server settings on mount
  useEffect(() => {
    checkAuth().then((res) => {
      if (res) setUser(res.username)
    })
    fetchSettings().then((s) => {
      setSiteTitle(s.siteTitle)
      // Only apply server defaults when user hasn't explicitly chosen
      if (!getSavedTheme()) {
        setTheme(s.defaultTheme)
      }
      if (!getSavedFontSize()) {
        setFontSize(s.defaultFontSize)
      }
      if (!getSavedFontFamily()) {
        setFontFamily(s.defaultFontFamily)
      }
    }).catch(() => {})
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      return next
    })
  }, [])

  const cycleFontSize = useCallback(() => {
    setFontSize((s) => {
      const next = s === 'small' ? 'medium' : s === 'medium' ? 'large' : 'small'
      localStorage.setItem('fontSize', next)
      return next
    })
  }, [])

  const cycleFontFamily = useCallback(() => {
    setFontFamily((f) => {
      const idx = VALID_FONT_FAMILIES.indexOf(f)
      const next = VALID_FONT_FAMILIES[(idx + 1) % VALID_FONT_FAMILIES.length]
      localStorage.setItem('fontFamily', next)
      return next
    })
  }, [])

  const handleLogin = useCallback((username: string, token: string) => {
    localStorage.setItem('token', token)
    setUser(username)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  const handleSettingsChange = useCallback((settings: SiteSettings) => {
    setSiteTitle(settings.siteTitle)
  }, [])

  return (
    <>
      <ScrollIndicator />
      <div className="container">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          fontSize={fontSize}
          onCycleFontSize={cycleFontSize}
          fontFamily={fontFamily}
          onCycleFontFamily={cycleFontFamily}
          user={user}
          onLogout={handleLogout}
          siteTitle={siteTitle}
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
              <Route
                path="/admin"
                element={
                  <AdminSettings
                    user={user}
                    onSettingsChange={handleSettingsChange}
                  />
                }
              />
            </Routes>
          </PageTransition>
        </main>
        <footer className="footer">
          {siteTitle}
        </footer>
      </div>
    </>
  )
}
