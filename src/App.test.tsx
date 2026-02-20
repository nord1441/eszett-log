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
  it('applies server default theme when no localStorage', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'dark',
      defaultFontSize: 'medium',
    })
    renderApp()
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })

  it('respects localStorage theme over server default', async () => {
    localStorage.setItem('theme', 'light')
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'dark',
      defaultFontSize: 'medium',
    })
    renderApp()
    await waitFor(() => {
      expect(fetchSettings).toHaveBeenCalled()
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('does not write to localStorage on initial mount', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'dark',
      defaultFontSize: 'medium',
    })
    renderApp()
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
    // localStorage should NOT have theme set (only set on explicit toggle)
    expect(localStorage.getItem('theme')).toBeNull()
  })

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
  it('applies server default font size when no localStorage', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'light',
      defaultFontSize: 'large',
    })
    renderApp()
    await waitFor(() => {
      expect(document.documentElement.style.fontSize).toBe('20px')
    })
  })

  it('respects localStorage font size over server default', async () => {
    localStorage.setItem('fontSize', 'small')
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'light',
      defaultFontSize: 'large',
    })
    renderApp()
    await waitFor(() => {
      expect(fetchSettings).toHaveBeenCalled()
    })
    expect(document.documentElement.style.fontSize).toBe('16px')
  })

  it('does not write fontSize to localStorage on initial mount', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'eszett-log',
      defaultTheme: 'light',
      defaultFontSize: 'large',
    })
    renderApp()
    await waitFor(() => {
      expect(document.documentElement.style.fontSize).toBe('20px')
    })
    expect(localStorage.getItem('fontSize')).toBeNull()
  })
})

describe('App site title from server', () => {
  it('displays server site title in header and footer', async () => {
    vi.mocked(fetchSettings).mockResolvedValue({
      siteTitle: 'my-custom-blog',
      defaultTheme: 'light',
      defaultFontSize: 'medium',
    })
    renderApp()
    await waitFor(() => {
      const matches = screen.getAllByText('my-custom-blog')
      expect(matches.length).toBeGreaterThanOrEqual(2) // header + footer
    })
  })
})

describe('Header navigation', () => {
  it('shows settings link when logged in', async () => {
    vi.mocked(checkAuth).mockResolvedValue({ username: 'admin' })
    renderApp()
    await waitFor(() => {
      expect(screen.getByText('settings')).toBeInTheDocument()
    })
    const settingsLink = screen.getByText('settings')
    expect(settingsLink.closest('a')).toHaveAttribute('href', '/admin')
  })

  it('does not show settings link when logged out', async () => {
    renderApp()
    await waitFor(() => {
      expect(fetchSettings).toHaveBeenCalled()
    })
    expect(screen.queryByText('settings')).not.toBeInTheDocument()
  })
})
