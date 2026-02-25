/**
 * App コンポーネント テスト
 *
 * アプリ全体の初期化・状態管理を検証する。
 * - デフォルトテーマ: サーバー設定の反映、localStorage優先、マウント時の書き込み防止
 * - デフォルトフォントサイズ: 同様のサーバー設定反映とlocalStorage優先ロジック
 * - サイトタイトル: サーバーから取得した値がヘッダーとフッターに表示される
 * - ヘッダーナビゲーション: ログイン状態に応じたsettingsリンクの表示/非表示
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

vi.mock('./lib/api', () => ({
  checkAuth: vi.fn(),
  fetchSettings: vi.fn(),
  fetchPosts: vi.fn(),
}))

const { checkAuth, fetchSettings, fetchPosts } = await import('./lib/api')

beforeEach(() => {
  localStorage.clear()
  vi.mocked(checkAuth).mockResolvedValue(null)
  vi.mocked(fetchPosts).mockResolvedValue([])
  vi.mocked(fetchSettings).mockResolvedValue({
    siteTitle: 'eszett-log',
    defaultTheme: 'light',
    defaultFontSize: 'medium',
    defaultFontFamily: 'doto',
  })
})

afterEach(() => {
  localStorage.clear()
})

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  )
}

describe('App default theme from server', () => {
  // localStorageにテーマが未保存の場合、サーバーのdefaultThemeがDOMに反映されることを確認
  it('applies server default theme when no localStorage', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'dark',
      defaultFontSize: 'medium',
      defaultFontFamily: 'doto',
    })
    renderApp()
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })

  // localStorageに保存されたテーマがサーバーのデフォルトより優先されることを確認
  it('respects localStorage theme over server default', async () => {
    localStorage.setItem('theme', 'light')
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'dark',
      defaultFontSize: 'medium',
      defaultFontFamily: 'doto',
    })
    renderApp()
    await waitFor(() => {
      expect(fetchSettings).toHaveBeenCalled()
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  // 初回マウント時にlocalStorageへテーマが書き込まれないことを確認
  // （この書き込みが起きると、新規タブでサーバーデフォルトが無視されるバグの原因になる）
  it('does not write to localStorage on initial mount', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'dark',
      defaultFontSize: 'medium',
      defaultFontFamily: 'doto',
    })
    renderApp()
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
    expect(localStorage.getItem('theme')).toBeNull()
  })

  // ユーザーがテーマトグルボタンをクリックした時のみlocalStorageに書き込まれることを確認
  it('writes to localStorage only when user toggles theme', async () => {
    renderApp()
    await waitFor(() => {
      expect(fetchSettings).toHaveBeenCalled()
    })

    const user = userEvent.setup()
    const themeBtn = screen.getByLabelText('Toggle theme')
    await user.click(themeBtn)

    expect(localStorage.getItem('theme')).not.toBeNull()
  })
})

describe('App default font size from server', () => {
  // localStorageにフォントサイズが未保存の場合、サーバーのdefaultFontSizeが反映されることを確認
  it('applies server default font size when no localStorage', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'light',
      defaultFontSize: 'large',
      defaultFontFamily: 'doto',
    })
    renderApp()
    await waitFor(() => {
      expect(document.documentElement.style.fontSize).toBe('20px')
    })
  })

  // localStorageに保存されたフォントサイズがサーバーのデフォルトより優先されることを確認
  it('respects localStorage font size over server default', async () => {
    localStorage.setItem('fontSize', 'small')
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'light',
      defaultFontSize: 'large',
      defaultFontFamily: 'doto',
    })
    renderApp()
    await waitFor(() => {
      expect(fetchSettings).toHaveBeenCalled()
    })
    expect(document.documentElement.style.fontSize).toBe('16px')
  })

  // 初回マウント時にlocalStorageへフォントサイズが書き込まれないことを確認（テーマと同様のバグ防止）
  it('does not write fontSize to localStorage on initial mount', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'light',
      defaultFontSize: 'large',
      defaultFontFamily: 'doto',
    })
    renderApp()
    await waitFor(() => {
      expect(document.documentElement.style.fontSize).toBe('20px')
    })
    expect(localStorage.getItem('fontSize')).toBeNull()
  })
})

describe('App site title from server', () => {
  // サーバーから取得したサイトタイトルがヘッダーとフッターの両方に表示されることを確認
  it('displays server site title in header and footer', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'my-custom-blog',
      defaultTheme: 'light',
      defaultFontSize: 'medium',
      defaultFontFamily: 'doto',
    })
    renderApp()
    await waitFor(() => {
      const matches = screen.getAllByText('my-custom-blog')
      expect(matches.length).toBeGreaterThanOrEqual(2) // header + footer
    })
  })
})

describe('Header navigation', () => {
  // ログイン済みの場合、/adminへのsettingsリンクが表示されることを確認
  it('shows settings link when logged in', async () => {
    vi.mocked(checkAuth).mockResolvedValue({ username: 'admin' })
    renderApp()
    await waitFor(() => {
      expect(screen.getByText('settings')).toBeInTheDocument()
    })
    const settingsLink = screen.getByText('settings')
    expect(settingsLink.closest('a')).toHaveAttribute('href', '/admin')
  })

  // 未ログインの場合、settingsリンクが表示されないことを確認
  it('does not show settings link when logged out', async () => {
    renderApp()
    await waitFor(() => {
      expect(fetchSettings).toHaveBeenCalled()
    })
    expect(screen.queryByText('settings')).not.toBeInTheDocument()
  })
})
