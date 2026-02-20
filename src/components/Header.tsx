import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { uploadPost, uploadImage } from '../lib/api'

interface HeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  fontSize: 'small' | 'medium' | 'large'
  onCycleFontSize: () => void
  user: string | null
  onLogout: () => void
  siteTitle: string
}

const FONT_LABEL = { small: 'A', medium: 'A', large: 'A' } as const
const FONT_SCALE = { small: 0.55, medium: 0.7, large: 0.85 } as const

export function Header({ theme, onToggleTheme, fontSize, onCycleFontSize, user, onLogout, siteTitle }: HeaderProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const fileArray = Array.from(files)
      const mdFile = fileArray.find((f) => f.name.endsWith('.md'))
      const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'))

      // Upload images first and build a name→url map
      const imageMap: Record<string, string> = {}
      for (const img of imageFiles) {
        const result = await uploadImage(img)
        imageMap[img.name] = result.url
      }

      if (mdFile) {
        let raw = await mdFile.text()

        // Replace image references in markdown with uploaded URLs
        for (const [name, url] of Object.entries(imageMap)) {
          // Match patterns like ![alt](./name), ![alt](name), ![alt](images/name)
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const pattern = new RegExp(
            `(!\\[[^\\]]*\\]\\()(?:\\.?\\/?)(?:[\\w-]+\\/)*${escaped}(\\))`,
            'g'
          )
          raw = raw.replace(pattern, `$1${url}$2`)
        }

        const result = await uploadPost(mdFile.name, raw)
        navigate(`/post/${result.slug}`)
      } else if (imageFiles.length > 0) {
        // If only images were selected, copy URLs to clipboard
        const urls = Object.values(imageMap)
        const md = urls.map((url) => `![](${url})`).join('\n')
        await navigator.clipboard.writeText(md)
        alert(`${urls.length} image(s) uploaded. Markdown copied to clipboard.`)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        {siteTitle}
      </Link>
      <nav className="header__nav">
        {user && (
          <>
            <Link to="/new">new</Link>
            <button onClick={handleUpload} disabled={uploading}>
              {uploading ? '...' : 'upload'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </>
        )}
        {user ? (
          <>
            <Link to="/admin">settings</Link>
            <button onClick={onLogout}>{user}</button>
          </>
        ) : (
          <Link to="/login">login</Link>
        )}
        <button
          className="theme-toggle"
          onClick={onCycleFontSize}
          aria-label="Change font size"
          style={{ fontSize: `${FONT_SCALE[fontSize]}rem` }}
        >
          {FONT_LABEL[fontSize]}
        </button>
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
