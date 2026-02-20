import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { AuthRequest } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json')
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json')

interface Settings {
  siteTitle: string
  defaultTheme: 'light' | 'dark'
}

const DEFAULT_SETTINGS: Settings = {
  siteTitle: 'eszett-log',
  defaultTheme: 'light',
}

function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getSettings(): Settings {
  ensureDataDir()
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2))
    return { ...DEFAULT_SETTINGS }
  }
  return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) }
}

function saveSettings(settings: Settings) {
  ensureDataDir()
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

export function settingsRouter(
  authenticateToken: (req: AuthRequest, res: Response, next: () => void) => void
) {
  const router = Router()

  // Public: get settings
  router.get('/', (_req, res: Response) => {
    const settings = getSettings()
    res.json(settings)
  })

  // Protected: update settings
  router.put('/', authenticateToken, (req: AuthRequest, res: Response) => {
    const current = getSettings()
    const { siteTitle, defaultTheme } = req.body

    if (siteTitle !== undefined) current.siteTitle = String(siteTitle)
    if (defaultTheme === 'light' || defaultTheme === 'dark') {
      current.defaultTheme = defaultTheme
    }

    saveSettings(current)
    res.json(current)
  })

  // Protected: change password
  router.put('/password', authenticateToken, (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'currentPassword and newPassword required' })
      return
    }
    if (newPassword.length < 4) {
      res.status(400).json({ error: 'password must be at least 4 characters' })
      return
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
    const user = users.find((u: { username: string }) => u.username === req.user?.username)
    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: 'current password is incorrect' })
      return
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10)
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
    res.json({ ok: true })
  })

  return router
}
