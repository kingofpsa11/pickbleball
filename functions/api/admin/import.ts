import { currentAdmin } from '../../lib/auth.ts'
import { readRevision, readState } from '../../lib/db.ts'
import { json, readJson, type Env } from '../../lib/d1.ts'
import { mergeStores, omitTournaments } from '../../lib/merge.ts'
import { saveStore } from '../../lib/save.ts'
import { validateStore } from '../../lib/validate.ts'
import { normalizeData } from '../../../src/lib/results.ts'
import type { StoreData } from '../../../src/types.ts'

export async function onRequestPost(context: { request: Request; env: Env }) {
  const admin = await currentAdmin(context.env.DB, context.request)
  if (!admin) return json({ error: 'Cần đăng nhập ban tổ chức.' }, 401)
  const body = await readJson(context.request)
  if ('error' in body) return json({ error: body.error }, 400)
  const record = body.value
  const incoming = record && typeof record === 'object' && 'data' in record ? (record.data as StoreData) : null
  if (!incoming) return json({ error: 'Thiếu dữ liệu trên máy.' }, 400)
  let normalized: StoreData
  try {
    normalized = normalizeData(incoming)
  } catch {
    return json({ error: 'Dữ liệu trên máy không đọc được.' }, 400)
  }
  const error = validateStore(normalized)
  if (error) return json({ error }, 400)
  const expected = await readRevision(context.env.DB)
  const [current, removed] = await Promise.all([
    readState(context.env.DB),
    deletedTournamentIds(context.env.DB),
  ])
  const merged = mergeStores(current, omitTournaments(normalized, removed))
  if (!merged.changed) {
    return json({ changed: false, revision: expected, data: current })
  }
  const saved = await saveStore(
    context.env.DB,
    expected,
    merged.data,
    admin.username,
    'importLocal',
    '',
    'Đưa dữ liệu trên máy lên máy chủ',
  )
  if (!saved.ok) return json(saved.status === 409 ? { ...saved, changed: false } : { error: saved.error }, saved.status)
  return json({ changed: true, revision: saved.revision, data: saved.data })
}

async function deletedTournamentIds(db: Env['DB']) {
  const result = await db
    .prepare(`SELECT DISTINCT entity_id FROM audit_log WHERE action = 'deleteTournament' AND entity_id != ''`)
    .all<{ entity_id: string }>()
  return new Set((result.results ?? []).map((row) => row.entity_id))
}
