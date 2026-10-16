import { json, type Env } from '../lib/d1.ts'
import { readRevision } from '../lib/db.ts'

export async function onRequestGet(context: { env: Env }) {
  const revision = await readRevision(context.env.DB)
  return json({ revision })
}
