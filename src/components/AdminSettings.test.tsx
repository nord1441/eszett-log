/**
 * AdminSettings コンポーネント テスト
 *
 * 管理者設定画面 (/admin) の表示・操作を検証する。
 * - 未ログイン時の非表示
 * - 設定値のロードと表示（サイトタイトル、テーマ、フォントサイズ）
 * - パスワード変更フォームの存在
 * - 設定保存時のAPI呼び出しとコールバック
 * - パスワード不一致バリデーション
 * - 正常なパスワード変更フロー
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminSettings } from './AdminSettings'

vi.mock('../lib/api', () => ({
  fetchSettings: vi.fn(),
  updateSettings: vi.fn(),
  changePassword: vi.fn(),
}))

const { fetchSettings, updateSettings, changePassword } = await import('../lib/api')

const defaultSettings = {
  siteTitle: 'eszett-log',
  defaultTheme: 'light' as const,
  defaultFontSize: 'medium' as const,

}

function renderAdmin(user: string | null = 'admin') {
  const onSettingsChange = vi.fn()
  const result = render(
    <MemoryRouter>
      <AdminSettings user={user} onSettingsChange={onSettingsChange} />
    </MemoryRouter>
  )
  return { ...result, onSettingsChange }
}

beforeEach(() => {
  vi.mocked(fetchSettings).mockResolvedValue({ ...defaultSettings })
  vi.mocked(updateSettings).mockResolvedValue({ ...defaultSettings })
  vi.mocked(changePassword).mockResolvedValue(undefined)
})

describe('AdminSettings', () => {
  // 未ログイン (user=null) の場合、設定画面が描画されないことを確認
  it('renders nothing when user is null', () => {
    const { container } = renderAdmin(null)
    expect(container.querySelector('.admin-settings')).not.toBeInTheDocument()
  })

  // fetchSettingsで取得した設定値がフォームに正しく表示されることを確認
  it('loads and displays current settings', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'my-blog',
      defaultTheme: 'dark',
      defaultFontSize: 'large',

    })
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByDisplayValue('my-blog')).toBeInTheDocument()
    })
  })

  // サイトタイトルの入力フィールドが存在し、デフォルト値が表示されることを確認
  it('has site title input field', async () => {
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByDisplayValue('eszett-log')).toBeInTheDocument()
    })
  })

  // デフォルトテーマの選択ボタン (light/dark) が存在することを確認
  it('has theme selection buttons (light/dark)', async () => {
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByText('light')).toBeInTheDocument()
    })
    expect(screen.getByText('dark')).toBeInTheDocument()
  })

  // デフォルトフォントサイズの選択ボタン (small/medium/large) が存在することを確認
  it('has font size selection buttons (small/medium/large)', async () => {
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByText('small')).toBeInTheDocument()
    })
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('large')).toBeInTheDocument()
  })

  // パスワード変更フォームに3つのパスワード入力フィールド（現在・新規・確認）が存在することを確認
  it('has password change form with three fields', async () => {
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByText('settings')).toBeInTheDocument()
    })
    expect(screen.getByText('current password')).toBeInTheDocument()
    expect(screen.getByText('new password')).toBeInTheDocument()
    expect(screen.getByText('confirm new password')).toBeInTheDocument()
    const passwordInputs = screen.getAllByDisplayValue('')
    const passwordFields = passwordInputs.filter((el) => el.getAttribute('type') === 'password')
    expect(passwordFields).toHaveLength(3)
  })

  // saveボタン押下でupdateSettings APIが呼ばれ、onSettingsChangeコールバックに更新後の値が渡されることを確認
  it('saves settings and calls onSettingsChange', async () => {
    const updated = { ...defaultSettings, siteTitle: 'new-title' }
    vi.mocked(updateSettings).mockResolvedValue(updated)
    const { onSettingsChange } = renderAdmin()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByDisplayValue('eszett-log')).toBeInTheDocument()
    })

    const titleInput = screen.getByDisplayValue('eszett-log')
    await user.clear(titleInput)
    await user.type(titleInput, 'new-title')
    await user.click(screen.getByText('save'))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalled()
      expect(onSettingsChange).toHaveBeenCalledWith(updated)
      expect(screen.getByText('saved')).toBeInTheDocument()
    })
  })

  // 新パスワードと確認パスワードが一致しない場合、APIを呼ばずにエラーメッセージを表示することを確認
  it('shows error when passwords do not match', async () => {
    renderAdmin()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('settings')).toBeInTheDocument()
    })

    const inputs = screen.getAllByDisplayValue('')
    const pwInputs = inputs.filter((el) => el.getAttribute('type') === 'password')
    await user.type(pwInputs[0], 'admin')
    await user.type(pwInputs[1], 'newpass')
    await user.type(pwInputs[2], 'different')
    await user.click(screen.getByText('change'))

    await waitFor(() => {
      expect(screen.getByText('passwords do not match')).toBeInTheDocument()
    })
    expect(changePassword).not.toHaveBeenCalled()
  })

  // パスワードが一致する場合、changePassword APIが正しい引数で呼ばれ、成功メッセージが表示されることを確認
  it('calls changePassword API on valid submission', async () => {
    renderAdmin()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('settings')).toBeInTheDocument()
    })

    const inputs = screen.getAllByDisplayValue('')
    const pwInputs = inputs.filter((el) => el.getAttribute('type') === 'password')
    await user.type(pwInputs[0], 'admin')
    await user.type(pwInputs[1], 'newpass')
    await user.type(pwInputs[2], 'newpass')
    await user.click(screen.getByText('change'))

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith('admin', 'newpass')
      expect(screen.getByText('password changed')).toBeInTheDocument()
    })
  })
})
