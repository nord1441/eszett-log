import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PostView } from './PostView'

vi.mock('../lib/api', () => ({
  fetchPost: vi.fn(),
  deletePost: vi.fn(),
}))

const { fetchPost } = await import('../lib/api')

const mockPost = {
  slug: 'test-post',
  title: 'Test Post',
  date: '2025-01-01',
  tags: ['tag1'],
  content: 'hello world',
}

function renderPostView(user: string | null) {
  return render(
    <MemoryRouter initialEntries={['/post/test-post']}>
      <Routes>
        <Route path="/post/:slug" element={<PostView user={user} />} />
        <Route path="/edit/:slug" element={<div>edit page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.mocked(fetchPost).mockResolvedValue(mockPost)
})

describe('PostView action buttons', () => {
  it('does not show edit/delete buttons for anonymous users', async () => {
    renderPostView(null)
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    expect(screen.queryByText('edit')).not.toBeInTheDocument()
    expect(screen.queryByText('delete')).not.toBeInTheDocument()
  })

  it('shows edit and delete buttons for logged-in users', async () => {
    renderPostView('admin')
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    expect(screen.getByText('edit')).toBeInTheDocument()
    expect(screen.getByText('delete')).toBeInTheDocument()
  })

  it('both edit and delete are <button> elements (consistent sizing)', async () => {
    renderPostView('admin')
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    const editBtn = screen.getByText('edit')
    const deleteBtn = screen.getByText('delete')
    expect(editBtn.tagName).toBe('BUTTON')
    expect(deleteBtn.tagName).toBe('BUTTON')
  })

  it('edit and delete buttons are siblings in the same container', async () => {
    renderPostView('admin')
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    const editBtn = screen.getByText('edit')
    const deleteBtn = screen.getByText('delete')
    expect(editBtn.parentElement).toBe(deleteBtn.parentElement)
    expect(editBtn.parentElement?.className).toContain('post-view__actions')
  })
})
