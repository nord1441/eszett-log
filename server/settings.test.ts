import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { settingsRouter } from './settings.js'
import { authenticateToken, AuthRequest } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

let settingsBackup: string | null = null
let usersBackup: string | null = null

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/settings', settingsRouter(authenticateToken))
  return app
}

function getToken(): string {
  // Login to get a token
  const jwt = require('jsonwebtoken')
  const secret = process.env.JWT_SECRET || 'eszett-log-secret-change-in-production'
  return jwt.sign({ username: 'admin' }, secret, { expiresIn: '1h' })
}

beforeEach(() => {
  // Backup existing files
  settingsBackup = fs.existsSync(SETTINGS_FILE)
    ? fs.readFileSync(SETTINGS_FILE, 'utf-8')
    : null
  usersBackup = fs.existsSync(USERS_FILE)
    ? fs.readFileSync(USERS_FILE, 'utf-8')
    : null

  // Ensure admin user exists
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const hash = bcrypt.hashSync('admin', 4) // low rounds for speed
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify([{ username: 'admin', passwordHash: hash }], null, 2)
  )

  // Remove settings file to start fresh
  if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE)
})

afterEach(() => {
  // Restore backups
  if (settingsBackup !== null) {
    fs.writeFileSync(SETTINGS_FILE, settingsBackup)
  } else if (fs.existsSync(SETTINGS_FILE)) {
    fs.unlinkSync(SETTINGS_FILE)
  }
  if (usersBackup !== null) {
    fs.writeFileSync(USERS_FILE, usersBackup)
  }
  vi.unstubAllEnvs()
})

describe('GET /api/settings', () => {
  it('returns default settings when no settings.json exists', async () => {
    const app = createApp()
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      siteTitle: 'eszett-log',
      defaultTheme: 'light',
      defaultFontSize: 'medium',
    })
  })

  it('returns saved settings from settings.json', async () => {
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify({ siteTitle: 'my-blog', defaultTheme: 'dark', defaultFontSize: 'large' })
    )
    const app = createApp()
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.siteTitle).toBe('my-blog')
    expect(res.body.defaultTheme).toBe('dark')
    expect(res.body.defaultFontSize).toBe('large')
  })

  it('uses environment variables as defaults when no settings.json', async () => {
    vi.stubEnv('SITE_TITLE', 'env-title')
    vi.stubEnv('DEFAULT_THEME', 'dark')
    vi.stubEnv('DEFAULT_FONT_SIZE', 'small')

    // Need to re-import to pick up env changes since getEnvDefaults reads process.env at call time
    const app = createApp()
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.siteTitle).toBe('env-title')
    expect(res.body.defaultTheme).toBe('dark')
    expect(res.body.defaultFontSize).toBe('small')
  })

  it('settings.json overrides environment variables', async () => {
    vi.stubEnv('SITE_TITLE', 'env-title')
    vi.stubEnv('DEFAULT_THEME', 'dark')

    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify({ siteTitle: 'file-title', defaultTheme: 'light', defaultFontSize: 'medium' })
    )

    const app = createApp()
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.siteTitle).toBe('file-title')
    expect(res.body.defaultTheme).toBe('light')
  })

  it('does not require authentication', async () => {
    const app = createApp()
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/settings', () => {
  it('requires authentication', async () => {
    const app = createApp()
    const res = await request(app)
      .put('/api/settings')
      .send({ siteTitle: 'new' })
    expect(res.status).toBe(401)
  })

  it('updates site title', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ siteTitle: 'new-title' })
    expect(res.status).toBe(200)
    expect(res.body.siteTitle).toBe('new-title')

    // Verify persisted
    const stored = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
    expect(stored.siteTitle).toBe('new-title')
  })

  it('updates default theme', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ defaultTheme: 'dark' })
    expect(res.status).toBe(200)
    expect(res.body.defaultTheme).toBe('dark')
  })

  it('updates default font size', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ defaultFontSize: 'large' })
    expect(res.status).toBe(200)
    expect(res.body.defaultFontSize).toBe('large')
  })

  it('ignores invalid theme values', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ defaultTheme: 'invalid' })
    expect(res.status).toBe(200)
    expect(res.body.defaultTheme).toBe('light') // stays default
  })

  it('ignores invalid font size values', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ defaultFontSize: 'huge' })
    expect(res.status).toBe(200)
    expect(res.body.defaultFontSize).toBe('medium') // stays default
  })
})

describe('PUT /api/settings/password', () => {
  it('requires authentication', async () => {
    const app = createApp()
    const res = await request(app)
      .put('/api/settings/password')
      .send({ currentPassword: 'admin', newPassword: 'newpass' })
    expect(res.status).toBe(401)
  })

  it('changes password with correct current password', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin', newPassword: 'newpass' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify new password works
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
    expect(bcrypt.compareSync('newpass', users[0].passwordHash)).toBe(true)
  })

  it('rejects incorrect current password', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpass' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('current password is incorrect')
  })

  it('rejects short password', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin', newPassword: 'ab' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('at least 4 characters')
  })

  it('rejects missing fields', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings/password')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
  })
})
