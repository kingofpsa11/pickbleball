import { currentAdmin } from '../../lib/auth.ts'
import { json, type Env } from '../../lib/d1.ts'

export async function onRequestGet(context: { request: Request; env: Env }) {
  const admin = await currentAdmin(context.env.DB, context.request)
  return json({ signedIn: Boolean(admin), username: admin?.username ?? '' })
}
