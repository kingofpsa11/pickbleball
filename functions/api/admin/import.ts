import { currentAdmin } from '../../lib/auth.ts'
import { readRevision, readState } from '../../lib/db.ts'
import { json, readJson, type Env } from '../../lib/d1.ts'
import { mergeStores } from '../../lib/merge.ts'
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
  const current = await readState(context.env.DB)
  const merged = mergeStores(current, normalized)
  if (!merged.changed) {
    const revision = await readRevision(context.env.DB)
    return json({ changed: false, revision, data: current })
  }
  const expected = await readRevision(context.env.DB)
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
