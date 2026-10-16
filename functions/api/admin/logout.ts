import { logout } from '../../lib/auth.ts'
import type { Env } from '../../lib/d1.ts'

export async function onRequestPost(context: { request: Request; env: Env }) {
  const clearing = await logout(context.env.DB, context.request)
  return new Response(JSON.stringify({ signedIn: false }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'set-cookie': clearing,
    },
  })
}
