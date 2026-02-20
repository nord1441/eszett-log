import { Link } from 'react-router-dom'

interface HeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  user: string | null
  onLogout: () => void
}

export function Header({ theme, onToggleTheme, user, onLogout }: HeaderProps) {
  return (
    <header className="header">
      <Link to="/" className="header__logo">
        eszett<span>-</span>log
      </Link>
      <nav className="header__nav">
        {user && <Link to="/new">new</Link>}
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
