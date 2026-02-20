import { Router, Request, Response, RequestHandler } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const POSTS_DIR = path.join(__dirname, '..', 'posts')

function ensurePostsDir() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true })
  }
}

interface PostMeta {
  slug: string
  title: string
  date: string
  tags?: string[]
  excerpt?: string
}

interface Post extends PostMeta {
  content: string
}

function parsePost(filename: string): Post | null {
  const filepath = path.join(POSTS_DIR, filename)
  try {
    const raw = fs.readFileSync(filepath, 'utf-8')
    const { data, content } = matter(raw)
    const slug = filename.replace(/\.md$/, '')
    return {
      slug,
      title: (data.title as string) || slug,
      date: (data.date as string) || '',
      tags: (data.tags as string[]) || [],
      excerpt: (data.excerpt as string) || content.slice(0, 160).replace(/\n/g, ' '),
      content,
    }
  } catch {
    return null
  }
}

export function postsRouter(auth: RequestHandler): Router {
  const router = Router()

  // GET /api/posts - list all posts (public)
  router.get('/', (_req: Request, res: Response) => {
    ensurePostsDir()
    const files = fs
      .readdirSync(POSTS_DIR)
      .filter((f) => f.endsWith('.md'))

    const posts: PostMeta[] = files
      .map((f) => {
        const post = parsePost(f)
        if (!post) return null
        const { content: _, ...meta } = post
        return meta
      })
      .filter((p): p is PostMeta => p !== null)
      .sort((a, b) => (b.date > a.date ? 1 : -1))

    res.json(posts)
  })

  // GET /api/posts/:slug - get single post (public)
  router.get('/:slug', (req: Request, res: Response) => {
    ensurePostsDir()
    const filename = `${req.params.slug}.md`
    const filepath = path.join(POSTS_DIR, filename)

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'post not found' })
      return
    }

    const post = parsePost(filename)
    if (!post) {
      res.status(500).json({ error: 'failed to parse post' })
      return
    }

    res.json(post)
  })

  // POST /api/posts - create post (auth required)
  router.post('/', auth, (req: Request, res: Response) => {
    ensurePostsDir()
    const { slug, title, date, tags, content } = req.body
    if (!slug || !title || !content) {
      res.status(400).json({ error: 'slug, title, and content are required' })
      return
    }

    const filepath = path.join(POSTS_DIR, `${slug}.md`)
    if (fs.existsSync(filepath)) {
      res.status(409).json({ error: 'post already exists' })
      return
    }

    const frontmatter = matter.stringify(content, {
      title,
      date: date || new Date().toISOString().split('T')[0],
      tags: tags || [],
    })

    fs.writeFileSync(filepath, frontmatter)
    res.status(201).json({ slug })
  })

  // PUT /api/posts/:slug - update post (auth required)
  router.put('/:slug', auth, (req: Request, res: Response) => {
    ensurePostsDir()
    const filename = `${req.params.slug}.md`
    const filepath = path.join(POSTS_DIR, filename)

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'post not found' })
      return
    }

    const { title, date, tags, content } = req.body
    if (!title || !content) {
      res.status(400).json({ error: 'title and content are required' })
      return
    }

    const frontmatter = matter.stringify(content, {
      title,
      date: date || new Date().toISOString().split('T')[0],
      tags: tags || [],
    })

    fs.writeFileSync(filepath, frontmatter)
    res.json({ slug: req.params.slug })
  })

  // DELETE /api/posts/:slug - delete post (auth required)
  router.delete('/:slug', auth, (req: Request, res: Response) => {
    ensurePostsDir()
    const filename = `${req.params.slug}.md`
    const filepath = path.join(POSTS_DIR, filename)

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'post not found' })
      return
    }

    fs.unlinkSync(filepath)
    res.json({ deleted: req.params.slug })
  })

  return router
}
