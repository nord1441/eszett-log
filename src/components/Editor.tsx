import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom'
import { fetchPost, createPost, updatePost, uploadImage } from '../lib/api'

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
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setContent((prev) => prev + text)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = content.slice(0, start)
    const after = content.slice(end)
    const newContent = before + text + after
    setContent(newContent)
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length
      textarea.focus()
    })
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const result = await uploadImage(file)
        insertAtCursor(`![${file.name}](${result.url})\n`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'image upload failed')
    } finally {
      setUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (images.length > 0) {
      const dt = new DataTransfer()
      images.forEach((f) => dt.items.add(f))
      handleImageUpload(dt.files)
    }
  }

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
          <div className="editor__content-header">
            <label>content (markdown)</label>
            <button
              type="button"
              className="btn btn--small"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'uploading...' : 'image'}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder="Write your post in markdown... (drag & drop images here)"
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
