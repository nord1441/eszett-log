import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json')
const JWT_SECRET = process.env.JWT_SECRET || 'eszett-log-secret-change-in-production'

export interface AuthRequest extends Request {
  user?: { username: string }
}

interface User {
  username: string
  passwordHash: string
}

function ensureDataDir() {
  const dir = path.dirname(USERS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getUsers(): User[] {
  ensureDataDir()
  if (!fs.existsSync(USERS_FILE)) {
    // Create default admin user (password: admin)
    const hash = bcrypt.hashSync('admin', 10)
    const users = [{ username: 'admin', passwordHash: hash }]
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
    return users
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
}

export const authRouter = Router()

authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' })
    return
  }

  const users = getUsers()
  const user = users.find((u) => u.username === username)
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: 'invalid credentials' })
    return
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET, {
    expiresIn: '24h',
  })
  res.json({ token, username: user.username })
})

authRouter.get('/me', (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(401).json({ error: 'no token' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string }
    res.json({ username: decoded.username })
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
})

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(401).json({ error: 'authentication required' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string }
    req.user = { username: decoded.username }
    next()
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
}
