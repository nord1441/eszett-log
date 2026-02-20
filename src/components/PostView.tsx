import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import { fetchPost, deletePost, Post } from '../lib/api'

interface PostViewProps {
  user: string | null
}

export function PostView({ user }: PostViewProps) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    fetchPost(slug)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false))
  }, [slug])

  const handleDelete = async () => {
    if (!slug || !confirm('delete this post?')) return
    try {
      await deletePost(slug)
      navigate('/')
    } catch {
      alert('failed to delete')
    }
  }

  if (loading) return <div className="loading">...</div>
  if (!post) return <div className="empty">post not found.</div>

  const html = marked.parse(post.content) as string

  return (
    <article>
      <Link to="/" className="post-view__back">
        ← back
      </Link>
      <div className="post-view__header">
        <h1 className="post-view__title">{post.title}</h1>
        <div className="post-view__meta">
          <span>{post.date}</span>
          {post.tags && post.tags.length > 0 && (
            <div className="post-item__tags">
              {post.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {user && (
          <div className="post-view__actions">
            <button onClick={() => navigate(`/edit/${post.slug}`)}>
              edit
            </button>
            <button onClick={handleDelete}>
              delete
            </button>
          </div>
        )}
      </div>
      <div
        className="post-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  )
}
