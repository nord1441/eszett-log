import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom'
import { fetchPost, createPost, updatePost } from '../lib/api'

interface EditorProps {
  user: string | null
}

export function Editor({ user }: EditorProps) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isEdit = !!slug

  const [title, setTitle] = useState('')
  const [postSlug, setPostSlug] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [tags, setTags] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!slug) return
    fetchPost(slug)
      .then((post) => {
        setTitle(post.title)
        setPostSlug(post.slug)
        setDate(post.date)
        setTags(post.tags?.join(', ') || '')
        setContent(post.content)
      })
      .catch(() => setError('post not found'))
      .finally(() => setLoading(false))
  }, [slug])

  if (!user) return <Navigate to="/login" replace />
  if (loading) return <div className="loading">...</div>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      if (isEdit) {
        await updatePost(slug!, { title, date, tags: tagList, content })
        navigate(`/post/${slug}`)
      } else {
        if (!postSlug) {
          setError('slug is required')
          return
        }
        await createPost({
          slug: postSlug,
          title,
          date,
          tags: tagList,
          content,
        })
        navigate(`/post/${postSlug}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to save')
    }
  }

  return (
    <div className="editor">
      <Link to={isEdit ? `/post/${slug}` : '/'} className="post-view__back">
        ← back
      </Link>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '24px 0' }}>
        {isEdit ? 'edit post' : 'new post'}
      </h2>
      {error && <div className="login__error">{error}</div>}
      <form onSubmit={handleSubmit}>
        {!isEdit && (
          <div className="editor__field">
            <label>slug</label>
            <input
              type="text"
              value={postSlug}
              onChange={(e) => setPostSlug(e.target.value)}
              placeholder="my-post-slug"
            />
          </div>
        )}
        <div className="editor__field">
          <label>title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
          />
        </div>
        <div className="editor__field">
          <label>date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="editor__field">
          <label>tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="dev, blog, thoughts"
          />
        </div>
        <div className="editor__field">
          <label>content (markdown)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post in markdown..."
          />
        </div>
        <div className="editor__actions">
          <button type="submit" className="btn btn--primary">
            {isEdit ? 'update' : 'publish'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigate(isEdit ? `/post/${slug}` : '/')}
          >
            cancel
          </button>
        </div>
      </form>
    </div>
  )
}
