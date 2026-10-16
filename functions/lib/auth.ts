import type { D1Database } from './d1.ts'

const COOKIE = 'pb_session'
const SESSION_MS = 12 * 60 * 60 * 1000

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(digest))
}

async function pbkdf2(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return bytesToHex(new Uint8Array(bits))
}

function sameText(left: string, right: string) {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return diff === 0
}

export function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return ''
}

function cookie(token: string, request: Request, maxAge: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

export async function login(db: D1Database, request: Request, username: string, password: string) {
  const name = username.trim()
  const row = await db
    .prepare(
      `SELECT id, password_salt, password_hash, iterations FROM admins WHERE username = ?`,
    )
    .bind(name)
    .all<{ id: string; password_salt: string; password_hash: string; iterations: number }>()
  const admin = row.results?.[0]
  const salt = admin?.password_salt ?? 'c642cfbfac884394cacc5b0b72077f2d'
  const iterations = admin?.iterations ?? 10000
  const actual = await pbkdf2(password, salt, iterations)
  const expected = admin?.password_hash ?? '0'.repeat(64)
  if (!admin || !sameText(actual, expected)) return null
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
  const tokenHash = await sha256(token)
  const now = Date.now()
  await db
    .prepare(`INSERT INTO sessions (token_hash, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
    .bind(tokenHash, admin.id, new Date(now + SESSION_MS).toISOString(), new Date(now).toISOString())
    .run()
  return { adminId: admin.id, username: name, cookie: cookie(token, request, SESSION_MS / 1000) }
}

export async function currentAdmin(db: D1Database, request: Request) {
  const token = readCookie(request, COOKIE)
  if (!token) return null
  const tokenHash = await sha256(token)
  const row = await db
    .prepare(
      `SELECT sessions.admin_id, sessions.expires_at, admins.username
       FROM sessions
       JOIN admins ON admins.id = sessions.admin_id
       WHERE sessions.token_hash = ?`,
    )
    .bind(tokenHash)
    .all<{ admin_id: string; expires_at: string; username: string }>()
  const session = row.results?.[0]
  if (!session) return null
  if (Date.parse(session.expires_at) < Date.now()) {
    await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run()
    return null
  }
  return { id: session.admin_id, username: session.username, tokenHash }
}

export async function logout(db: D1Database, request: Request) {
  const token = readCookie(request, COOKIE)
  if (token) {
    const tokenHash = await sha256(token)
    await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run()
  }
  return cookie('', request, 0)
}
