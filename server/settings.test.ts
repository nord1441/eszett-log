/**
 * Settings API テスト
 *
 * サーバー側の設定エンドポイント (/api/settings) の動作を検証する。
 * - 設定の取得 (GET): デフォルト値、永続化、環境変数フォールバック、認証不要
 * - 設定の更新 (PUT): 認証必須、各フィールドの更新、不正値の無視
 * - パスワード変更 (PUT /password): 認証必須、バリデーション、bcryptハッシュ更新
 */
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
  const jwt = require('jsonwebtoken')
  const secret = process.env.JWT_SECRET || 'eszett-log-secret-change-in-production'
  return jwt.sign({ username: 'admin' }, secret, { expiresIn: '1h' })
}

beforeEach(() => {
  // 既存ファイルをバックアップ
  settingsBackup = fs.existsSync(SETTINGS_FILE)
    ? fs.readFileSync(SETTINGS_FILE, 'utf-8')
    : null
  usersBackup = fs.existsSync(USERS_FILE)
    ? fs.readFileSync(USERS_FILE, 'utf-8')
    : null

  // テスト用adminユーザーを作成
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const hash = bcrypt.hashSync('admin', 4)
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify([{ username: 'admin', passwordHash: hash }], null, 2)
  )

  // settings.jsonを削除してクリーンな状態から開始
  if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE)
})

afterEach(() => {
  // バックアップを復元
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
  // settings.jsonが存在しない場合、ハードコードされたデフォルト値を返すことを確認
  it('returns default settings when no settings.json exists', async () => {
    const app = createApp()
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      siteTitle: 'eszett-log',
      defaultTheme: 'light',
      defaultFontSize: 'medium',
      defaultFontFamily: 'doto',
    })
  })

  // settings.jsonに保存された値が正しく返されることを確認
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

  // settings.jsonが無い場合、環境変数(SITE_TITLE, DEFAULT_THEME, DEFAULT_FONT_SIZE)がフォールバックとして使われることを確認
  it('uses environment variables as defaults when no settings.json', async () => {
    vi.stubEnv('SITE_TITLE', 'env-title')
    vi.stubEnv('DEFAULT_THEME', 'dark')
    vi.stubEnv('DEFAULT_FONT_SIZE', 'small')

    const app = createApp()
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.siteTitle).toBe('env-title')
    expect(res.body.defaultTheme).toBe('dark')
    expect(res.body.defaultFontSize).toBe('small')
  })

  // settings.jsonの値が環境変数より優先されることを確認（優先順位: settings.json > 環境変数）
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

  // 設定取得はトークン無しでもアクセス可能（公開エンドポイント）であることを確認
  it('does not require authentication', async () => {
    const app = createApp()
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/settings', () => {
  // トークン無しのリクエストが401で拒否されることを確認
  it('requires authentication', async () => {
    const app = createApp()
    const res = await request(app)
      .put('/api/settings')
      .send({ siteTitle: 'new' })
    expect(res.status).toBe(401)
  })

  // サイトタイトルを更新し、レスポンスとファイルの両方に反映されることを確認
  it('updates site title', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ siteTitle: 'new-title' })
    expect(res.status).toBe(200)
    expect(res.body.siteTitle).toBe('new-title')

    // ファイルに永続化されていることを確認
    const stored = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
    expect(stored.siteTitle).toBe('new-title')
  })

  // デフォルトテーマをdarkに変更できることを確認
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

  // デフォルトフォントサイズをlargeに変更できることを確認
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

  // 'light'/'dark'以外のテーマ値が無視され、既存値が維持されることを確認
  it('ignores invalid theme values', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ defaultTheme: 'invalid' })
    expect(res.status).toBe(200)
    expect(res.body.defaultTheme).toBe('light')
  })

  // 'small'/'medium'/'large'以外のフォントサイズ値が無視され、既存値が維持されることを確認
  it('ignores invalid font size values', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ defaultFontSize: 'huge' })
    expect(res.status).toBe(200)
    expect(res.body.defaultFontSize).toBe('medium')
  })
})

describe('PUT /api/settings/password', () => {
  // トークン無しのパスワード変更リクエストが401で拒否されることを確認
  it('requires authentication', async () => {
    const app = createApp()
    const res = await request(app)
      .put('/api/settings/password')
      .send({ currentPassword: 'admin', newPassword: 'newpass' })
    expect(res.status).toBe(401)
  })

  // 正しい現パスワードで変更が成功し、新パスワードのbcryptハッシュがファイルに保存されることを確認
  it('changes password with correct current password', async () => {
    const app = createApp()
    const token = getToken()
    const res = await request(app)
      .put('/api/settings/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin', newPassword: 'newpass' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // 新パスワードのハッシュが保存されていることを確認
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
    expect(bcrypt.compareSync('newpass', users[0].passwordHash)).toBe(true)
  })

  // 誤った現パスワードで401エラーが返されることを確認
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

  // 4文字未満の新パスワードが400エラーで拒否されることを確認
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

  // currentPassword・newPasswordが両方欠如している場合に400エラーが返されることを確認
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
