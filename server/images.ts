import { Router, Request, Response, RequestHandler } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir()
    cb(null, UPLOADS_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const hash = crypto.randomBytes(8).toString('hex')
    cb(null, `${hash}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('only image files are allowed'))
    }
  },
})

export function imagesRouter(auth: RequestHandler): Router {
  const router = Router()

  // POST /api/images - upload image (auth required)
  router.post('/', auth, upload.single('image'), (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'no image file provided' })
      return
    }
    const url = `/api/images/${req.file.filename}`
    res.status(201).json({ url, filename: req.file.filename })
  })

  // GET /api/images/:filename - serve image (public)
  router.get('/:filename', (req: Request, res: Response) => {
    const filename = path.basename(req.params.filename as string)
    const filepath = path.join(UPLOADS_DIR, filename)

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'image not found' })
      return
    }

    res.sendFile(filepath)
  })

  return router
}
