import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchSettings,
  updateSettings,
  changePassword,
  SiteSettings,
} from '../lib/api'

interface AdminSettingsProps {
  user: string | null
  onSettingsChange: (settings: SiteSettings) => void
}

type FontSize = 'small' | 'medium' | 'large'

export function AdminSettings({ user, onSettingsChange }: AdminSettingsProps) {
  const navigate = useNavigate()

  const [siteTitle, setSiteTitle] = useState('')
  const [defaultTheme, setDefaultTheme] = useState<'light' | 'dark'>('light')
  const [defaultFontSize, setDefaultFontSize] = useState<FontSize>('medium')
  const [settingsMsg, setSettingsMsg] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchSettings().then((s) => {
      setSiteTitle(s.siteTitle)
      setDefaultTheme(s.defaultTheme)
      setDefaultFontSize(s.defaultFontSize)
    })
  }, [user, navigate])

  const handleSettingsSave = async (e: FormEvent) => {
    e.preventDefault()
    setSettingsMsg('')
    try {
      const updated = await updateSettings({ siteTitle, defaultTheme, defaultFontSize })
      onSettingsChange(updated)
      setSettingsMsg('saved')
    } catch (err) {
      setSettingsMsg(err instanceof Error ? err.message : 'failed')
    }
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordMsg('')
    if (newPassword !== confirmPassword) {
      setPasswordMsg('passwords do not match')
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg('password changed')
    } catch (err) {
      setPasswordMsg(err instanceof Error ? err.message : 'failed')
    }
  }

  if (!user) return null

  return (
    <div className="admin-settings">
      <h1 className="admin-settings__title">settings</h1>

      <form onSubmit={handleSettingsSave} className="admin-settings__section">
        <h2 className="admin-settings__heading">site</h2>
        <div className="editor__field">
          <label>site title</label>
          <input
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
          />
        </div>
        <div className="editor__field">
          <label>default theme</label>
          <div className="admin-settings__theme-select">
            <button
              type="button"
              className={`btn btn--theme${defaultTheme === 'light' ? ' btn--theme-active' : ''}`}
              onClick={() => setDefaultTheme('light')}
            >
              light
            </button>
            <button
              type="button"
              className={`btn btn--theme${defaultTheme === 'dark' ? ' btn--theme-active' : ''}`}
              onClick={() => setDefaultTheme('dark')}
            >
              dark
            </button>
          </div>
        </div>
        <div className="editor__field">
          <label>default font size</label>
          <div className="admin-settings__theme-select">
            {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
              <button
                key={size}
                type="button"
                className={`btn btn--theme${defaultFontSize === size ? ' btn--theme-active' : ''}`}
                onClick={() => setDefaultFontSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-settings__actions">
          <button type="submit" className="btn btn--primary">
            save
          </button>
          {settingsMsg && (
            <span className="admin-settings__msg">{settingsMsg}</span>
          )}
        </div>
      </form>

      <form onSubmit={handlePasswordChange} className="admin-settings__section">
        <h2 className="admin-settings__heading">password</h2>
        <div className="editor__field">
          <label>current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="editor__field">
          <label>new password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="editor__field">
          <label>confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="admin-settings__actions">
          <button type="submit" className="btn btn--primary">
            change
          </button>
          {passwordMsg && (
            <span className="admin-settings__msg">{passwordMsg}</span>
          )}
        </div>
      </form>
    </div>
  )
}
