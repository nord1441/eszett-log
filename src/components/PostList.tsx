import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchPosts, PostMeta } from '../lib/api'

export function PostList() {
  const [posts, setPosts] = useState<PostMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
      .then(setPosts)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">...</div>
  if (posts.length === 0) return <div className="empty">no posts yet.</div>

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.slug} className="post-item">
          <div className="post-item__date">{post.date}</div>
          <div className="post-item__title">
            <Link to={`/post/${post.slug}`}>{post.title}</Link>
          </div>
          {post.excerpt && (
            <div className="post-item__excerpt">{post.excerpt}</div>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="post-item__tags">
              {post.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
