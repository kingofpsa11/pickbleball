import { login } from '../../lib/auth.ts'
import { json, readJson, type Env } from '../../lib/d1.ts'

export async function onRequestPost(context: { request: Request; env: Env }) {
  const body = await readJson(context.request)
  if ('error' in body) return json({ error: body.error }, 400)
  const record = body.value
  const username = record && typeof record === 'object' && 'username' in record ? String(record.username ?? '') : ''
  const password = record && typeof record === 'object' && 'password' in record ? String(record.password ?? '') : ''
  if (!username.trim() || !password || username.length > 40 || password.length > 80) {
    return json({ error: 'Sai tài khoản hoặc mật khẩu.' }, 401)
  }
  const session = await login(context.env.DB, context.request, username, password)
  if (!session) return json({ error: 'Sai tài khoản hoặc mật khẩu.' }, 401)
  return new Response(JSON.stringify({ signedIn: true, username: session.username }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'set-cookie': session.cookie,
    },
  })
}
