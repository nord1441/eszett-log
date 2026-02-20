import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { uploadPost } from '../lib/api'

interface HeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  user: string | null
  onLogout: () => void
}

export function Header({ theme, onToggleTheme, user, onLogout }: HeaderProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const raw = await file.text()
      const result = await uploadPost(file.name, raw)
      navigate(`/post/${result.slug}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'upload failed')
    }

    // Reset so the same file can be selected again
    e.target.value = ''
  }

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        eszett<span>-</span>log
      </Link>
      <nav className="header__nav">
        {user && (
          <>
            <Link to="/new">new</Link>
            <button onClick={handleUpload}>upload</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </>
        )}
        {user ? (
          <button onClick={onLogout}>{user}</button>
        ) : (
          <Link to="/login">login</Link>
        )}
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '●' : '○'}
        </button>
      </nav>
    </header>
  )
}
