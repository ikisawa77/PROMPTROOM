import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { db } from './db'
import { ApiError } from './validate'

export interface AuthUser {
  id: string
  email: string
  name: string
  createdAt: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export const SESSION_COOKIE = 'pr_session'
export const SESSION_DAYS = 30
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60 * 1000

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`)

interface UserRow {
  id: string
  email: string
  name: string
  password_hash: string
  created_at: string
}

interface SessionRow {
  token_hash: string
  user_id: string
  created_at: string
  expires_at: string
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `s1$${salt.toString('base64')}$${derived.toString('base64')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [version, saltBase64, hashBase64] = stored.split('$')
  if (version !== 's1' || !saltBase64 || !hashBase64) return false
  try {
    const salt = Buffer.from(saltBase64, 'base64')
    const expected = Buffer.from(hashBase64, 'base64')
    const derived = scryptSync(password, salt, expected.length, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    })
    return expected.length === derived.length && timingSafeEqual(expected, derived)
  } catch {
    return false
  }
}

function mapUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at }
}

export function findUserByEmail(email: string): UserRow | null {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
  return row ?? null
}

export function createUser(data: { email: string; name: string; password: string }): AuthUser {
  const existing = findUserByEmail(data.email)
  if (existing) throw new ApiError(409, 'อีเมลนี้ถูกใช้งานแล้ว — ลองเข้าสู่ระบบแทน')
  const id = randomBytes(12).toString('hex')
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, data.email, data.name, hashPassword(data.password), createdAt)
  return { id, email: data.email, name: data.name, createdAt }
}

export function authenticate(email: string, password: string): AuthUser | null {
  const row = findUserByEmail(email)
  if (!row) return null
  if (!verifyPassword(password, row.password_hash)) return null
  return mapUser(row)
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_MAX_AGE)
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(hashToken(token), userId, now.toISOString(), expires.toISOString())
  return token
}

export function userFromToken(token: string): AuthUser | null {
  const row = db
    .prepare('SELECT * FROM sessions WHERE token_hash = ?')
    .get(hashToken(token)) as SessionRow | undefined
  if (!row) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(row.token_hash)
    return null
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as UserRow | undefined
  return user ? mapUser(user) : null
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.COOKIE_SECURE === '1'
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
      SESSION_MAX_AGE / 1000
    }${secure ? '; Secure' : ''}`,
  )
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.COOKIE_SECURE === '1'
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
  )
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readCookie(req, SESSION_COOKIE)
  const user = token ? userFromToken(token) : null
  if (!user) {
    clearSessionCookie(res)
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' })
    return
  }
  req.user = user
  next()
}

/** workspace ที่ผูกกับบัญชีผู้ใช้ — กันไม่ให้ผู้ใช้หนึ่งอ่านข้อมูลของอีกคน */
export function scopedWorkspace(userId: string, name: string): string {
  return `${userId}:${name}`
}
