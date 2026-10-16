import { json, type Env } from '../lib/d1.ts'
import { readRevision, readState } from '../lib/db.ts'

export async function onRequestGet(context: { request: Request; env: Env }) {
  const requested = Number(new URL(context.request.url).searchParams.get('v'))
  const revision = await readRevision(context.env.DB)
  const data = await readState(context.env.DB)
  const cache = requested === revision ? 'public, max-age=300' : 'no-store'
  return json({ revision, data }, 200, cache)
}
