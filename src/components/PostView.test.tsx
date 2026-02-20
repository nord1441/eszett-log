/**
 * PostView アクションボタン テスト
 *
 * 記事詳細画面の edit/delete ボタンの表示・要素構造を検証する。
 * - 未ログイン時にはボタンが表示されない
 * - ログイン時には両ボタンが表示される
 * - 両方とも <button> 要素であること（サイズ統一の保証）
 * - 同一コンテナ内の兄弟要素であること
 */
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
  // 未ログイン (user=null) の場合、edit/deleteボタンが描画されないことを確認
  it('does not show edit/delete buttons for anonymous users', async () => {
    renderPostView(null)
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    expect(screen.queryByText('edit')).not.toBeInTheDocument()
    expect(screen.queryByText('delete')).not.toBeInTheDocument()
  })

  // ログイン済み (user='admin') の場合、edit/deleteボタンが両方表示されることを確認
  it('shows edit and delete buttons for logged-in users', async () => {
    renderPostView('admin')
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    expect(screen.getByText('edit')).toBeInTheDocument()
    expect(screen.getByText('delete')).toBeInTheDocument()
  })

  // editもdeleteも <button> 要素であることを確認（以前はeditが<a>内の<button>でサイズが不統一だった）
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

  // 両ボタンが post-view__actions コンテナ内の兄弟要素であることを確認（レイアウトの一貫性）
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
