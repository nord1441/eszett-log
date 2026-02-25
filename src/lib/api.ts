const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface PostMeta {
  slug: string
  title: string
  date: string
  tags?: string[]
  excerpt?: string
}

export interface Post extends PostMeta {
  content: string
}

export async function fetchPosts(): Promise<PostMeta[]> {
  const res = await fetch(`${BASE}/posts`)
  if (!res.ok) throw new Error('failed to fetch posts')
  return res.json()
}

export async function fetchPost(slug: string): Promise<Post> {
  const res = await fetch(`${BASE}/posts/${slug}`)
  if (!res.ok) throw new Error('post not found')
  return res.json()
}

export async function createPost(post: {
  slug: string
  title: string
  date?: string
  tags?: string[]
  content: string
}): Promise<{ slug: string }> {
  const res = await fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(post),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'failed to create post')
  }
  return res.json()
}

export async function updatePost(
  slug: string,
  post: { title: string; date?: string; tags?: string[]; content: string }
): Promise<{ slug: string }> {
  const res = await fetch(`${BASE}/posts/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(post),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'failed to update post')
  }
  return res.json()
}

export async function uploadPost(
  filename: string,
  raw: string
): Promise<{ slug: string }> {
  const res = await fetch(`${BASE}/posts/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ filename, raw }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'failed to upload post')
  }
  return res.json()
}

export async function uploadImage(
  file: File
): Promise<{ url: string; filename: string }> {
  const formData = new FormData()
  formData.append('image', file)

  const token = getToken()
  const res = await fetch(`${BASE}/images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'failed to upload image')
  }
  return res.json()
}

export async function deletePost(slug: string): Promise<void> {
  const res = await fetch(`${BASE}/posts/${slug}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error('failed to delete post')
}

export async function login(
  username: string,
  password: string
): Promise<{ token: string; username: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'login failed')
  }
  return res.json()
}

export type FontFamily = 'doto' | 'bebas-neue'

export interface SiteSettings {
  siteTitle: string
  defaultTheme: 'light' | 'dark'
  defaultFontSize: 'small' | 'medium' | 'large'
  defaultFontFamily: FontFamily
}

export async function fetchSettings(): Promise<SiteSettings> {
  const res = await fetch(`${BASE}/settings`)
  if (!res.ok) throw new Error('failed to fetch settings')
  return res.json()
}

export async function updateSettings(
  settings: Partial<SiteSettings>
): Promise<SiteSettings> {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(settings),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'failed to update settings')
  }
  return res.json()
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${BASE}/settings/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'failed to change password')
  }
}

export async function checkAuth(): Promise<{ username: string } | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
