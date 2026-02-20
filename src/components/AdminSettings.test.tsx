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
  it('renders nothing when user is null', () => {
    const { container } = renderAdmin(null)
    expect(container.querySelector('.admin-settings')).not.toBeInTheDocument()
  })

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

  it('has site title input field', async () => {
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByDisplayValue('eszett-log')).toBeInTheDocument()
    })
  })

  it('has theme selection buttons (light/dark)', async () => {
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByText('light')).toBeInTheDocument()
    })
    expect(screen.getByText('dark')).toBeInTheDocument()
  })

  it('has font size selection buttons (small/medium/large)', async () => {
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByText('small')).toBeInTheDocument()
    })
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('large')).toBeInTheDocument()
  })

  it('has password change form with three fields', async () => {
    renderAdmin()
    await waitFor(() => {
      expect(screen.getByText('settings')).toBeInTheDocument()
    })
    expect(screen.getByText('current password')).toBeInTheDocument()
    expect(screen.getByText('new password')).toBeInTheDocument()
    expect(screen.getByText('confirm new password')).toBeInTheDocument()
    // All three have corresponding input fields
    const passwordInputs = screen.getAllByDisplayValue('')
    const passwordFields = passwordInputs.filter((el) => el.getAttribute('type') === 'password')
    expect(passwordFields).toHaveLength(3)
  })

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

  it('shows error when passwords do not match', async () => {
    renderAdmin()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('settings')).toBeInTheDocument()
    })

    const inputs = screen.getAllByDisplayValue('')
    const pwInputs = inputs.filter((el) => el.getAttribute('type') === 'password')
    // pwInputs: [current, new, confirm]
    await user.type(pwInputs[0], 'admin')
    await user.type(pwInputs[1], 'newpass')
    await user.type(pwInputs[2], 'different')
    await user.click(screen.getByText('change'))

    await waitFor(() => {
      expect(screen.getByText('passwords do not match')).toBeInTheDocument()
    })
    expect(changePassword).not.toHaveBeenCalled()
  })

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
